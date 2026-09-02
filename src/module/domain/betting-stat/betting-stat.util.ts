// 베팅 보상 계산.
// reward = floor(0.99 * totalPrize * amount / winItemTotalBetAmount)
//        = (99 * totalPrize * amount) / (100 * winItemTotalBetAmount)
// totalPrize/amount/winItemTotalBetAmount 는 1e18 단위 bigint-safe string 이므로
// double 정밀도 손실을 피하기 위해 BigInt 정수 연산으로 계산한다.
// 양수 BigInt 나눗셈은 0 방향 절삭 = floor 와 동일하다.
export function calculateBettingReward(
    totalPrize: string | null,
    amount: string,
    winItemTotalBetAmount: string | null,
): string | null {
    if (!totalPrize || !winItemTotalBetAmount) {
        return null;
    }

    const prize = BigInt(totalPrize);
    const bet = BigInt(amount);
    const total = BigInt(winItemTotalBetAmount);

    if (bet <= 0n || total <= 0n) {
        return null;
    }

    return ((99n * prize * bet) / (100n * total)).toString();
}
