import type { Request } from 'express';
import { extractClientIp, extractUserAgent } from './request.util';

function makeReq(headers: Record<string, unknown>, ip?: string): Request {
    return { headers, ip } as unknown as Request;
}

describe('request.util', () => {
    describe('extractUserAgent', () => {
        it('returns the user-agent string when present', () => {
            expect(
                extractUserAgent(makeReq({ 'user-agent': 'Mozilla/5.0' })),
            ).toBe('Mozilla/5.0');
        });

        it('returns null when the header is missing', () => {
            expect(extractUserAgent(makeReq({}))).toBeNull();
        });

        it('returns null for empty or whitespace-only values', () => {
            expect(extractUserAgent(makeReq({ 'user-agent': '' }))).toBeNull();
            expect(
                extractUserAgent(makeReq({ 'user-agent': '   ' })),
            ).toBeNull();
        });

        it('returns null when the header is an array (non-string)', () => {
            expect(
                extractUserAgent(makeReq({ 'user-agent': ['a', 'b'] })),
            ).toBeNull();
        });
    });

    describe('extractClientIp', () => {
        it('returns the single x-forwarded-for value', () => {
            expect(
                extractClientIp(makeReq({ 'x-forwarded-for': '203.0.113.5' })),
            ).toBe('203.0.113.5');
        });

        it('returns the first ip from a comma-separated chain', () => {
            expect(
                extractClientIp(
                    makeReq({
                        'x-forwarded-for':
                            '203.0.113.5, 70.41.3.18, 150.172.238.178',
                    }),
                ),
            ).toBe('203.0.113.5');
        });

        it('trims whitespace around the first forwarded ip', () => {
            expect(
                extractClientIp(
                    makeReq({
                        'x-forwarded-for': '  203.0.113.5 , 70.41.3.18',
                    }),
                ),
            ).toBe('203.0.113.5');
        });

        it('falls back to req.ip when x-forwarded-for is whitespace-only', () => {
            expect(
                extractClientIp(
                    makeReq({ 'x-forwarded-for': '   ' }, '10.0.0.1'),
                ),
            ).toBe('10.0.0.1');
        });

        it('uses req.ip when there is no x-forwarded-for header', () => {
            expect(extractClientIp(makeReq({}, '10.0.0.2'))).toBe('10.0.0.2');
        });

        it('returns null when neither x-forwarded-for nor req.ip exist', () => {
            expect(extractClientIp(makeReq({}, undefined))).toBeNull();
        });
    });
});
