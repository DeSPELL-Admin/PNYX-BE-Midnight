import { NotificationTokenService } from './notification-token.service';

const setup = () => {
    const repository = {
        upsert: jest.fn().mockResolvedValue(undefined),
        disable: jest.fn().mockResolvedValue(undefined),
        softDeleteByUser: jest.fn().mockResolvedValue(undefined),
        softDeleteByToken: jest.fn().mockResolvedValue(undefined),
        findActiveTokens: jest.fn().mockResolvedValue([]),
    };
    const service = new NotificationTokenService(repository as never);
    return { service, repository };
};

describe('NotificationTokenService', () => {
    it('saveOrRotate 는 userAddress 를 소문자로 정규화하여 저장한다', async () => {
        const { service, repository } = setup();

        await service.saveOrRotate({
            userAddress: '0xABCdef',
            token: 'tok',
            notificationUrl: 'https://ns/send',
        });

        expect(repository.upsert).toHaveBeenCalledWith({
            userAddress: '0xabcdef',
            token: 'tok',
            notificationUrl: 'https://ns/send',
        });
    });

    it('disable 은 소문자 주소로 위임한다', async () => {
        const { service, repository } = setup();

        await service.disable('0xABC');

        expect(repository.disable).toHaveBeenCalledWith('0xabc');
    });

    it('remove 는 소문자 주소로 softDelete 한다', async () => {
        const { service, repository } = setup();

        await service.remove('0xABC');

        expect(repository.softDeleteByUser).toHaveBeenCalledWith('0xabc');
    });

    it('getActiveTokens 는 모든 주소를 소문자로 정규화하여 조회한다', async () => {
        const { service, repository } = setup();

        await service.getActiveTokens(['0xAAA', '0xBbB']);

        expect(repository.findActiveTokens).toHaveBeenCalledWith([
            '0xaaa',
            '0xbbb',
        ]);
    });

    it('removeByToken 은 토큰 값으로 위임한다', async () => {
        const { service, repository } = setup();

        await service.removeByToken('tok-x');

        expect(repository.softDeleteByToken).toHaveBeenCalledWith('tok-x');
    });
});
