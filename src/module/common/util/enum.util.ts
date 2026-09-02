export enum TournamentType {
    EVENT = 'event',
    CLASSIC = 'classic',
}

export enum TournamentPeriod {
    UPCOMING = 'upcoming',
    ONGOING = 'ongoing',
    ENDED = 'ended',
}

export enum TournamentGenre {
    TOURNAMENT = 'tournament',
    BETTING = 'betting',
}

export enum BettingType {
    POINT = 'point',
    USDSC = 'usdsc',
}

export enum BettingStatus {
    ONGOING = 'ONGOING',
    PENDING = 'PENDING',
    REWARDED = 'REWARDED',
}

// Historical betting records may contain these option values.
export enum VoteMessageOption {
    BET = 'bet',
    CANCEL = 'cancel',
    REWARD = 'reward',
}

export enum MidnightOrderStatus {
    CREATED = 'CREATED',
    PAID = 'PAID',
    FULFILLING = 'FULFILLING',
    FULFILLED = 'FULFILLED',
    FAILED = 'FAILED',
}

export enum MidnightOrderStage {
    QUEUED = 'queued',
    REGISTERING = 'registering',
    BUILDING = 'building',
    PROVING = 'proving',
    CONFIRMING = 'confirming',
    DONE = 'done',
}
