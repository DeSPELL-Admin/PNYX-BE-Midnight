import fs from 'fs';
import path from 'path';

// ========== 입력 값 설정 ==========
// 시드 덤프 JSON이 위치한 디렉터리 (다른 경로면 이 상수만 변경)
// 기본값: PNYX-BE 와 형제 디렉터리인 PNYX-Assets/collections/seed
const SEED_DIR = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    'PNYX-Assets',
    'collections',
    'seed',
);

interface SeedTarget {
    inputFile: string;
    outputFile: string;
    dedupKeys: string[];
    resetFields: string[];
}

const TARGETS: SeedTarget[] = [
    {
        inputFile: '20260604-pnyx.items.json',
        outputFile: '20260604-pnyx.items.normalized.json',
        dedupKeys: ['tournamentId', 'itemId'],
        resetFields: [
            'firstCount',
            'secondCount',
            'wins',
            'tournamentEntries',
            'totalMatchEntries',
        ],
    },
    {
        inputFile: '20260604-pnyx.tournaments.json',
        outputFile: '20260604-pnyx.tournaments.normalized.json',
        dedupKeys: ['tournamentId'],
        resetFields: ['selectedCount'],
    },
];
// =================================

type SeedDocument = Record<string, unknown>;

interface NormalizeOptions {
    dedupKeys: string[];
    resetFields: string[];
}

interface NormalizeResult {
    normalized: SeedDocument[];
    originalCount: number;
    removedCount: number;
    unexpectedDuplicateKeys: string[];
}

function buildKey(doc: SeedDocument, dedupKeys: string[]): string {
    return dedupKeys.map((key) => JSON.stringify(doc[key])).join('|');
}

/**
 * 시드 문서 배열을 chainId 없는 현재 스키마에 맞게 정규화한다.
 *  1. top-level chainId 제거
 *  2. resetFields(누적값)를 0으로 초기화
 *  3. dedupKeys 기준 중복 제거 (첫 등장 문서와 그 _id 유지)
 * 정확히 2벌이 아닌 중복 키는 unexpectedDuplicateKeys 로 보고한다.
 */
export function normalizeDocuments(
    docs: SeedDocument[],
    { dedupKeys, resetFields }: NormalizeOptions,
): NormalizeResult {
    const kept = new Map<string, SeedDocument>();
    const occurrences = new Map<string, number>();

    for (const doc of docs) {
        const key = buildKey(doc, dedupKeys);
        occurrences.set(key, (occurrences.get(key) ?? 0) + 1);

        if (kept.has(key)) {
            continue;
        }

        const normalizedDoc: SeedDocument = { ...doc };
        delete normalizedDoc.chainId;
        for (const field of resetFields) {
            normalizedDoc[field] = 0;
        }

        kept.set(key, normalizedDoc);
    }

    const unexpectedDuplicateKeys = Array.from(occurrences.entries())
        .filter(([, count]) => count !== 2)
        .map(([key]) => key);

    return {
        normalized: Array.from(kept.values()),
        originalCount: docs.length,
        removedCount: docs.length - kept.size,
        unexpectedDuplicateKeys,
    };
}

function normalizeSeedFile(target: SeedTarget): void {
    const inputPath = path.join(SEED_DIR, target.inputFile);
    const outputPath = path.join(SEED_DIR, target.outputFile);

    const raw = fs.readFileSync(inputPath, 'utf-8');
    const docs = JSON.parse(raw) as SeedDocument[];

    if (!Array.isArray(docs)) {
        throw new Error(`배열 형식이 아닙니다: ${target.inputFile}`);
    }

    const result = normalizeDocuments(docs, {
        dedupKeys: target.dedupKeys,
        resetFields: target.resetFields,
    });

    fs.writeFileSync(
        outputPath,
        JSON.stringify(result.normalized, null, 2) + '\n',
        'utf-8',
    );

    console.log(`\n[${target.inputFile}]`);
    console.log(`  원본 문서 수      : ${result.originalCount}`);
    console.log(`  정규화 후 문서 수 : ${result.normalized.length}`);
    console.log(`  제거된 중복 수    : ${result.removedCount}`);
    console.log(`  출력 파일         : ${target.outputFile}`);

    if (result.unexpectedDuplicateKeys.length > 0) {
        console.warn(
            `  ⚠️ 정확히 2벌이 아닌 중복 키 ${result.unexpectedDuplicateKeys.length}개 발견: ` +
                result.unexpectedDuplicateKeys.slice(0, 10).join(', '),
        );
    }
}

function run(): void {
    console.log(`시드 디렉터리: ${SEED_DIR}`);
    for (const target of TARGETS) {
        normalizeSeedFile(target);
    }
    console.log('\n정규화 완료');
}

if (require.main === module) {
    try {
        run();
        process.exit(0);
    } catch (error) {
        console.error('정규화 실패:', error);
        process.exit(1);
    }
}
