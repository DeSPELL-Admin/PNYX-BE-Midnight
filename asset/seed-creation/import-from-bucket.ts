/**
 * GCS 자산 버킷 → tournaments / items / categories / files 실데이터 임포트.
 *
 * 원래 파이프라인(asset/json → insert-metadata.ts → Mongo, asset/image → upload-image.ts → GCS)의
 * 역방향이다. PNYX-Assets 덤프가 없는 환경에서 이미 업로드된 버킷을 유일한 진실원으로 삼아
 * 실제 토너먼트/아이템을 복원한다.
 *
 * 버킷 오브젝트 규칙:  images/{ISO타임스탬프}_{uuid32}_{imageName}.webp
 *   - imageName = `{특수문자 제거한 이름}-{tournamentId}` (insert-metadata.ts 와 동일)
 *   - tournamentId 10, 11 은 이미지를 공유하므로 접미사가 `-10-11`
 *
 * files 컬렉션도 함께 채운다 — FileService 가 originalName → uploadedName 을 여기서 찾은 뒤
 * GCS 를 읽기 때문에, 이 문서가 없으면 이미지가 404 가 된다.
 *
 *   npx ts-node -r tsconfig-paths/register asset/seed-creation/import-from-bucket.ts [--dry]
 *
 * 셸에 MONGODB_URI / BUCKET_NAME 이 export 되어 있어도 .env 가 이기도록 override 로 읽는다
 * (이 저장소에서 실제로 다른 프로젝트 DB 에 쓰는 사고가 났던 지점이다).
 */
import dotenv from 'dotenv';
dotenv.config({ override: true });

import mongoose from 'mongoose';
import { Storage } from '@google-cloud/storage';
import { connectDatabase } from '../database.connection';
import { CategorySchema } from '../../src/schema/domain/category.schema';
import { TournamentSchema } from '../../src/schema/domain/event/tournament.schema';
import { ItemSchema } from '../../src/schema/domain/event/item.schema';
import { FileSchema } from '../../src/schema/domain/file.schema';

/**
 * 버킷은 아이템 이름만 갖고 있고 토너먼트 제목/카테고리는 갖고 있지 않다.
 * 아래 값은 각 토너먼트의 실제 아이템 구성을 보고 붙인 것 — 원본 제목을 알고 있다면 여기만 고치면 된다.
 */
const TOURNAMENT_META: Record<number, { category: string; title: string }> = {
    0: { category: 'anime', title: 'Anime Series World Cup' },
    1: { category: 'anime', title: 'Strongest Anime Character World Cup' },
    2: { category: 'anime', title: 'Male Anime Character World Cup' },
    3: { category: 'anime', title: 'Female Anime Character World Cup' },
    4: { category: 'game', title: 'Video Game World Cup' },
    10: { category: 'crypto', title: 'Crypto Token World Cup' },
    11: { category: 'crypto', title: 'Crypto Token World Cup II' },
    12: { category: 'food', title: 'Food World Cup' },
};

/**
 * 버킷에는 있지만 Midnight 빌드에는 넣지 않는 토너먼트.
 *  - 9: Soneium Ecosystem World Cup (Arcas, Kyo Finance, SONEX …) — EVM(Soneium) 시절 전용 콘텐츠.
 * 이미지·files 행·tournaments·items 모두 건너뛴다.
 */
const EXCLUDED_TOURNAMENTS = new Set<number>([9]);

/** `-10-11` 접미사는 토너먼트 10 과 11 이 함께 쓴다. */
const SHARED_SUFFIX = '10-11';
const OBJECT_RE =
    /^(?<ts>[0-9TZ.:-]+)_(?<uuid>[0-9a-f]{32})_(?<image>.+)\.webp$/;
const IMAGE_RE = new RegExp(`^(?<name>.+?)-(?<suffix>${SHARED_SUFFIX}|\\d+)$`);

/** `AttackonTitan` → `Attackon Titan`, `AlanWake2` → `Alan Wake 2`. 표시용이라 완벽 복원은 불가능하다. */
function toDisplayName(sanitized: string): string {
    return sanitized
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Za-z])(\d)/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim();
}

interface BucketImage {
    imageName: string; // `AttackonTitan-0`
    uploadedName: string; // `{ts}_{uuid}_AttackonTitan-0.webp`
    fileSize: number;
    tournamentIds: number[];
    displayName: string;
}

