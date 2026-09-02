export interface SendNotificationParams {
    userAddresses: string[];
    title: string;
    body: string;
    notificationId?: string;
}

export interface NsSendRequest {
    notificationId: string;
    title: string;
    body: string;
    tokens: string[];
}

export interface NsSendResponse {
    successfulTokens: string[];
    invalidTokens: string[];
    rateLimitedTokens: string[];
}

export interface SendNotificationResult {
    notificationId: string;
    successfulCount: number;
    invalidCount: number;
    rateLimitedCount: number;
    failedCount: number;
    skippedByDailyLimitCount: number;
}
