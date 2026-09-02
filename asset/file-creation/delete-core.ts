/**
 * 공통 삭제 코어 (GCS) — Adaptive Concurrency 포함
 * - 가변 동시성(AdjustableLimiter) + 관찰형 레이어(p95/에러율 기반 조정)
 * - 지수 백오프 + 지터(retry)
 * - 업로드 매니페스트(JSONL) → 삭제 타깃 생성
 * - 별도 삭제 매니페스트(JSONL) 증분 append + 최종 rewrite
 * - DB 매핑(FileUpload) 원본명(originalName) ↔ 업로드명(uploadedName) 1:1 매칭 삭제
 *   - cfg.dbDeleteMode: 'hard' | 'soft' | 'none' (기본 'hard')
 *   - hard: FileUpload 문서 삭제 (deleteOne)
 *   - soft: deletedAt, gcsDeleted=true 표시
 *   - none: DB 터치 안 함
 * - dryRun 지원 (GCS 삭제/DB 변경 모두 미수행)
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { Storage } from '@google-cloud/storage';
import { connectDatabase } from '../database.connection';
import { Logger } from '@nestjs/common';
import { FileSchema } from '../../src/schema/domain/file.schema';
import dotenv from 'dotenv';

dotenv.config();

const logger = new Logger('DeleteCore');
const File = mongoose.model('File', FileSchema);

// ====== 환경 ======
const BUCKET_NAME = process.env.BUCKET_NAME;
const BUCKET_PATH = process.env.BUCKET_PATH; // 예: "agent-image" 같은 경로 prefix

if (!BUCKET_NAME || !BUCKET_PATH) {
  console.error('ERROR: BUCKET_NAME, BUCKET_PATH 환경변수가 필요합니다.');
  process.exit(1);
}

// ====== Adaptive settings for DELETE ======
const START_CONCURRENCY = 8;
const MAX_CONCURRENCY = 32;
const MIN_CONCURRENCY = 4;

const ADAPT_PERIOD_MS = 5000;
const TARGET_ERR_RATE = 0.005; // 0.5%
const TARGET_P95_MS = 800;    // 삭제는 업로드보다 타이트
const STEP_UP = 4;
const STEP_DOWN = 6;
const METRIC_WINDOW = 400;

// ====== GCS 클라이언트 ======
const keyFilename = process.env.FILE_SERVER_API_KEY;
if (!keyFilename) {
  console.error('ERROR: GCS_ACCESS_KEY_FILE 환경변수가 필요합니다.');
  process.exit(1);
}
const storage = new Storage({ keyFilename });
if (!storage) {
  console.error('ERROR: GCS 클라이언트 생성 실패');
  process.exit(1);
}
const bucket = storage.bucket(BUCKET_NAME);
if (!bucket) {
  console.error('ERROR: GCS 버킷 생성 실패');
  process.exit(1);
}
// ====== 타입 ======
type DStatus = 'PENDING' | 'DELETING' | 'DELETED' | 'NOT_FOUND' | 'FAILED' | 'SKIPPED';

type DbDeleteMode = 'hard' | 'soft' | 'none';

type Outcome = 'ok' | 'skipped' | 'failed' | 'transient';

export interface UploadManifestRow {
  id: string;               // 보기 좋은 상대 경로 (upload-core와 동일)
  localPath?: string;       // 로컬 경로(없어도 됨)
  originalName: string;
  uploadedName?: string;
  gcsKey?: string;          // 보통 `${BUCKET_PATH}/${uploadedName}`
  contentType?: string;
  isJson?: boolean;
  status?: string;          // 업로드 상태 (DONE/FAILED/...) — 삭제는 이 값을 참조만 함
  lastError?: string | null;
}

export interface DeleteRow {
  id: string;               // 업로드 manifest의 id 그대로 유지
  targetKey: string;        // GCS 객체 키 (예: `${BUCKET_PATH}/abc.png`)
  uploadedName?: string;
  originalName?: string;
  status: DStatus;
  lastError?: string | null;
}

export interface DeleteConfig {
  label: 'image' | 'json';
  uploadManifestPath: string;   // 업로드 시 생성한 JSONL 경로 (읽기 전용)
  deleteManifestPath: string;   // 삭제용 JSONL 경로 (append/rewrite)
  includeStatuses?: Array<string>; // 업로드 상태 필터: 기본 ['DONE','SKIPPED']
  dryRun?: boolean;             // true면 실제 삭제하지 않고 로그만
  dbDeleteMode?: DbDeleteMode;  // 'hard' | 'soft' | 'none' (기본 'hard')
}

// ====== 유틸 ======
function isTransientError(e: any): boolean {
  const code = e?.code ?? e?.statusCode ?? e?.response?.status;
  const msg = `${e?.message || e}`;
  if (!code && /EAI_AGAIN|ECONNRESET|ENETUNREACH|ETIMEDOUT|socket hang up/i.test(msg)) return true;
  if (typeof code === 'number' && (code >= 500 || code === 429)) return true;
  if (/Deadline Exceeded|internalError|backendError|rateLimit/i.test(msg)) return true;
  return false;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0; return h; }

// ====== 매니페스트 IO (업로드) ======
function loadUploadManifest(manifestPath: string): UploadManifestRow[] {
  if (!fs.existsSync(manifestPath)) return [];
  const lines = fs.readFileSync(manifestPath, 'utf8').split('\n').filter(Boolean);
  const rows: UploadManifestRow[] = [];
  for (const line of lines) {
    try { rows.push(JSON.parse(line) as UploadManifestRow); } catch {/* ignore */ }
  }
  return rows;
}

