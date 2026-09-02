/**
 * Snapshot/restore helper for `process.env`. Jest workers share one `process.env`
 * across spec files, and many classes capture env values at construction time, so
 * a spec that mutates env must restore the originals afterwards or it leaks into
 * unrelated specs running later in the same worker.
 *
 * Usage:
 *   const env = snapshotEnv(['MAX_BLOCK_RANGE', 'NODE_ENV']);
 *   beforeAll(env.save);
 *   afterAll(env.restore);
 *   // set process.env.* inside beforeEach / individual tests
 */
export function snapshotEnv(keys: string[]): {
    save: () => void;
    restore: () => void;
} {
    const saved: Record<string, string | undefined> = {};

    return {
        save: () => {
            for (const key of keys) saved[key] = process.env[key];
        },
        restore: () => {
            for (const key of keys) {
                if (saved[key] === undefined) delete process.env[key];
                else process.env[key] = saved[key];
            }
        },
    };
}
