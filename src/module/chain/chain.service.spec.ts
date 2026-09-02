import { ChainService } from './chain.service';

describe('ChainService', () => {
    const env = process.env;
    afterEach(() => { process.env = env; });

    it('exposes only the enabled Midnight chain and validates it', () => {
        process.env.MIDNIGHT_ENABLED = 'true';
        process.env.MIDNIGHT_CHAIN_ID = '99101';
        const service = new ChainService();
        expect(service.getAllSupportedChainIds()).toEqual([99101]);
        expect(() => service.validateChainId(99101)).not.toThrow();
        expect(() => service.validateChainId(1)).toThrow('Unsupported chain ID');
    });

    it('has no supported chains while Midnight is disabled', () => {
        process.env.MIDNIGHT_ENABLED = 'false';
        expect(new ChainService().getAllSupportedChainIds()).toEqual([]);
    });
});
