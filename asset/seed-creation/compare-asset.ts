import mongoose from 'mongoose';
import { connectDatabase } from '../database.connection';
import { ItemSchema } from '../../src/schema/domain/event/item.schema';
import dotenv from 'dotenv';

dotenv.config();

// ========== 입력 값 설정 ==========
const TOURNAMENT_ID = 11; // 비교할 tournamentId 입력
const INPUT_IMAGE_NAMES = ["Aave-10-11", "Algorand-10-11", "Aptos-10-11", "Arbitrum-10-11", "Aster-10-11", "Avalanche-10-11", "BGB-10-11", "Bitcoin-10-11", "BitcoinCash-10-11", "Bittensor-10-11", "BNB-10-11", "Bonk-10-11", "Cardano-10-11", "Chainlink-10-11", "Cosmos-10-11", "Cronos-10-11", "CurveDAOToken-10-11", "Dai-10-11", "DG-10-11", "Dogecoin-10-11", "Ethena-10-11", "Ethereum-10-11", "EthereumClassic-10-11", "Filecoin-10-11", "Hedera-10-11", "Hyperliquid-10-11", "InternetComputer-10-11", "Jupiter-10-11", "Kaspa-10-11", "KCS-10-11", "Litecoin-10-11", "Mantle-10-11", "Monad-10-11", "NEARProtocol-10-11", "OKB-10-11", "Ondo-10-11", "Optimism-10-11", "PancakeSwap-10-11", "PAXGold-10-11", "Pengu-10-11", "Polkadot-10-11", "Polygon-10-11", "PYUSD-10-11", "Quant-10-11", "Sei-10-11", "ShibaInu-10-11", "Solana-10-11", "Stellar-10-11", "Story-10-11", "Sui-10-11", "Tether-10-11", "TetherGold-10-11", "Tezos-10-11", "Ton-10-11", "TRON-10-11", "Uniswap-10-11", "USDC-10-11", "USDD-10-11", "USDe-10-11", "VeChain-10-11", "WLFI-10-11", "Worldcoin-10-11", "XRP-10-11", "Zcash-10-11"]
// =================================

async function compareAssets() {
    try {
        // 데이터베이스 연결
        console.log('데이터베이스 연결 중...');
        await connectDatabase();
        console.log('데이터베이스 연결 완료\n');

        // Item 모델 생성
        const ItemModel = mongoose.model('Item', ItemSchema);

        // DB에서 해당 tournamentId의 모든 items 조회
        console.log(`TournamentId ${TOURNAMENT_ID}의 Item 조회 중...`);
        const dbItems = await ItemModel.find({
            tournamentId: TOURNAMENT_ID,
        }).select('imageName -_id');

        const dbImageNames = dbItems.map(item => item.imageName);
        const inputImageNamesSet = new Set(INPUT_IMAGE_NAMES);
        const dbImageNamesSet = new Set(dbImageNames);

        console.log(`입력된 imageName 개수: ${INPUT_IMAGE_NAMES.length}`);
        console.log(`DB에 있는 imageName 개수: ${dbImageNames.length}\n`);

        // 입력 배열에는 있는데 DB에 없는 imageName 찾기
        const missingInDb = INPUT_IMAGE_NAMES.filter(
            imageName => !dbImageNamesSet.has(imageName)
        );

        // DB에 있는데 입력 배열에는 없는 imageName 찾기
        const missingInInput = dbImageNames.filter(
            imageName => !inputImageNamesSet.has(imageName)
        );

        // 결과 출력
        console.log('='.repeat(60));
        console.log('비교 결과');
        console.log('='.repeat(60));

        if (missingInDb.length > 0) {
            console.log(`\n[입력 배열에는 있지만 DB에 없는 imageName] (${missingInDb.length}개):`);
            missingInDb.forEach((imageName, index) => {
                console.log(`  ${index + 1}. ${imageName}`);
            });
        } else {
            console.log('\n[입력 배열에는 있지만 DB에 없는 imageName]: 없음');
        }

        if (missingInInput.length > 0) {
            console.log(`\n[DB에는 있지만 입력 배열에는 없는 imageName] (${missingInInput.length}개):`);
            missingInInput.forEach((imageName, index) => {
                console.log(`  ${index + 1}. ${imageName}`);
            });
        } else {
            console.log('\n[DB에는 있지만 입력 배열에는 없는 imageName]: 없음');
        }

        if (missingInDb.length === 0 && missingInInput.length === 0) {
            console.log('\n✅ 모든 imageName이 일치합니다!');
        }

        console.log('\n' + '='.repeat(60));

    } catch (error) {
        console.error('에러 발생:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('\n데이터베이스 연결 종료');
    }
}

// 스크립트 실행
if (require.main === module) {
    compareAssets()
        .then(() => {
            console.log('스크립트 실행 완료');
            process.exit(0);
        })
        .catch((error) => {
            console.error('스크립트 실행 실패:', error);
            process.exit(1);
        });
}

export { compareAssets };

