import { BadRequestException } from '@nestjs/common';
import { validateNotificationContent } from './notification-content.validator';

const baseParams = {
    title: 'Daily reward ready',
    body: 'Your reward is waiting in the app.',
};

describe('validateNotificationContent', () => {
    it('정책을 만족하는 콘텐츠는 통과한다', () => {
        expect(() => validateNotificationContent(baseParams)).not.toThrow();
    });

    it('약어(USDC 등)는 all-caps 예외로 허용한다', () => {
        expect(() =>
            validateNotificationContent({
                ...baseParams,
                body: 'You earned 5 USDC in ETH rewards',
            }),
        ).not.toThrow();
    });

    it('title 이 32자를 초과하면 거부한다', () => {
        expect(() =>
            validateNotificationContent({
                ...baseParams,
                title: 'x'.repeat(33),
            }),
        ).toThrow(BadRequestException);
    });

    it('body 가 128자를 초과하면 거부한다', () => {
        expect(() =>
            validateNotificationContent({
                ...baseParams,
                body: 'y'.repeat(129),
            }),
        ).toThrow(BadRequestException);
    });

    it('title 의 이모지가 2개 이상이면 거부한다', () => {
        expect(() =>
            validateNotificationContent({
                ...baseParams,
                title: 'Reward 🎉🎉',
            }),
        ).toThrow(BadRequestException);
    });

    it('느낌표가 2개 이상이면 거부한다', () => {
        expect(() =>
            validateNotificationContent({
                ...baseParams,
                title: 'Hurry!',
                body: 'Last chance!',
            }),
        ).toThrow(BadRequestException);
    });

    it('허용 목록에 없는 all-caps 단어는 거부한다', () => {
        expect(() =>
            validateNotificationContent({
                ...baseParams,
                body: 'THIS IS SHOUTING',
            }),
        ).toThrow(BadRequestException);
    });

    it('허용 목록에 없는 약어(BTC)는 거부한다', () => {
        expect(() =>
            validateNotificationContent({
                ...baseParams,
                body: 'You earned 5 BTC today',
            }),
        ).toThrow(BadRequestException);
    });
});
