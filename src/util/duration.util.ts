const DURATION_REGEX = /^(\d+)(ms|s|m|h|d)$/i;

export function durationToMs(value: string): number {
    const match = DURATION_REGEX.exec(value);

    if (!match) {
        throw new Error(`Invalid duration: ${value}`);
    }

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
        case 'ms':
            return amount;
        case 's':
            return amount * 1000;
        case 'm':
            return amount * 60_000;
        case 'h':
            return amount * 3_600_000;
        case 'd':
            return amount * 86_400_000;
        default:
            throw new Error(`Unsupported duration unit: ${unit}`);
    }
}

export function addDuration(value: string): Date {
    return new Date(Date.now() + durationToMs(value));
}
