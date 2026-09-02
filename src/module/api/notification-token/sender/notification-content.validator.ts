import { BadRequestException } from '@nestjs/common';

export const TITLE_MAX_LENGTH = 32;
export const BODY_MAX_LENGTH = 128;
export const MAX_EMOJI_PER_FIELD = 1;
export const MAX_EXCLAMATION_TOTAL = 1;

// 정책상 all-caps 금지의 예외로 허용되는 약어 목록 (문서 기준: ETH, USDC, NFT)
const ALLOWED_UPPERCASE_TOKENS = new Set(['ETH', 'USDC', 'NFT']);

const EMOJI_REGEX = /\p{Extended_Pictographic}/gu;
const UPPERCASE_WORD_REGEX = /[A-Z]{2,}/g;

export interface ValidateContentParams {
    title: string;
    body: string;
}

function countMatches(value: string, regex: RegExp): number {
    const matches = value.match(regex);
    return matches ? matches.length : 0;
}

function assertNoDisallowedAllCaps(field: string, value: string): void {
    const uppercaseWords = value.match(UPPERCASE_WORD_REGEX) ?? [];
    const violating = uppercaseWords.filter(
        (word) => !ALLOWED_UPPERCASE_TOKENS.has(word),
    );
    if (violating.length > 0) {
        throw new BadRequestException(
            `${field} contains disallowed all-caps text: ${violating.join(', ')}`,
        );
    }
}

export function validateNotificationContent(
    params: ValidateContentParams,
): void {
    const { title, body } = params;

    if (title.length === 0 || title.length > TITLE_MAX_LENGTH) {
        throw new BadRequestException(
            `title must be between 1 and ${TITLE_MAX_LENGTH} characters`,
        );
    }
    if (body.length === 0 || body.length > BODY_MAX_LENGTH) {
        throw new BadRequestException(
            `body must be between 1 and ${BODY_MAX_LENGTH} characters`,
        );
    }

    if (countMatches(title, EMOJI_REGEX) > MAX_EMOJI_PER_FIELD) {
        throw new BadRequestException(
            `title may contain at most ${MAX_EMOJI_PER_FIELD} emoji`,
        );
    }
    if (countMatches(body, EMOJI_REGEX) > MAX_EMOJI_PER_FIELD) {
        throw new BadRequestException(
            `body may contain at most ${MAX_EMOJI_PER_FIELD} emoji`,
        );
    }

    const exclamationCount =
        countMatches(title, /!/g) + countMatches(body, /!/g);
    if (exclamationCount > MAX_EXCLAMATION_TOTAL) {
        throw new BadRequestException(
            `notification may contain at most ${MAX_EXCLAMATION_TOTAL} exclamation mark`,
        );
    }

    assertNoDisallowedAllCaps('title', title);
    assertNoDisallowedAllCaps('body', body);
}
