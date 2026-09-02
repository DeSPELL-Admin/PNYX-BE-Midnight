/**
 * 공통 업로더 코어
 * - Resumable Upload + CRC32C + ifGenerationMatch=0
 * - p-limit 동시성
 * - JSONL 매니페스트 체크포인트(증분 append + 최종 rewrite)
 * - DB 매핑(originalName ↔ uploadedName)
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { pipeline as _pipeline } from 'stream';
import { Storage } from '@google-cloud/storage';
import fg from 'fast-glob';
import { lookup } from 'mime-types';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { Logger } from '@nestjs/common';
import { FileSchema } from '../../src/schema/domain/file.schema';
import { connectDatabase } from '../database.connection';
import dotenv from 'dotenv';

dotenv.config();

const logger = new Logger('UploadCore');
const File = mongoose.model('File', FileSchema);

const pipeline = promisify(_pipeline);

// ====== 환경 ======
const BUCKET_NAME = process.env.BUCKET_NAME;
const BUCKET_PATH = process.env.BUCKET_PATH;

if (!BUCKET_NAME || !BUCKET_PATH) {
  console.error('ERROR: BUCKET_NAME(또는 GCS_BUCKET), BUCKET_PATH 환경변수가 필요합니다.');
  process.exit(1);
}

// ====== Adaptive settings ======
const START_CONCURRENCY = 8;   // 보수적으로 시작
const MIN_CONCURRENCY = 4;   // 하한
const MAX_CONCURRENCY = 32; // 상한

const ADAPT_PERIOD_MS = 5000; // 5초마다 적응
const TARGET_ERR_RATE = 0.005; // 0.5%
const TARGET_P95_MS = 1500; // 목표 p95(1.5s)
const STEP_UP = 4;     // 증가 폭
const STEP_DOWN = 6;     // 감소 폭
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
type Status = 'PENDING' | 'UPLOADING' | 'DONE' | 'FAILED' | 'SKIPPED';
type Outcome = 'ok' | 'skipped' | 'failed' | 'transient';

export interface ManifestRow {
  id: string;                // 보기 좋은 상대 경로
  localPath: string;         // 로컬 절대 경로
  originalName: string;
  uploadedName?: string;
  gcsKey?: string;
  contentType: string;
  isJson: boolean;
  status: Status;
  lastError?: string | null;
}

export interface RunConfig {
  label: 'image' | 'json';
  sourceDir: string;                     // 예: assets/agent-image
  glob: string;                          // 예: **/*.{png,jpg,jpeg,gif,webp} 또는 **/*.json
  isJson: boolean;
  expectCount: number;
  manifestPath: string;                  // 예: assets/logs/upload-agent-images.jsonl
}

// ====== 유틸 ======
function detectContentType(filePath: string): string {
  const t = lookup(filePath);
  return (typeof t === 'string' && t) || 'application/octet-stream';
}

// uploadedName: {ISO_ts}_{uuid_no_dash}_{basename}{ext}
function makeUploadedName(originalName: string, isJson: boolean): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const uniqueId = uuidv4().replace(/-/g, '');
  const extFromName = path.extname(originalName);
  const ext = extFromName || (isJson ? '.json' : '');
  const basename = path.basename(originalName, ext);
  return `${timestamp}_${uniqueId}_${basename}${ext}`;
}

function isTransientError(e: any): boolean {
  const code = e?.code ?? e?.statusCode ?? e?.response?.status;
  const msg = `${e?.message || e}`;
  if (!code && /EAI_AGAIN|ECONNRESET|ENETUNREACH|ETIMEDOUT|socket hang up/i.test(msg)) return true;
  if (typeof code === 'number' && (code >= 500 || code === 429)) return true;
  if (/Deadline Exceeded|internalError|backendError|rateLimit/i.test(msg)) return true;
  return false;
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0; return h; }

// ====== 매니페스트 IO ======
function loadManifest(manifestPath: string): Map<string, ManifestRow> {
  const map = new Map<string, ManifestRow>();
  if (!fs.existsSync(manifestPath)) return map;
  const lines = fs.readFileSync(manifestPath, 'utf8').split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      const row = JSON.parse(line) as ManifestRow;
      map.set(row.id, row);
    } catch { /* ignore */ }
  }
  return map;
}