// ====== 매니페스트 IO (삭제) ======
function loadDeleteManifest(manifestPath: string): Map<string, DeleteRow> {
  const map = new Map<string, DeleteRow>();
  if (!fs.existsSync(manifestPath)) return map;
  const lines = fs.readFileSync(manifestPath, 'utf8').split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      const row = JSON.parse(line) as DeleteRow;
      map.set(row.id, row);
    } catch {/* ignore */ }
  }
  return map;
}

function appendDeleteManifest(manifestPath: string, row: DeleteRow) {
  fs.appendFileSync(manifestPath, JSON.stringify(row) + '\n');
}

function rewriteDeleteManifest(manifestPath: string, all: Iterable<DeleteRow>) {
  const tmp = manifestPath + '.tmp';
  const fd = fs.openSync(tmp, 'w');
  try {
    for (const row of all) fs.writeSync(fd, JSON.stringify(row) + '\n');
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, manifestPath);
}

// ====== DB 연결 ======
async function requireDbOrExit() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('ERROR: MONGODB_URI 환경변수가 필요합니다.');
      process.exit(1);
    }
    await connectDatabase();
    if (mongoose.connection.readyState !== 1) {
      console.error('ERROR: MongoDB not connected (readyState=' + mongoose.connection.readyState + ')');
      process.exit(1);
    }
    console.log('MongoDB connected');
  } catch (err) {
    console.error('ERROR: Failed to connect MongoDB:', err);
    process.exit(1);
  }
}

// ====== 타깃 빌드 ======
function ensureUploadedName(r: UploadManifestRow): string {
  if (r.uploadedName && r.uploadedName.trim()) return r.uploadedName;
  const fromKey = r.gcsKey ? path.posix.basename(r.gcsKey) : '';
  if (fromKey) return fromKey;
  throw new Error(`[buildDeleteTargets] uploadedName missing (id=${r.id}, status=${r.status})`);
}

function buildDeleteTargets(
  uploadRows: UploadManifestRow[],
  existingDeleteMap: Map<string, DeleteRow>,
  includeStatuses: Array<string>
): Map<string, DeleteRow> {
  const out = new Map<string, DeleteRow>(existingDeleteMap);
  for (const r of uploadRows) {
    const okStatus = !r.status || includeStatuses.includes(String(r.status));
    if (!okStatus) continue;

    const uploadedName = ensureUploadedName(r);
    const targetKey = r.gcsKey ?? `${BUCKET_PATH}/${uploadedName}`;

    out.set(r.id, {
      id: r.id,
      targetKey,
      uploadedName,                // string으로 확정
      originalName: r.originalName,
      status: 'PENDING',
      lastError: null,
    });
  }
  return out;
}

// ====== 삭제 1건 ======
async function deleteOne(row: DeleteRow, dryRun?: boolean): Promise<'DELETED' | 'NOT_FOUND' | 'SKIPPED'> {
  if (dryRun) return 'SKIPPED';
  const file = bucket.file(row.targetKey);
  try {
    await file.delete({ ignoreNotFound: false });
    return 'DELETED';
  } catch (e: any) {
    const code = e?.code ?? e?.statusCode ?? e?.response?.status;
    if (code === 404) return 'NOT_FOUND';
    throw e;
  }
}

