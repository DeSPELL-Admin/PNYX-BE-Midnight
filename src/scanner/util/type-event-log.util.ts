export type TypeEventLog = {
    blockNumber: number;
    blockHash: string;
    logIndex: number;
    txHash: string;
    contractAddress: string;
    topics: string[];
    data: string;
    chainId: number;
};
