import { validateSync } from 'class-validator';
import { IsPowerOfTwo } from './is-power-of-two.decorator';

class TestDto {
    @IsPowerOfTwo()
    value: unknown;
}

const validate = (value: unknown) => {
    const dto = new TestDto();
    dto.value = value;
    return validateSync(dto);
};

describe('IsPowerOfTwo', () => {
    it.each([1, 2, 1024, 2 ** 31, 2 ** 40])('accepts %p', (value) => {
        expect(validate(value)).toHaveLength(0);
    });

    it.each([0, -2, 3, 1.5, '4', null, undefined, NaN, Infinity])(
        'rejects %p',
        (value) => {
            expect(validate(value)).toHaveLength(1);
        },
    );

    it('reports the default message', () => {
        const errors = validate(3);
        expect(errors[0].constraints?.isPowerOfTwo).toBe(
            'value must be a power of two',
        );
    });

    // Regression guard: values above 2^32 must not wrap around. The BigInt check
    // correctly rejects 4294967297 (2^32 + 1) as not a power of two.
    it('rejects 2^32 + 1 (no 32-bit wraparound)', () => {
        expect(validate(4294967297)).toHaveLength(1);
    });
});
