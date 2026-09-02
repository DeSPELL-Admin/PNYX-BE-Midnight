import { SignatureService } from './signature.service';

describe('SignatureService', () => {
    it('requires a Midnight public key for a finalize grant', async () => {
        const service = new SignatureService(
            {} as never, {} as never, {} as never, {} as never, {} as never, {} as never,
        );
        await expect(service.getTournamentFinalizeSignature(99101, 'mn_addr', 1, '0x0001')).rejects.toThrow('userPk is required on Midnight');
    });
});
