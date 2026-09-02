import dotenv from 'dotenv';
dotenv.config();

export function getEnv(key: string): string {
    const value = process.env[key];

    if (!value) {
        throw new Error(`Missing env: ${key}`);
    }

    return value;
}
