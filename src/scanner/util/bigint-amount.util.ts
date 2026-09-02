/**
 * bigint-safe string 금액 필드(betting-stat.amount, item.totalBetAmount,
 * tournament.totalPrize 등)에 부호 있는 델타를 누적한다. Mongo `$inc`는 number
 * 전용이라 문자열 금액에는 쓸 수 없으므로 트랜잭션 내 read-modify-write로 계산한다.
 *
 * 결과가 음수면 던진다(누적 금액이 음수가 되는 것은 정합성 오류). 정상 흐름에서는
 * 서명 단계가 cancel 금액 <= 기존 금액을 보장하므로 발생하지 않는다.
 */
export function addSignedAmount(current: string, delta: string): string {
    const result = BigInt(current) + BigInt(delta);

    if (result < 0n) {
        throw new Error(
            `amount underflow: ${current} + ${delta} results in a negative value`,
        );
    }

    return result.toString();
}


