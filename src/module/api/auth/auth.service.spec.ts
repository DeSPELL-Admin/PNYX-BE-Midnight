import { AuthService } from './auth.service';

describe('AuthService', () => {
    it('issues a nonce using the retained nonce protocol', async () => {
        const nonceService = { issueNonce: jest.fn().mockResolvedValue(true) };
        const response = { cookie: jest.fn() };
        const service = new AuthService(
            {} as never,
            {} as never,
            nonceService as never,
            {} as never,
            {} as never,
        );
        await expect(service.issueNonce(response as never)).resolves.toMatchObject({ nonce: expect.any(String) });
        expect(nonceService.issueNonce).toHaveBeenCalled();
    });
});
