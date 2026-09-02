import { TournamentPeriod } from './enum.util';

/**
 * 토너먼트 기간(period) 필터에 해당하는 Mongo `$match` 조각을 만든다.
 *
 * 분류 기준(now 기준, 상호 배타·전체 포괄):
 * - upcoming: startedAt > now (시작 시각이 미래)
 * - ended:    endedAt <= now (종료 시각이 과거)
 * - ongoing:  (startedAt null 또는 <= now) AND (endedAt null 또는 > now)
 *             → startedAt/endedAt이 둘 다 null인 경우도 ongoing
 *
 * Mongo 범위 연산자($gt/$lte)는 type-bracketing으로 null을 매칭하지 않으므로,
 * null을 ongoing에 포함시키기 위해 ongoing만 $or로 null을 명시한다.
 *
 * `fieldPrefix`로 직접 컬렉션('')과 조인된 서브문서('tournament.')를 모두 지원한다.
 * period가 undefined면 빈 객체를 반환해 기간 필터를 적용하지 않는다.
 */
export function buildPeriodMatchFilter(
    period: TournamentPeriod | undefined,
    now: Date,
    fieldPrefix = '',
): Record<string, unknown> {
    if (!period) return {};

    const startedAt = `${fieldPrefix}startedAt`;
    const endedAt = `${fieldPrefix}endedAt`;

    switch (period) {
        case TournamentPeriod.UPCOMING:
            return { [startedAt]: { $gt: now } };
        case TournamentPeriod.ENDED:
            return { [endedAt]: { $lte: now } };
        case TournamentPeriod.ONGOING:
            return {
                $and: [
                    {
                        $or: [
                            { [startedAt]: null },
                            { [startedAt]: { $lte: now } },
                        ],
                    },
                    {
                        $or: [{ [endedAt]: null }, { [endedAt]: { $gt: now } }],
                    },
                ],
            };
    }
}
