import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FindTournamentsQueryDto } from './find-tournaments.query.dto';
import {
    TournamentPeriod,
    TournamentType,
} from 'src/module/common/util/enum.util';
import { SortTournamentsType } from '../../tournament.util';

const build = (plain: Record<string, unknown>) =>
    plainToInstance(FindTournamentsQueryDto, plain);

const invalidProps = async (plain: Record<string, unknown>) =>
    (await validate(build(plain))).map((e) => e.property);

describe('FindTournamentsQueryDto', () => {
    describe('type: lowercase transform + enum validation', () => {
        it('lowercases an uppercase value into a valid enum member', async () => {
            const dto = build({ type: 'CLASSIC' });
            expect(dto.type).toBe(TournamentType.CLASSIC);
            expect(await validate(dto)).toEqual([]);
        });

        it('lowercases a mixed-case value', async () => {
            const dto = build({ type: 'Event' });
            expect(dto.type).toBe(TournamentType.EVENT);
            expect(await validate(dto)).toEqual([]);
        });

        it('accepts an already-lowercase value', async () => {
            expect(await invalidProps({ type: 'event' })).toEqual([]);
        });

        it('rejects an unknown value', async () => {
            expect(await invalidProps({ type: 'foo' })).toContain('type');
        });

        it('defaults an omitted type to classic (valid)', async () => {
            const dto = build({});
            expect(dto.type).toBe(TournamentType.CLASSIC);
            expect(await validate(dto)).toEqual([]);
        });

        it('rejects non-string input without throwing inside the transform', async () => {
            expect(await invalidProps({ type: 123 })).toContain('type');
            expect(
                await invalidProps({ type: ['event', 'classic'] }),
            ).toContain('type');
        });
    });

    describe('period: lowercase transform + enum validation', () => {
        it('lowercases an uppercase value into a valid enum member', async () => {
            const dto = build({ period: 'UPCOMING' });
            expect(dto.period).toBe(TournamentPeriod.UPCOMING);
            expect(await validate(dto)).toEqual([]);
        });

        it('lowercases a mixed-case value', async () => {
            const dto = build({ period: 'Ongoing' });
            expect(dto.period).toBe(TournamentPeriod.ONGOING);
            expect(await validate(dto)).toEqual([]);
        });

        it('accepts each already-lowercase member', async () => {
            expect(await invalidProps({ period: 'upcoming' })).toEqual([]);
            expect(await invalidProps({ period: 'ongoing' })).toEqual([]);
            expect(await invalidProps({ period: 'ended' })).toEqual([]);
        });

        it('rejects an unknown value', async () => {
            expect(await invalidProps({ period: 'foo' })).toContain('period');
        });

        it('defaults an omitted period to ongoing (valid)', async () => {
            const dto = build({});
            expect(dto.period).toBe(TournamentPeriod.ONGOING);
            expect(await validate(dto)).toEqual([]);
        });

        it('rejects non-string input without throwing inside the transform', async () => {
            expect(await invalidProps({ period: 123 })).toContain('period');
            expect(await invalidProps({ period: ['upcoming'] })).toContain(
                'period',
            );
        });
    });

    it('inherits pagination and orderBy from the base dto and accepts period together', async () => {
        const dto = build({
            page: 2,
            limit: 50,
            orderBy: SortTournamentsType.LATEST,
            type: 'classic',
            period: 'ended',
        });
        expect(await validate(dto)).toEqual([]);
        expect(dto.page).toBe(2);
        expect(dto.limit).toBe(50);
        expect(dto.orderBy).toBe(SortTournamentsType.LATEST);
        expect(dto.type).toBe(TournamentType.CLASSIC);
        expect(dto.period).toBe(TournamentPeriod.ENDED);
    });
});