function appendManifestRow(manifestPath: string, row: ManifestRow) {
  fs.appendFileSync(manifestPath, JSON.stringify(row) + '\n');
}

function rewriteManifest(manifestPath: string, all: Iterable<ManifestRow>) {
  const tmp = manifestPath + '.tmp';
  const fd = fs.openSync(tmp, 'w');
  try {
    for (const row of all) fs.writeSync(fd, JSON.stringify(row) + '\n');
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, manifestPath);
}

// ====== 업로드 ======
function guessCacheControl(): string | undefined {
  return 'public, max-age=31536000, immutable';
}

async function uploadOne(row: ManifestRow): Promise<'DONE' | 'SKIPPED'> {
  const uploadedName = row.uploadedName || makeUploadedName(row.originalName, row.isJson);

  // FileUploadService 스타일: <BUCKET_PATH>/<uploadedName>
  const objectPath = `${BUCKET_PATH}/${uploadedName}`;
  const file = bucket.file(objectPath);

  const writeStream = file.createWriteStream({
    resumable: true,
    validation: 'crc32c',
    metadata: {
      contentType: row.contentType,
      cacheControl: guessCacheControl(),
    },
    preconditionOpts: { ifGenerationMatch: 0 } // 존재하면 실패 → SKIPPED
  } as any);

  await pipeline(fs.createReadStream(row.localPath), writeStream);

  // DB 매핑 저장(업로드 성공 후)
  try {
    const stat = fs.statSync(row.localPath);
    await File.create({
      originalName: row.originalName,
      uploadedName,
      bucketPath: BUCKET_PATH,
      fileSize: stat.size,
      mimeType: row.contentType,
    });
  } catch (e: any) {
    logger?.error?.(`DB mapping save failed for ${row.originalName}: ${e?.message || e}`);
  }

  row.uploadedName = uploadedName;
  row.gcsKey = objectPath;
  return 'DONE';
}

async function withRetry(row: ManifestRow, fn: () => Promise<'DONE' | 'SKIPPED'>): Promise<'DONE' | 'SKIPPED'> {
  const base = 1000;
  let delay = base + (Math.abs(hash(row.id)) % 300);
  const max = 6;

  for (let i = 0; i < max; i++) {
    try {
      return await fn();
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (/Precondition.*failed/i.test(msg) || /conditionNotMet/i.test(msg)) return 'SKIPPED';

      const code = e?.code ?? e?.statusCode ?? e?.response?.status;
      const permanent = (typeof code === 'number' && code >= 400 && code < 500 && code !== 429);
      if (permanent) throw e;

      if (isTransientError(e) && i < max - 1) {
        logger?.warn?.(`[retry] ${row.id} attempt=${i + 1}/${max} delay=${delay}ms :: ${msg}`);
        await sleep(delay);
        delay *= 2;
        continue;
      }
      throw e;
    }
  }
  throw new Error('retry-exhausted');
}

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