async function withRetry<T extends 'DELETED' | 'NOT_FOUND' | 'SKIPPED'>(
  row: DeleteRow,
  fn: () => Promise<T>
): Promise<T> {
  const base = 1000;
  let delay = base + (Math.abs(hash(row.id)) % 300);
  const max = 6;

  for (let i = 0; i < max; i++) {
    try {
      return await fn();
    } catch (e: any) {
      const msg = String(e?.message || e);
      const code = e?.code ?? e?.statusCode ?? e?.response?.status;
      const permanent4xx = (typeof code === 'number' && code >= 400 && code < 500 && code !== 429 && code !== 408);
      if (permanent4xx) throw e; // 권한/경로 오류 등은 재시도해도 소용없음

      if (isTransientError(e) && i < max - 1) {
        logger?.warn?.(`[delete-retry] ${row.id} attempt=${i + 1}/${max} delay=${delay}ms :: ${msg}`);
        await sleep(delay);
        delay *= 2;
        continue;
      }
      throw e;
    }
  }
  throw new Error('retry-exhausted');
}

// ====== DB 매핑 삭제(soft/hard) ======
function buildDbFilter(originalName?: string, uploadedName?: string) {
  if (originalName && uploadedName) return { originalName, uploadedName } as const;
  if (uploadedName) return { uploadedName } as const;
  if (originalName) return { originalName } as const;
  return null;
}

async function softDeleteDbMapping(originalName?: string, uploadedName?: string) {
  const filter = buildDbFilter(originalName, uploadedName);
  if (!filter) return;
  try {
    const res = await File.updateOne(filter, { $set: { deletedAt: new Date(), gcsDeleted: true } });
    if (!res.matchedCount) return; // 없으면 무시
  } catch (e: any) {
    logger?.error?.(`DB soft-delete failed for ${JSON.stringify(filter)}: ${e?.message || e}`);
  }
}

async function hardDeleteDbMapping(originalName?: string, uploadedName?: string) {
  const filter = buildDbFilter(originalName, uploadedName);
  if (!filter) return;
  try {
    const res = await File.deleteOne(filter);
    if (!res.deletedCount) return; // 없으면 무시
  } catch (e: any) {
    logger?.error?.(`DB hard-delete failed for ${JSON.stringify(filter)}: ${e?.message || e}`);
  }
}

// ====== 관찰형 레이어: 가변 동시성 리미터 + 메트릭 ======
class AdjustableLimiter {
  private max: number; private active = 0; private queue: Array<() => void> = [];
  constructor(initial: number) { this.max = Math.max(1, initial); }
  get concurrency() { return this.max; }
  set concurrency(n: number) { this.max = Math.max(1, n | 0); this.pump(); }
  private pump() {
    while (this.active < this.max && this.queue.length > 0) {
      const next = this.queue.shift()!;
      this.active++;
      next();
    }
  }
  run<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const start = () => {
        fn().then(
          (v) => { this.active--; this.pump(); resolve(v); },
          (e) => { this.active--; this.pump(); reject(e); }
        );
      };
      this.queue.push(start);
      this.pump();
    });
  }
}

class Metrics {
  private durations: number[] = [];
  private results: Outcome[] = [];
  observe(ms: number, outcome: Outcome) {
    this.durations.push(ms);
    this.results.push(outcome);
    if (this.durations.length > METRIC_WINDOW) this.durations.shift();
    if (this.results.length > METRIC_WINDOW) this.results.shift();
  }
  get size() { return this.results.length; }
  p95(): number {
    if (this.durations.length === 0) return 0;
    const arr = [...this.durations].sort((a, b) => a - b);
    const idx = Math.min(arr.length - 1, Math.floor(arr.length * 0.95));
    return arr[idx];
  }
  errorRate(): number {
    if (this.results.length === 0) return 0;
    const bad = this.results.filter(r => r === 'failed' || r === 'transient').length;
    return bad / this.results.length;
  }
}

function classifyDeleteResult(e: any | null, final: DStatus): Outcome {
  if (!e) {
    if (final === 'DELETED') return 'ok';
    if (final === 'NOT_FOUND' || final === 'SKIPPED') return 'skipped';
    return 'failed';
  }
  return isTransientError(e) ? 'transient' : 'failed';
}

