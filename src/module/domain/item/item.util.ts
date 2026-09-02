export function pickRandomNumbers(A: number, B: number): number[] {
    const arr = Array.from({ length: A }, (_, i) => i);

    for (let i = 0; i < B; i++) {
        const j = i + Math.floor(Math.random() * (arr.length - i));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr.slice(0, B);
}
