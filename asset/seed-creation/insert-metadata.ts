import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { connectDatabase } from '../database.connection';
import { CategorySchema } from '../../src/schema/domain/category.schema';
import { TournamentSchema } from '../../src/schema/domain/event/tournament.schema';
import { ItemSchema } from '../../src/schema/domain/event/item.schema';
import dotenv from 'dotenv';

dotenv.config();

const enableCategoryInsert = true;

const JSON_DIR = path.join(__dirname, '..', 'json');

interface TournamentData {
    category: string;
    title: string;
}

interface ItemData {
    name: string;
}

async function insertMetadata() {
    try {
        // 데이터베이스 연결
        console.log('데이터베이스 연결 중...');
        await connectDatabase();
        console.log('데이터베이스 연결 완료');

        // 모델 생성
        const CategoryModel = mongoose.model('Category', CategorySchema);
        const TournamentModel = mongoose.model('Tournament', TournamentSchema);
        const ItemModel = mongoose.model('Item', ItemSchema);

        // JSON 파일 목록 읽기
        const files = fs.readdirSync(JSON_DIR);
        const tournamentFiles = files.filter(f => f.endsWith('-tournament.json'));
        const itemFiles = files.filter(f => f.endsWith('-item.json'));

        console.log(`발견된 tournament 파일: ${tournamentFiles.length}개`);
        console.log(`발견된 item 파일: ${itemFiles.length}개`);

        // 1. Category 데이터 수집 및 저장
        const categorySet = new Set<string>();
        const categoryToTournamentId = new Map<string, number>();
        const tournamentDataMap = new Map<number, TournamentData>();

        for (const file of tournamentFiles) {
            const filePath = path.join(JSON_DIR, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const data: TournamentData = JSON.parse(content);

            // 파일명에서 tournamentId 추출 (예: "0-tournament.json" -> 0)
            const match = file.match(/^(\d+)-tournament\.json$/);
            if (!match) {
                throw new Error(`파일명 형식이 올바르지 않습니다: ${file}`);
            }

            const tournamentId = parseInt(match[1], 10);

            if (!categoryToTournamentId.has(data.category)) {
                categorySet.add(data.category);
                categoryToTournamentId.set(data.category, tournamentId);
            }

            tournamentDataMap.set(tournamentId, data);
        }

        // Category bulk insert
        if (categorySet.size > 0 && enableCategoryInsert) {
            const categoryBulkOps = Array.from(categorySet).map(category => ({
                updateOne: {
                    filter: { category },
                    update: { $set: { category } },
                    upsert: true
                }
            }));

            console.log(`Category bulk 작업 실행 중... (${categoryBulkOps.length}개)`);
            await CategoryModel.bulkWrite(categoryBulkOps);
            console.log('Category 저장 완료');
        }

        // 2. Tournament 데이터 저장
        if (tournamentDataMap.size > 0) {
            const tournamentBulkOps = Array.from(tournamentDataMap.entries()).map(([tournamentId, data]) => ({
                updateOne: {
                    filter: { tournamentId },
                    update: {
                        $set: {
                            tournamentId,
                            category: data.category,
                            title: data.title,
                        }
                    },
                    upsert: true
                }
            }));

            console.log(`Tournament bulk 작업 실행 중... (${tournamentBulkOps.length}개)`);
            await TournamentModel.bulkWrite(tournamentBulkOps);
            console.log('Tournament 저장 완료');
        }

        // 3. Item 데이터 저장
        for (const file of itemFiles) {
            const filePath = path.join(JSON_DIR, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const items: ItemData[] = JSON.parse(content);

            // 파일명에서 tournamentId 추출 (예: "0-item.json" -> 0)
            const match = file.match(/^(\d+)-item\.json$/);
            if (!match) {
                throw new Error(`파일명 형식이 올바르지 않습니다: ${file}`);
            }

            const tournamentId = parseInt(match[1], 10);

            // Item bulk insert (itemId는 0부터 순서대로)
            const itemBulkOps = items.map((item, index) => {
                const itemId = index;
                // item.name에서 특수문자(느낌표, 쉼표, 점 등)와 공백을 모두 제거한 값을 imageName에 사용
                const sanitizedName = item.name.replace(/[^a-zA-Z0-9]/g, '');
                // const imageName = `${sanitizedName}-${itemId}`;
                const imageName =
                    tournamentId === 10 || tournamentId === 11
                        ? `${sanitizedName.trim()}-10-11` : `${sanitizedName.trim()}-${tournamentId}`;

                return {
                    updateOne: {
                        filter: { tournamentId, itemId },
                        update: {
                            $set: {
                                tournamentId,
                                itemId,
                                name: item.name.trim(),
                                imageName: imageName,
                            }
                        },
                        upsert: true
                    }
                };
            });

            console.log(`Item bulk 작업 실행 중... (tournamentId: ${tournamentId}, ${itemBulkOps.length}개)`);
            await ItemModel.bulkWrite(itemBulkOps);
            console.log(`Tournament ${tournamentId}의 Item 저장 완료`);
        }

        console.log('\n모든 데이터 삽입 완료!');

    } catch (error) {
        console.error('에러 발생:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('데이터베이스 연결 종료');
    }
}

// 스크립트 실행
if (require.main === module) {
    insertMetadata()
        .then(() => {
            console.log('스크립트 실행 완료');
            process.exit(0);
        })
        .catch((error) => {
            console.error('스크립트 실행 실패:', error);
            process.exit(1);
        });
}

export { insertMetadata as importJsonData };

