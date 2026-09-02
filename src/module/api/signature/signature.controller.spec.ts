import { SignatureController } from './signature.controller';

describe('SignatureController', () => {
    it('validates the Midnight chain and delegates the finalize grant', async () => {
        const signatureService = { getTournamentFinalizeSignature: jest.fn().mockResolvedValue({ exists: false }) };
        const chainService = { validateChainId: jest.fn() };
        const controller = new SignatureController(signatureService as never, chainService as never);
        await expect(controller.getTournamentFinalizeSignature(
            { chainId: 99101 }, 'MN_ADDR',
            { tournamentId: 7, tournamentData: '0x00010002', userPk: 'a'.repeat(64) },
        )).resolves.toEqual({ exists: false });
        expect(chainService.validateChainId).toHaveBeenCalledWith(99101);
        expect(signatureService.getTournamentFinalizeSignature).toHaveBeenCalledWith(99101, 'mn_addr', 7, '0x00010002', 'a'.repeat(64));
    });
});
