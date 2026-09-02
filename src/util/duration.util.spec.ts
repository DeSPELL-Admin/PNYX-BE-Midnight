import { addDuration, durationToMs } from './duration.util';

describe('durationToMs', () => {
    it.each([
        ['500ms', 500],
        ['0ms', 0],
        ['30s', 30_000],
        ['1m', 60_000],
        ['90m', 5_400_000],
        ['1h', 3_600_000],
        ['1d', 86_400_000],
        ['7d', 604_800_000],
        ['10000d', 864_000_000_000],
    ])('parses %s -> %i ms', (input, expected) => {
        expect(durationToMs(input)).toBe(expected);
    });

    it.each([
        ['5S', 5_000],
        ['2H', 7_200_000],
        ['1D', 86_400_000],
    ])('is case-insensitive: %s -> %i ms', (input, expected) => {
        expect(durationToMs(input)).toBe(expected);
    });

    it.each([
        [''],
        ['5'],
        ['ms'],
        ['5w'],
        ['-5s'],
        ['1.5h'],
        ['5 s'],
        [' 5s'],
        ['abc'],
    ])('throws on invalid duration %p', (input) => {
        expect(() => durationToMs(input)).toThrow(`Invalid duration: ${input}`);
    });
});

describe('addDuration', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('adds the parsed duration to the current time', () => {
        jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
        expect(addDuration('1s')).toEqual(new Date(1_001_000));
    });

    it('adds a day to the current time', () => {
        jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
        expect(addDuration('1d')).toEqual(new Date(1_000_000 + 86_400_000));
    });

    it('propagates the parse error for an invalid duration', () => {
        jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
        expect(() => addDuration('nope')).toThrow('Invalid duration: nope');
    });
});