// ====== 실행 엔진 ======
export async function runDelete(cfg: DeleteConfig) {
  await requireDbOrExit();

  const includeStatuses = cfg.includeStatuses ?? ['DONE', 'SKIPPED'];
  const dbDeleteMode: DbDeleteMode = cfg.dbDeleteMode ?? 'hard';

  console.log(`=== GCS Delete: ${cfg.label} ===`);
  console.log(`Bucket=${BUCKET_NAME}, Concurrency(start=${START_CONCURRENCY}, max=${MAX_CONCURRENCY}), BucketPath="${BUCKET_PATH}"`);
  console.log(`UploadManifest=${cfg.uploadManifestPath}`);
  console.log(`DeleteManifest=${cfg.deleteManifestPath}`);
  console.log(`Include upload statuses: ${includeStatuses.join(', ')}`);
  console.log(`dryRun=${cfg.dryRun ? 'true' : 'false'}, dbDeleteMode=${dbDeleteMode}`);

  // 1) 원본(업로드) 매니페스트 읽기
  const uploadRows = loadUploadManifest(cfg.uploadManifestPath);
  console.log(`Upload manifest rows: ${uploadRows.length}`);

  // 2) 삭제 매니페스트 로드 & 병합
  const deleteMap = loadDeleteManifest(cfg.deleteManifestPath);
  const targets = buildDeleteTargets(uploadRows, deleteMap, includeStatuses);

  // 신규만 반영하여 전체 rewrite (초기화)
  console.log(`Delete targets total: ${targets.size}`);
  rewriteDeleteManifest(cfg.deleteManifestPath, targets.values());

  // 3) PENDING/FAILED만 처리 — 가변 동시성 적용
  const limiter = new AdjustableLimiter(START_CONCURRENCY);
  const metrics = new Metrics();
  let deleted = 0, notFound = 0, failed = 0, skipped = 0;
  const tasks: Promise<void>[] = [];
  let adaptTimer: NodeJS.Timeout | null = null;

  function adapt() {
    const size = metrics.size;
    if (size < Math.min(100, METRIC_WINDOW / 2)) return; // 데이터 부족 시 skip
    const p95 = metrics.p95();
    const err = metrics.errorRate();

    let next = limiter.concurrency;
    if (err > TARGET_ERR_RATE || p95 > TARGET_P95_MS) {
      next = Math.max(MIN_CONCURRENCY, limiter.concurrency - STEP_DOWN);
    } else {
      next = Math.min(MAX_CONCURRENCY, limiter.concurrency + STEP_UP);
    }
    if (next !== limiter.concurrency) {
      console.log(`[ADAPT-DEL] p95=${Math.round(p95)}ms err=${(err * 100).toFixed(2)}% concurrency ${limiter.concurrency} -> ${next}`);
      limiter.concurrency = next;
    }
  }
  adaptTimer = setInterval(adapt, ADAPT_PERIOD_MS);

  for (const row of targets.values()) {
    if (row.status !== 'PENDING' && row.status !== 'FAILED') continue;
    tasks.push(limiter.run(async () => {
      const t0 = Date.now();
      row.status = 'DELETING';
      row.lastError = null;
      try {
        const res = await withRetry(row, () => deleteOne(row, cfg.dryRun));
        if (res === 'DELETED') { row.status = 'DELETED'; deleted++; }
        else if (res === 'NOT_FOUND') { row.status = 'NOT_FOUND'; notFound++; }
        else { row.status = 'SKIPPED'; skipped++; }
        metrics.observe(Date.now() - t0, classifyDeleteResult(null, row.status));

        // DB 처리: 실제 삭제시에만
        if (res === 'DELETED') {
          if (dbDeleteMode === 'hard') await hardDeleteDbMapping(row.originalName, row.uploadedName);
          else if (dbDeleteMode === 'soft') await softDeleteDbMapping(row.originalName, row.uploadedName);
        }
      } catch (e: any) {
        row.status = 'FAILED';
        row.lastError = String(e?.message || e);
        failed++;
        metrics.observe(Date.now() - t0, classifyDeleteResult(e, row.status));
      } finally {
        appendDeleteManifest(cfg.deleteManifestPath, row); // 증분 체크포인트
      }
    }));
  }

  await Promise.all(tasks);
  if (adaptTimer) clearInterval(adaptTimer);
  rewriteDeleteManifest(cfg.deleteManifestPath, targets.values());

  // 요약 출력
  const counts: Record<DStatus | 'DELETING', number> = { DELETED: 0, NOT_FOUND: 0, FAILED: 0, PENDING: 0, SKIPPED: 0, DELETING: 0 };
  for (const r of targets.values()) counts[r.status] = (counts[r.status] ?? 0) + 1;

  console.log('\n=== Delete Summary ===');
  console.table({
    total: targets.size,
    deleted: counts.DELETED,
    notFound: counts.NOT_FOUND,
    failed: counts.FAILED,
    pending: counts.PENDING,
    skipped: counts.SKIPPED
  });

  if (counts.FAILED > 0) {
    console.log('\nFailed examples (up to 20):');
    let shown = 0;
    for (const r of targets.values()) {
      if (r.status === 'FAILED') {
        console.log(` - ${r.id}: ${r.lastError}`);
        if (++shown >= 20) break;
      }
    }
    process.exitCode = 1;
  }

  try { await mongoose.disconnect(); } catch {/* ignore */ }
}