async function listBucketImages(): Promise<BucketImage[]> {
    const keyFilename = process.env.FILE_SERVER_API_KEY!;
    const bucketName = process.env.BUCKET_NAME!;
    const bucketPath = process.env.BUCKET_PATH ?? 'images';
    console.log(`버킷: ${bucketName}/${bucketPath} (key: ${keyFilename})`);

    const bucket = new Storage({ keyFilename }).bucket(bucketName);
    const collected: BucketImage[] = [];
    let pageToken: string | undefined;

    do {
        // autoPaginate:false 오버로드의 3번째 원소(apiResponse)에 nextPageToken 이 온다.
        const [files, , resp] = (await bucket.getFiles({
            prefix: `${bucketPath}/`,
            maxResults: 1000,
            pageToken,
            autoPaginate: false,
        })) as unknown as [
            { name: string; metadata: { size?: string | number } }[],
            unknown,
            { nextPageToken?: string } | undefined,
        ];
        for (const file of files) {
            const objectName = file.name.slice(`${bucketPath}/`.length);
            const parsed = OBJECT_RE.exec(objectName);
            if (!parsed?.groups) {
                console.warn(`  건너뜀(형식 불일치): ${objectName}`);
                continue;
            }
            const imageName = parsed.groups.image;
            const matched = IMAGE_RE.exec(imageName);
            if (!matched?.groups) {
                console.warn(`  건너뜀(토너먼트 접미사 없음): ${imageName}`);
                continue;
            }
            const { name, suffix } = matched.groups;
            const tournamentIds =
                suffix === SHARED_SUFFIX ? [10, 11] : [Number(suffix)];
            if (tournamentIds.every((id) => EXCLUDED_TOURNAMENTS.has(id))) {
                continue; // 제외 토너먼트 전용 이미지 — files 행도 만들지 않는다
            }
            collected.push({
                imageName,
                uploadedName: objectName,
                fileSize: Number(file.metadata.size ?? 0),
                tournamentIds: tournamentIds.filter(
                    (id) => !EXCLUDED_TOURNAMENTS.has(id),
                ),
                displayName: toDisplayName(name),
            });
        }
        pageToken = resp?.nextPageToken;
    } while (pageToken);

    return collected;
}

async function main(): Promise<void> {
    const dryRun = process.argv.includes('--dry');
    const images = await listBucketImages();
    console.log(`오브젝트 ${images.length}건`);

    // 토너먼트별로 모아 itemId 를 부여한다. 원본 itemId(=JSON 배열 순서)는 버킷에서 복원할 수 없으므로
    // imageName 사전순으로 0..N-1 을 고정 배정한다(실행마다 동일).
    const byTournament = new Map<number, BucketImage[]>();
    for (const image of images) {
        for (const tournamentId of image.tournamentIds) {
            const list = byTournament.get(tournamentId) ?? [];
            list.push(image);
            byTournament.set(tournamentId, list);
        }
    }
    for (const list of byTournament.values()) {
        list.sort((a, b) => a.imageName.localeCompare(b.imageName));
    }

    const missingMeta = [...byTournament.keys()].filter(
        (id) => !TOURNAMENT_META[id],
    );
    if (missingMeta.length) {
        throw new Error(
            `TOURNAMENT_META 에 없는 토너먼트: ${missingMeta.join(', ')}`,
        );
    }

    console.log('\n토너먼트별 아이템 수');
    for (const id of [...byTournament.keys()].sort((a, b) => a - b)) {
        console.log(
            `  ${String(id).padStart(2)} ${TOURNAMENT_META[id].title} — ${byTournament.get(id)!.length}개`,
        );
    }

    if (dryRun) {
        console.log('\n--dry: DB 를 건드리지 않고 종료');
        return;
    }

    await connectDatabase();
    console.log(`\nDB: ${mongoose.connection.db!.databaseName}`);

    const CategoryModel = mongoose.model('Category', CategorySchema);
    const TournamentModel = mongoose.model('Tournament', TournamentSchema);
    const ItemModel = mongoose.model('Item', ItemSchema);
    const FileModel = mongoose.model('File', FileSchema);

    const bucketPath = process.env.BUCKET_PATH ?? 'images';
    const fileOps = images.map((image) => ({
        updateOne: {
            filter: { originalName: `${image.imageName}.webp` },
            update: {
                $set: {
                    originalName: `${image.imageName}.webp`,
                    uploadedName: image.uploadedName,
                    bucketPath,
                    fileSize: image.fileSize,
                    mimeType: 'image/webp',
                },
            },
            upsert: true,
        },
    }));
    await FileModel.bulkWrite(fileOps);
    console.log(`files: ${fileOps.length}건`);

    const categories = [
        ...new Set(Object.values(TOURNAMENT_META).map((m) => m.category)),
    ];
    await CategoryModel.bulkWrite(
        categories.map((category) => ({
            updateOne: {
                filter: { category },
                update: { $set: { category } },
                upsert: true,
            },
        })),
    );
    console.log(`categories: ${categories.join(', ')}`);

    const tournamentIds = [...byTournament.keys()].sort((a, b) => a - b);
    await TournamentModel.bulkWrite(
        tournamentIds.map((tournamentId) => ({
            updateOne: {
                filter: { tournamentId },
                update: {
                    $set: { tournamentId, ...TOURNAMENT_META[tournamentId] },
                },
                upsert: true,
            },
        })),
    );
    console.log(`tournaments: ${tournamentIds.length}건`);

    let itemCount = 0;
    for (const tournamentId of tournamentIds) {
        const list = byTournament.get(tournamentId)!;
        await ItemModel.bulkWrite(
            list.map((image, itemId) => ({
                updateOne: {
                    filter: { tournamentId, itemId },
                    update: {
                        $set: {
                            tournamentId,
                            itemId,
                            name: image.displayName,
                            imageName: image.imageName,
                        },
                    },
                    upsert: true,
                },
            })),
        );
        itemCount += list.length;
    }
    console.log(`items: ${itemCount}건`);
    console.log('\n완료');
}

if (require.main === module) {
    main()
        .then(async () => {
            await mongoose.disconnect().catch(() => undefined);
            process.exit(0);
        })
        .catch(async (error) => {
            console.error('임포트 실패:', error);
            await mongoose.disconnect().catch(() => undefined);
            process.exit(1);
        });
}

export { main as importFromBucket };
