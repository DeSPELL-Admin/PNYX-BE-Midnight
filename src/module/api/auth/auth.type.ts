export interface BaseTokenPayload {
    sub: string;
}

export interface AccessTokenPayload extends BaseTokenPayload {
    tokenType: 'access';
}

export interface RefreshTokenPayload extends BaseTokenPayload {
    tokenType: 'refresh';
    jti: string;
}
