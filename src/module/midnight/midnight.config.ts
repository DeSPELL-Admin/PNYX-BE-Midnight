/**
 * Midnight 설정 — env 단일 진실원.
 *
 * MIDNIGHT_ENABLED=true 일 때만 오퍼레이터 지갑/컨트랙트가 초기화된다. chainId 는 EVM 이 없는
 * Midnight 을 기존 `/chains/:chainId` 라우트·컬렉션에 태우기 위한 **합성값**으로, FE 의
 * `MIDNIGHT_CHAIN_IDS` 와 같아야 한다 (preprod 99101 / preview 99102 / undeployed 99100).
 */
import { getEnv } from 'src/util/env.util';

export type MidnightNetworkId = 'preprod' | 'preview' | 'undeployed';

export type MidnightConfig = {
    enabled: boolean;
    networkId: MidnightNetworkId;
    chainId: number;
    walletSeed: string;
    tournamentFinalizerAddress: string;
    indexerUrl: string;
    indexerWsUrl: string;
    nodeUrl: string;
    proofServerUrl: string;
    walletStateFile: string;
    contractDir: string;
    /** grant 유효기간(초) */
    grantTtlSeconds: number;
    grantDeadlineGraceSeconds: number;
};

const DEFAULT_CHAIN_IDS: Record<MidnightNetworkId, number> = { undeployed: 99100, preprod: 99101, preview: 99102 };
const DEFAULT_URLS: Record<MidnightNetworkId, { indexer: string; ws: string; node: string }> = {
    undeployed: { indexer: 'http://127.0.0.1:8088/api/v3/graphql', ws: 'ws://127.0.0.1:8088/api/v3/graphql/ws', node: 'http://127.0.0.1:9944' },
    preprod: { indexer: 'https://indexer.preprod.midnight.network/api/v3/graphql', ws: 'wss://indexer.preprod.midnight.network/api/v3/graphql/ws', node: 'https://rpc.preprod.midnight.network' },
    preview: { indexer: 'https://indexer.preview.midnight.network/api/v3/graphql', ws: 'wss://indexer.preview.midnight.network/api/v3/graphql/ws', node: 'https://rpc.preview.midnight.network' },
};

const opt = (key: string, fallback: string): string => process.env[key] || fallback;

export function isMidnightEnabled(): boolean {
    return process.env.MIDNIGHT_ENABLED === 'true';
}

/** enabled 와 무관하게 chainId 만 알고 싶을 때 (ChainService.validateChainId 용) */
export function midnightChainId(): number | null {
    if (!isMidnightEnabled()) return null;
    const network = opt('MIDNIGHT_NETWORK', 'preprod') as MidnightNetworkId;
    return parseInt(opt('MIDNIGHT_CHAIN_ID', String(DEFAULT_CHAIN_IDS[network] ?? 99101)), 10);
}

export function loadMidnightConfig(): MidnightConfig {
    const networkId = opt('MIDNIGHT_NETWORK', 'preprod') as MidnightNetworkId;
    const urls = DEFAULT_URLS[networkId];
    return {
        enabled: isMidnightEnabled(),
        networkId,
        chainId: midnightChainId() ?? DEFAULT_CHAIN_IDS[networkId],
        walletSeed: getEnv('MIDNIGHT_WALLET_SEED'),
        tournamentFinalizerAddress: getEnv('MIDNIGHT_TOURNAMENT_FINALIZER_CONTRACT_ADDRESS'),
        indexerUrl: opt('MIDNIGHT_INDEXER_URL', urls.indexer),
        indexerWsUrl: opt('MIDNIGHT_INDEXER_WS_URL', urls.ws),
        nodeUrl: opt('MIDNIGHT_NODE_URL', urls.node),
        proofServerUrl: opt('MIDNIGHT_PROOF_SERVER_URL', 'http://127.0.0.1:6300'),
        walletStateFile: opt('MIDNIGHT_WALLET_STATE_FILE', `midnight-wallet-state-${networkId}.json`),
        contractDir: opt('MIDNIGHT_CONTRACT_DIR', 'midnight-contract/TournamentFinalizer'),
        grantTtlSeconds: parseInt(opt('MIDNIGHT_GRANT_TTL_SECONDS', '86400'), 10),
        grantDeadlineGraceSeconds: parseInt(
            opt('MIDNIGHT_GRANT_DEADLINE_GRACE_SECONDS', '30'),
            10,
        ),
    };
}
