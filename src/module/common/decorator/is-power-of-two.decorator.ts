import {
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
} from 'class-validator';

export function IsPowerOfTwo(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'isPowerOfTwo',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: unknown) {
                    if (typeof value !== 'number') return false;
                    if (!Number.isInteger(value)) return false;

                    // BigInt avoids the 32-bit truncation that `&` applies to
                    // numbers, so values above 2^32 are checked correctly.
                    return (
                        value > 0 &&
                        (BigInt(value) & (BigInt(value) - 1n)) === 0n
                    );
                },
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} must be a power of two`;
                },
            },
        });
    };
}
