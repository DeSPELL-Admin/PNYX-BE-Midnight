import { AuthController } from './auth.controller';

describe('AuthController', () => {
    it('delegates Midnight verification', async () => {
        const authService = { verifyMidnight: jest.fn().mockResolvedValue({ walletAddress: 'mn_addr', point: 0 }) };
        const controller = new AuthController(authService as never);
        const body = { message: 'message', signedData: 'data', signature: 'signature', verifyingKey: 'key' };
        const request = {};
        const response = {};
        await expect(controller.verifyMidnight(body as never, request as never, response as never)).resolves.toEqual({ walletAddress: 'mn_addr', point: 0 });
        expect(authService.verifyMidnight).toHaveBeenCalledWith(body, request, response);
    });
});
