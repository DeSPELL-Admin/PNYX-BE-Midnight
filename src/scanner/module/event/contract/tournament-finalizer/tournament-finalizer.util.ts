export type ExtractMatchStatsResult = {
    itemUpdates: ItemUpdate[];
    matchUpdates: MatchUpdate[];
};

export type ItemUpdate = {
    tournamentId: number;
    itemId: number;
    firstCount: number;
    secondCount: number;
    wins: number;
    tournamentEntries: number;
    totalMatchEntries: number;
};

export type MatchUpdate = {
    tournamentId: number;
    itemLowId: number;
    itemHighId: number;
    lowWins: number;
    highWins: number;
    totalMatches: number;
};

export function extractMatchStats(
    entryItemIds: number[],
    tournamentId: number,
    firstItemId: number,
    secondItemId: number,
    cntSign: -1 | 1,
): ExtractMatchStatsResult {
    if (!Array.isArray(entryItemIds))
        throw new Error('entryItemIds must be an array');

    const itemUpdatesMap = new Map<number, ItemUpdate>();
    const matchUpdates: MatchUpdate[] = [];

    for (const itemId of entryItemIds)
        itemUpdatesMap.set(itemId, {
            tournamentId,
            itemId,
            firstCount: itemId === firstItemId ? cntSign : 0,
            secondCount: itemId === secondItemId ? cntSign : 0,
            wins: 0,
            tournamentEntries: cntSign,
            totalMatchEntries: 0,
        });

    let currentRound = entryItemIds.slice();

    while (currentRound.length > 1) {
        if (currentRound.length % 2 !== 0) {
            throw new Error(
                `Invalid round array length (must be even): ${currentRound.length}`,
            );
        }

        const nextRoundWinners: number[] = [];

        for (let i = 0; i < currentRound.length; i += 2) {
            const winnerId = currentRound[i];
            const loserId = currentRound[i + 1];

            itemUpdatesMap.get(winnerId)!.wins += cntSign;
            itemUpdatesMap.get(winnerId)!.totalMatchEntries += cntSign;
            itemUpdatesMap.get(loserId)!.totalMatchEntries += cntSign;

            const { itemLowId, itemHighId, winnerIsLow } =
                normalizePairWithWinner(winnerId, loserId);

            matchUpdates.push({
                tournamentId,
                itemLowId,
                itemHighId,
                lowWins: winnerIsLow ? cntSign : 0,
                highWins: winnerIsLow ? 0 : cntSign,
                totalMatches: cntSign,
            });

            nextRoundWinners.push(winnerId);
        }

        currentRound = nextRoundWinners;
    }

    const itemUpdates = Array.from(itemUpdatesMap.values());

    return {
        itemUpdates,
        matchUpdates,
    };
}

function normalizePairWithWinner(
    winnerId: number,
    loserId: number,
): { itemLowId: number; itemHighId: number; winnerIsLow: boolean } {
    const itemLowId = winnerId < loserId ? winnerId : loserId;
    const itemHighId = winnerId < loserId ? loserId : winnerId;
    return { itemLowId, itemHighId, winnerIsLow: winnerId === itemLowId };
}
