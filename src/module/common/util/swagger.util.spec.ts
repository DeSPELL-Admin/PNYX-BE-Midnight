import { getStandardErrorResponseSchema } from './swagger.util';

describe('getStandardErrorResponseSchema', () => {
    it('embeds the provided message as the message example', () => {
        const schema = getStandardErrorResponseSchema('Not Found');

        expect(schema.properties.message.example).toBe('Not Found');
    });

    it('describes a failed response: success=false and data is null type', () => {
        const schema = getStandardErrorResponseSchema('Bad Request');

        expect(schema.type).toBe('object');
        expect(schema.properties.success.example).toBe(false);
        expect(schema.properties.data.type).toBe('null');
    });

    it('exposes a meta.errorCode enum including the known error codes', () => {
        const schema = getStandardErrorResponseSchema('whatever');

        const errorCode = schema.properties.meta.properties.errorCode;
        expect(errorCode.enum).toEqual(
            expect.arrayContaining([
                'VALIDATION_ERROR',
                'MONGO_VALIDATION_ERROR',
                'MONGO_DUPLICATE_KEY',
                'MONGO_WRITE_CONFLICT',
            ]),
        );
    });

    it('reflects a different message on every call', () => {
        expect(
            getStandardErrorResponseSchema('First').properties.message.example,
        ).toBe('First');
        expect(
            getStandardErrorResponseSchema('Second').properties.message.example,
        ).toBe('Second');
    });
});
