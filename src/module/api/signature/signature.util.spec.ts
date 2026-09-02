import {
    getTournamentDataByteLength,
    hasDuplicateIds,
    isValidBracketByteLength,
    sortedEqual,
} from './signature.util';

describe('signature grant validators', () => {
    it('validates tournament data dimensions and ids', () => {
        expect(getTournamentDataByteLength('0x00010002')).toBe(4);
        expect(isValidBracketByteLength(4)).toBe(true);
        expect(isValidBracketByteLength(3)).toBe(false);
        expect(hasDuplicateIds([1, 2, 1])).toBe(true);
        expect(sortedEqual([2, 1], [1, 2])).toBe(true);
    });
});
