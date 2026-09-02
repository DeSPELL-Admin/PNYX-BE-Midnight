import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FindMyTournamentsQueryDto } from './find-my-tournaments.query.dto';
import {
    TournamentGenre,
    TournamentPeriod,
    TournamentType,
} from 'src/module/common/util/enum.util';

const build = (plain: Record<string, unknown>) =>
    plainToInstance(FindMyTournamentsQueryDto, plain);

const invalidProps = async (plain: Record<string, unknown>) =>
    (await validate(build(plain))).map((e) => e.property);

describe('FindMyTournamentsQueryDto', () => {
    describe('type: lowercase transform + enum validation', () => {
        it('lowercases an uppercase value into a valid enum member', async () => {
            const dto = build({ type: 'EVENT' });
            expect(dto.type).toBe(TournamentType.EVENT);
            expect(await validate(dto)).toEqual([]);
        });

        it('accepts an already-lowercase value', async () => {
            expect(await invalidProps({ type: 'classic' })).toEqual([]);
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
        });
    });

    describe('period: lowercase transform + enum validation', () => {
        it('lowercases an uppercase value into a valid enum member', async () => {
            const dto = build({ period: 'ENDED' });
            expect(dto.period).toBe(TournamentPeriod.ENDED);
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
        });
    });

    describe('genre: lowercase transform + enum validation', () => {
        it('lowercases an uppercase value into a valid enum member', async () => {
            const dto = build({ genre: 'BETTING' });
            expect(dto.genre).toBe(TournamentGenre.BETTING);
            expect(await validate(dto)).toEqual([]);
        });

        it('accepts an already-lowercase value', async () => {
            expect(await invalidProps({ genre: 'betting' })).toEqual([]);
            expect(await invalidProps({ genre: 'tournament' })).toEqual([]);
        });

        it('rejects an unknown value', async () => {
            expect(await invalidProps({ genre: 'foo' })).toContain('genre');
        });

        it('defaults an omitted genre to tournament (valid)', async () => {
            const dto = build({});
            expect(dto.genre).toBe(TournamentGenre.TOURNAMENT);
            expect(await validate(dto)).toEqual([]);
        });

        it('rejects non-string input without throwing inside the transform', async () => {
            expect(await invalidProps({ genre: 123 })).toContain('genre');
        });
    });

    it('inherits pagination from the base dto and accepts period together', async () => {
        const dto = build({
            page: 3,
            limit: 10,
            type: 'event',
            period: 'upcoming',
        });
        expect(await validate(dto)).toEqual([]);
        expect(dto.page).toBe(3);
        expect(dto.limit).toBe(10);
        expect(dto.type).toBe(TournamentType.EVENT);
        expect(dto.period).toBe(TournamentPeriod.UPCOMING);
    });
});
