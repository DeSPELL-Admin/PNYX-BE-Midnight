/**
 * Midnight SDK 로더.
 *
 * wallet-sdk-* 와 midnight-js-* 하위 패키지는 ESM 전용(exports 에 `import` 조건만)이라 NestJS(CJS)
 * 에서 `require` 로 못 불러온다. tsconfig `module: nodenext` 는 CJS 출력에서도 `import()` 를 보존하므로
 * 여기서 한 번만 동적 import 해 캐시한다. (ts-node/jest 의 commonjs 오버라이드 경로에서는 동작하지 않음 —
 * Midnight 모듈은 nest build/start 로만 실행한다.)
 */

// ESM 전용 패키지의 타입은 CJS 컴파일 컨텍스트에서 `resolution-mode` 불일치로 대조가 불가능해 any 로 둔다.
// (동적 import 결과의 런타임 shape 는 동일하다. CJS 로 제공되는 ledger-v8/rxjs 만 정적 타입 유지)
export type MidnightSdk = {
    contracts: any;
    compactJs: any;
    zkConfig: any;
    proof: any;
    indexer: any;
    privateState: any;
    networkId: { setNetworkId: (id: string) => void; getNetworkId: () => string };
    ledger: typeof import('@midnight-ntwrk/ledger-v8');
    facade: any;
    hd: any;
    shielded: any;
    unshielded: any;
    dust: any;
    addressFormat: any;
    abstractions: any;
    rxjs: typeof import('rxjs');
};

let cached: Promise<MidnightSdk> | undefined;

export function loadMidnightSdk(): Promise<MidnightSdk> {
    if (!cached) {
        cached = (async () => {
            const [contracts, compactJs, zkConfig, proof, indexer, privateState, networkId, ledger, facade, hd, shielded, unshielded, dust, addressFormat, abstractions, rxjs] =
                await Promise.all([
                    import('@midnight-ntwrk/midnight-js-contracts'),
                    import('@midnight-ntwrk/compact-js'),
                    import('@midnight-ntwrk/midnight-js-node-zk-config-provider'),
                    import('@midnight-ntwrk/midnight-js-http-client-proof-provider'),
                    import('@midnight-ntwrk/midnight-js-indexer-public-data-provider'),
                    import('@midnight-ntwrk/midnight-js-level-private-state-provider'),
                    import('@midnight-ntwrk/midnight-js-network-id'),
                    import('@midnight-ntwrk/ledger-v8'),
                    import('@midnight-ntwrk/wallet-sdk-facade'),
                    import('@midnight-ntwrk/wallet-sdk-hd'),
                    import('@midnight-ntwrk/wallet-sdk-shielded'),
                    import('@midnight-ntwrk/wallet-sdk-unshielded-wallet'),
                    import('@midnight-ntwrk/wallet-sdk-dust-wallet'),
                    import('@midnight-ntwrk/wallet-sdk-address-format'),
                    import('@midnight-ntwrk/wallet-sdk-abstractions'),
                    import('rxjs'),
                ]);
            // wallet SDK 는 전역 WebSocket 을 기대한다 (Node 22+ 는 내장)
            if (typeof (globalThis as { WebSocket?: unknown }).WebSocket === 'undefined') {
                const ws = await import('ws');
                (globalThis as { WebSocket?: unknown }).WebSocket = ws.WebSocket;
            }
            return { contracts, compactJs, zkConfig, proof, indexer, privateState, networkId, ledger, facade, hd, shielded, unshielded, dust, addressFormat, abstractions, rxjs } as MidnightSdk;
        })();
    }
    return cached!;
}