// ====== 관찰형 레이어: 가변 동시성 리미터 + 메트릭 ======
class AdjustableLimiter {
  private max: number;
  private active = 0;
  private queue: Array<() => void> = [];
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

function classifyResult(e: any | null, finalStatus: Status | null): Outcome {
  if (!e) return finalStatus === 'SKIPPED' ? 'skipped' : 'ok';
  return isTransientError(e) ? 'transient' : 'failed';
}

// ====== 실행 엔진 ======
export async function runUpload(cfg: RunConfig) {
  await requireDbOrExit();

  console.log(`=== GCS Upload: ${cfg.label} ===`);
  console.log(`Bucket=${BUCKET_NAME}, BucketPath="${BUCKET_PATH}"`);
  console.log(`SourceDir=${cfg.sourceDir}`);
  console.log(`Manifest=${cfg.manifestPath}`);
  console.log(`Expected count=${cfg.expectCount}`);

  // 스캔
  const patterns: string[] = [];
  if (fs.existsSync(cfg.sourceDir)) patterns.push(`${cfg.sourceDir.replace(/\\/g, '/')}/${cfg.glob}`);
  const matched = await fg(patterns, { onlyFiles: true, dot: false });

  const sources = matched.map(abs => {
    const originalName = path.basename(abs);
    return {
      id: path.relative(path.resolve(__dirname, '..'), abs).replace(/\\/g, '/'),
      localPath: abs,
      originalName,
      contentType: detectContentType(abs),
      isJson: cfg.isJson
    };
  });

  console.log(`Found files: ${sources.length}`);
  if (cfg.expectCount && cfg.expectCount !== sources.length) {
    console.warn(`WARN: 파일 개수(${sources.length}) != 기대값(${cfg.expectCount})`);
  }

  // 매니페스트 로드 & 병합
  const manifest = loadManifest(cfg.manifestPath);
  let added = 0;
  for (const s of sources) {
    if (!manifest.has(s.id)) {
      manifest.set(s.id, {
        id: s.id,
        localPath: s.localPath,
        originalName: s.originalName,
        contentType: s.contentType,
        isJson: s.isJson,
        status: 'PENDING',
        lastError: null
      });
      added++;
    }
  }
  if (added > 0) {
    console.log(`Manifest: ${added} new entries added`);
    rewriteManifest(cfg.manifestPath, manifest.values());
  } else {
    console.log('Manifest: resume mode (no new entries)');
  }

  // 업로드(PENDING/FAILED만) — 가변 동시성 적용
  const limiter = new AdjustableLimiter(START_CONCURRENCY);
  let done = 0, failed = 0, skipped = 0, inFlight = 0;
  const tasks: Promise<void>[] = [];
  const metrics = new Metrics();
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
      console.log(`[ADAPT] p95=${Math.round(p95)}ms err=${(err * 100).toFixed(2)}% concurrency ${limiter.concurrency} -> ${next}`);
      limiter.concurrency = next;
    }
  }
  adaptTimer = setInterval(adapt, ADAPT_PERIOD_MS);

  for (const row of manifest.values()) {
    if (row.status !== 'PENDING' && row.status !== 'FAILED') continue;
    tasks.push(limiter.run(async () => {
      row.status = 'UPLOADING';
      row.lastError = null;
      inFlight++;
      const t0 = Date.now();
      try {
        const res = await withRetry(row, () => uploadOne(row));
        if (res === 'SKIPPED') { row.status = 'SKIPPED'; skipped++; }
        else { row.status = 'DONE'; done++; }
        const dt = Date.now() - t0;
        metrics.observe(dt, classifyResult(null, row.status));
      } catch (e: any) {
        row.status = 'FAILED';
        row.lastError = String(e?.message || e);
        failed++;
        const dt = Date.now() - t0;
        metrics.observe(dt, classifyResult(e, null));
      } finally {
        inFlight--;
        appendManifestRow(cfg.manifestPath, row); // 증분 체크포인트
      }
    }));
  }

  await Promise.all(tasks);
  if (adaptTimer) clearInterval(adaptTimer);
  rewriteManifest(cfg.manifestPath, manifest.values());

  // 요약
  const counts = { DONE: 0, FAILED: 0, PENDING: 0, SKIPPED: 0, UPLOADING: 0 };
  for (const r of manifest.values()) counts[r.status]++;

  console.log('\n=== Upload Summary ===');
  console.table({
    total: manifest.size,
    done: counts.DONE,
    skipped: counts.SKIPPED,
    failed: counts.FAILED,
    pending: counts.PENDING
  });

  if (counts.FAILED > 0) {
    console.log('\nFailed examples (up to 20):');
    let shown = 0;
    for (const r of manifest.values()) {
      if (r.status === 'FAILED') {
        console.log(` - ${r.id}: ${r.lastError}`);
        if (++shown >= 20) break;
      }
    }
    process.exitCode = 1;
  }

  // 정리
  try { await mongoose.disconnect(); } catch { /* ignore */ }
}