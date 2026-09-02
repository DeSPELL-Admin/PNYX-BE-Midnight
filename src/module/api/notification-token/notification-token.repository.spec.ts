import { NotificationTokenRepository } from './notification-token.repository';

const setup = () => {
    const lean = jest.fn().mockResolvedValue([]);
    const select = jest.fn().mockReturnValue({ lean });
    const find = jest.fn().mockReturnValue({ select });
    const model = {
        find,
        updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
    };
    const repository = new NotificationTokenRepository(model as never);
    return { repository, model, find, select, lean };
};

describe('NotificationTokenRepository', () => {
    describe('findActiveTokens', () => {
        it('주소 목록이 비어있으면 DB 조회 없이 빈 배열을 반환한다', async () => {
            const { repository, find } = setup();

            const result = await repository.findActiveTokens([]);

            expect(result).toEqual([]);
            expect(find).not.toHaveBeenCalled();
        });

        it('enabled=true, deletedAt=null 조건으로 조회하고 query-result 형태로 매핑한다', async () => {
            const { repository, find, select, lean } = setup();
            lean.mockResolvedValue([
                {
                    userAddress: '0xa',
                    token: 't1',
                    notificationUrl: 'u1',
                },
            ]);

            const result = await repository.findActiveTokens(['0xa']);

            expect(result).toEqual([
                { userAddress: '0xa', token: 't1', notificationUrl: 'u1' },
            ]);

            const filter = find.mock.calls[0][0];
            expect(filter.enabled).toBe(true);
            expect(filter.deletedAt).toBeNull();
            expect(filter.userAddress).toEqual({ $in: ['0xa'] });
            expect(select).toHaveBeenCalledWith(
                'userAddress token notificationUrl -_id',
            );
        });
    });

    describe('upsert', () => {
        it('user_address 기준 upsert 하며 enabled=true, deletedAt=null 로 되살린다', async () => {
            const { repository, model } = setup();

            await repository.upsert({
                userAddress: '0xa',
                token: 'tok',
                notificationUrl: 'https://ns/send',
            });

            expect(model.updateOne).toHaveBeenCalledWith(
                { userAddress: '0xa' },
                {
                    $set: {
                        token: 'tok',
                        notificationUrl: 'https://ns/send',
                        enabled: true,
                        deletedAt: null,
                    },
                },
                { upsert: true, setDefaultsOnInsert: true },
            );
        });
    });

    describe('disable', () => {
        it('enabled=false 로 갱신한다', async () => {
            const { repository, model } = setup();

            await repository.disable('0xa');

            expect(model.updateOne).toHaveBeenCalledWith(
                { userAddress: '0xa' },
                { $set: { enabled: false } },
            );
        });
    });

    describe('softDelete', () => {
        it('softDeleteByUser 는 userAddress 로 deletedAt 을 설정한다', async () => {
            const { repository, model } = setup();

            await repository.softDeleteByUser('0xa');

            const [filter, update] = model.updateOne.mock.calls[0];
            expect(filter).toEqual({ userAddress: '0xa' });
            expect(update.$set.deletedAt).toBeInstanceOf(Date);
        });

        it('softDeleteByToken 은 token 으로 deletedAt 을 설정한다', async () => {
            const { repository, model } = setup();

            await repository.softDeleteByToken('tok-x');

            const [filter, update] = model.updateOne.mock.calls[0];
            expect(filter).toEqual({ token: 'tok-x' });
            expect(update.$set.deletedAt).toBeInstanceOf(Date);
        });
    });
});
