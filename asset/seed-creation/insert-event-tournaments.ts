import mongoose from 'mongoose';
import { connectDatabase } from '../database.connection';
import { CategorySchema } from '../../src/schema/domain/category.schema';
import { TournamentSchema } from '../../src/schema/domain/event/tournament.schema';
import { ItemSchema } from '../../src/schema/domain/event/item.schema';
import {
    BettingType,
    TournamentGenre,
    TournamentType,
} from '../../src/module/common/util/enum.util';
import dotenv from 'dotenv';

dotenv.config();

// 기존 tournamentId 12까지 존재 → 이벤트 샘플은 13부터 순차 부여.
const START_TOURNAMENT_ID = 13;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// 장르별 고정 값.
const TOURNAMENT_POINT = 1000;
const BETTING_TOTAL_PRIZE = '0';
const BETTING_MIN_BET_AMOUNT = '1';
const BETTING_CURRENCY = BettingType.POINT;
const INITIAL_TOTAL_BET_AMOUNT = '0';

// 장르별 기대 아이템 수(사양: tournament=16, betting=4).
const EXPECTED_ITEM_COUNT: Record<TournamentGenre, number> = {
    [TournamentGenre.TOURNAMENT]: 16,
    [TournamentGenre.BETTING]: 4,
};

interface EventTournamentSeed {
    category: string;
    title: string;
    genre: TournamentGenre;
    items: string[];
}

// 콘텐츠는 여기서만 수정하면 됨(카테고리/제목/아이템 이름).
const EVENT_TOURNAMENTS: EventTournamentSeed[] = [
    {
        category: 'Movies',
        title: 'Greatest Movie of All Time',
        genre: TournamentGenre.TOURNAMENT,
        items: [
            'The Godfather',
            'Pulp Fiction',
            'Inception',
            'Forrest Gump',
            'The Matrix',
            'Interstellar',
            'Fight Club',
            'Gladiator',
            'Parasite',
            'Whiplash',
            'The Dark Knight',
            'Goodfellas',
            'La La Land',
            'Titanic',
            'Joker',
            'Oldboy',
        ],
    },
    {
        category: 'Music',
        title: 'Best Song of the Decade',
        genre: TournamentGenre.TOURNAMENT,
        items: [
            'Bohemian Rhapsody',
            'Blinding Lights',
            'Shape of You',
            'Rolling in the Deep',
            'Uptown Funk',
            'Bad Guy',
            'Dynamite',
            'Someone Like You',
            'Levitating',
            'Stay',
            'Perfect',
            'Believer',
            'Counting Stars',
            'Happier',
            'Sunflower',
            'Peaches',
        ],
    },
    {
        category: 'Esports',
        title: 'Who will win the Grand Finals?',
        genre: TournamentGenre.BETTING,
        items: ['T1', 'Gen G', 'JDG', 'BLG'],
    },
    {
        category: 'Crypto',
        title: 'Which coin pumps next week?',
        genre: TournamentGenre.BETTING,
        items: ['Bitcoin', 'Ethereum', 'Solana', 'Astar'],
    },
];

interface AssignedSeed {
    seed: EventTournamentSeed;
    tournamentId: number;
}

// 이름에서 영숫자만 남긴 뒤 -${tournamentId} 를 붙이는 기존 imageName 컨벤션.
function buildImageName(name: string, tournamentId: number): string {
    const sanitized = name.replace(/[^a-zA-Z0-9]/g, '').trim();
    return `${sanitized}-${tournamentId}`;
}

function buildTournamentDoc(
    { seed, tournamentId }: AssignedSeed,
    startedAt: Date,
    endedAt: Date,
): Record<string, unknown> {
    const base = {
        category: seed.category,
        tournamentId,
        title: seed.title,
        type: TournamentType.EVENT,
        selectedCount: 0,
        genre: seed.genre,
        startedAt,
        endedAt,
    };

    if (seed.genre === TournamentGenre.TOURNAMENT) {
        return { ...base, point: TOURNAMENT_POINT };
    }

    return {
        ...base,
        totalPrize: BETTING_TOTAL_PRIZE,
        minBetAmount: BETTING_MIN_BET_AMOUNT,
        bettingType: BETTING_CURRENCY,
        winItemId: null,
    };
}

