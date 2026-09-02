import { getAllowedOrigins } from './allowed-origins.config';
import { snapshotEnv } from '../test-utils/env';

const env = snapshotEnv(['ALLOWED_ORIGINS']);

describe('getAllowedOrigins', () => {
    beforeAll(env.save);
    afterAll(env.restore);

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('splits a pipe-separated list into individual origins', () => {
        process.env.ALLOWED_ORIGINS = 'https://a.com|https://b.com';
        expect(getAllowedOrigins()).toEqual(['https://a.com', 'https://b.com']);
    });

    it('trims surrounding whitespace around each origin', () => {
        process.env.ALLOWED_ORIGINS = ' https://a.com | https://b.com ';
        expect(getAllowedOrigins()).toEqual(['https://a.com', 'https://b.com']);
    });

    it('drops empty segments produced by consecutive delimiters', () => {
        process.env.ALLOWED_ORIGINS = 'https://a.com||https://b.com|';
        expect(getAllowedOrigins()).toEqual(['https://a.com', 'https://b.com']);
    });

    it('returns a single-element array for one origin', () => {
        process.env.ALLOWED_ORIGINS = 'https://a.com';
        expect(getAllowedOrigins()).toEqual(['https://a.com']);
    });

    it('throws when ALLOWED_ORIGINS is an empty string', () => {
        process.env.ALLOWED_ORIGINS = '';
        expect(() => getAllowedOrigins()).toThrow(
            'Missing env: ALLOWED_ORIGINS',
        );
    });

    it('throws when ALLOWED_ORIGINS is missing', () => {
        delete process.env.ALLOWED_ORIGINS;
        expect(() => getAllowedOrigins()).toThrow(
            'Missing env: ALLOWED_ORIGINS',
        );
    });
});
