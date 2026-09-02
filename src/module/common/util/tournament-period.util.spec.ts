import { buildPeriodMatchFilter } from './tournament-period.util';
import { TournamentPeriod } from './enum.util';

describe('buildPeriodMatchFilter', () => {
    const now = new Date('2026-06-29T00:00:00.000Z');

    it('returns an empty filter when period is undefined (no filtering)', () => {
        expect(buildPeriodMatchFilter(undefined, now)).toEqual({});
    });

    it('upcoming: startedAt strictly in the future', () => {
        expect(buildPeriodMatchFilter(TournamentPeriod.UPCOMING, now)).toEqual({
            startedAt: { $gt: now },
        });
    });

    it('ended: endedAt at or before now', () => {
        expect(buildPeriodMatchFilter(TournamentPeriod.ENDED, now)).toEqual({
            endedAt: { $lte: now },
        });
    });

    it('ongoing: started (or null) AND not yet ended (or null) — both-null included', () => {
        expect(buildPeriodMatchFilter(TournamentPeriod.ONGOING, now)).toEqual({
            $and: [
                { $or: [{ startedAt: null }, { startedAt: { $lte: now } }] },
                { $or: [{ endedAt: null }, { endedAt: { $gt: now } }] },
            ],
        });
    });

    describe('fieldPrefix', () => {
        it('prefixes every field for a joined sub-document (ongoing)', () => {
            expect(
                buildPeriodMatchFilter(
                    TournamentPeriod.ONGOING,
                    now,
                    'tournament.',
                ),
            ).toEqual({
                $and: [
                    {
                        $or: [
                            { 'tournament.startedAt': null },
                            { 'tournament.startedAt': { $lte: now } },
                        ],
                    },
                    {
                        $or: [
                            { 'tournament.endedAt': null },
                            { 'tournament.endedAt': { $gt: now } },
                        ],
                    },
                ],
            });
        });

        it('prefixes the field for upcoming and ended', () => {
            expect(
                buildPeriodMatchFilter(
                    TournamentPeriod.UPCOMING,
                    now,
                    'tournament.',
                ),
            ).toEqual({ 'tournament.startedAt': { $gt: now } });
            expect(
                buildPeriodMatchFilter(
                    TournamentPeriod.ENDED,
                    now,
                    'tournament.',
                ),
            ).toEqual({ 'tournament.endedAt': { $lte: now } });
        });
    });

    it('uses the exact now instance passed in', () => {
        const filter = buildPeriodMatchFilter(TournamentPeriod.UPCOMING, now);
        expect((filter.startedAt as { $gt: Date }).$gt).toBe(now);
    });
});