function buildItemDocs({
    seed,
    tournamentId,
}: AssignedSeed): Record<string, unknown>[] {
    return seed.items.map((name, itemId) => {
        const base = {
            tournamentId,
            itemId,
            name: name.trim(),
            imageName: buildImageName(name, tournamentId),
        };

        if (seed.genre === TournamentGenre.TOURNAMENT) {
            return {
                ...base,
                firstCount: 0,
                secondCount: 0,
                wins: 0,
                tournamentEntries: 0,
                totalMatchEntries: 0,
            };
        }

        return { ...base, totalBetAmount: INITIAL_TOTAL_BET_AMOUNT };
    });
}

function assignTournamentIds(): AssignedSeed[] {
    return EVENT_TOURNAMENTS.map((seed, index) => ({
        seed,
        tournamentId: START_TOURNAMENT_ID + index,
    }));
}

function validateSeeds(assigned: AssignedSeed[]): void {
    for (const { seed, tournamentId } of assigned) {
        const expected = EXPECTED_ITEM_COUNT[seed.genre];
        if (seed.items.length !== expected) {
            throw new Error(
                `tournamentId ${tournamentId} (${seed.genre}) 아이템 수가 ` +
                    `${seed.items.length}개입니다. ${expected}개여야 합니다.`,
            );
        }

        const uniqueNames = new Set(seed.items.map((name) => name.trim()));
        if (uniqueNames.size !== seed.items.length) {
            throw new Error(
                `tournamentId ${tournamentId} 아이템 이름에 중복이 있습니다.`,
            );
        }
    }
}

async function insertEventTournaments(): Promise<void> {
    try {
        console.log('데이터베이스 연결 중...');
        await connectDatabase();
        console.log('데이터베이스 연결 완료');

        const CategoryModel = mongoose.model('Category', CategorySchema);
        const TournamentModel = mongoose.model('Tournament', TournamentSchema);
        const ItemModel = mongoose.model('Item', ItemSchema);

        const assigned = assignTournamentIds();
        validateSeeds(assigned);

        const tournamentIds = assigned.map((entry) => entry.tournamentId);

        // 사전 검증: 대상 tournamentId가 이미 있으면 중복 삽입을 막고 중단.
        const existing = await TournamentModel.find(
            { tournamentId: { $in: tournamentIds } },
            { tournamentId: 1, _id: 0 },
        ).lean();

        if (existing.length > 0) {
            const existingIds = existing
                .map((doc) => doc.tournamentId)
                .sort((a, b) => a - b);
            throw new Error(
                `이미 존재하는 tournamentId: ${existingIds.join(', ')}. ` +
                    `중복 삽입 방지를 위해 중단합니다. ` +
                    `재삽입하려면 해당 tournaments/items 문서를 먼저 삭제하세요.`,
            );
        }

        const now = Date.now();
        const startedAt = new Date(now - ONE_WEEK_MS);
        const endedAt = new Date(now + ONE_WEEK_MS);

        // Category: 유니크 필드라 이미 있을 수 있어 idempotent upsert.
        const categorySet = new Set(
            assigned.map((entry) => entry.seed.category),
        );
        const categoryOps = Array.from(categorySet).map((category) => ({
            updateOne: {
                filter: { category },
                update: { $setOnInsert: { category } },
                upsert: true,
            },
        }));
        await CategoryModel.bulkWrite(categoryOps);
        console.log(`Category upsert 완료 (${categoryOps.length}개)`);

        // Tournament: 신규 ID라 write-once insertMany.
        const tournamentDocs = assigned.map((entry) =>
            buildTournamentDoc(entry, startedAt, endedAt),
        );
        await TournamentModel.insertMany(tournamentDocs);
        console.log(`Tournament insert 완료 (${tournamentDocs.length}개)`);

        // Item: 토너먼트별 itemId 0부터, write-once insertMany.
        const itemDocs = assigned.flatMap((entry) => buildItemDocs(entry));
        await ItemModel.insertMany(itemDocs);
        console.log(`Item insert 완료 (${itemDocs.length}개)`);

        console.log('\n삽입 요약');
        for (const { seed, tournamentId } of assigned) {
            console.log(
                `  - tournamentId ${tournamentId} | ${seed.genre} | ` +
                    `${seed.category} | 아이템 ${seed.items.length}개`,
            );
        }
        console.log(
            `  기간: ${startedAt.toISOString()} ~ ${endedAt.toISOString()}`,
        );
        console.log('\n모든 데이터 삽입 완료!');
    } catch (error) {
        console.error('에러 발생:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('데이터베이스 연결 종료');
    }
}

if (require.main === module) {
    insertEventTournaments()
        .then(() => {
            console.log('스크립트 실행 완료');
            process.exit(0);
        })
        .catch((error) => {
            console.error('스크립트 실행 실패:', error);
            process.exit(1);
        });
}

export { insertEventTournaments };
