import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FindMyPlayInfosQueryDto } from './find-my-play-infos.query.dto';
import { TournamentGenre } from 'src/module/common/util/enum.util';

const build = (plain: Record<string, unknown>) =>
    plainToInstance(FindMyPlayInfosQueryDto, plain);

const invalidProps = async (plain: Record<string, unknown>) =>
    (await validate(build(plain))).map((e) => e.property);

describe('FindMyPlayInfosQueryDto', () => {
    describe('genre: lowercase transform + enum validation', () => {
        it('lowercases an uppercase value into a valid enum member', async () => {
            const dto = build({ genre: 'BETTING' });
            expect(dto.genre).toBe(TournamentGenre.BETTING);
            expect(await validate(dto)).toEqual([]);
        });

        it('accepts each already-lowercase member', async () => {
            expect(await invalidProps({ genre: 'tournament' })).toEqual([]);
            expect(await invalidProps({ genre: 'betting' })).toEqual([]);
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

    describe('inherited pagination', () => {
        it('coerces numeric strings and validates bounds', async () => {
            const dto = build({ page: '2', limit: '50', genre: 'betting' });
            expect(dto.page).toBe(2);
            expect(dto.limit).toBe(50);
            expect(dto.genre).toBe(TournamentGenre.BETTING);
            expect(await validate(dto)).toEqual([]);
        });

        it('rejects a limit above the maximum', async () => {
            expect(await invalidProps({ limit: 101 })).toContain('limit');
        });
    });
});
