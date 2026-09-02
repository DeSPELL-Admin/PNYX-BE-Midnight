import { HealthController } from './health.controller';

describe('HealthController', () => {
    it('reports readiness from MongoDB only', () => {
        const mongo = { isConnected: jest.fn().mockReturnValue(true) };
        const controller = new HealthController(mongo as never);
        expect(controller.health()).toBe('ok');
        expect(controller.ready()).toBe('ok');
        mongo.isConnected.mockReturnValue(false);
        expect(controller.ready()).toBe('not-ready');
    });
});
