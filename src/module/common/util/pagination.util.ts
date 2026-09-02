/**
 * @title calculateSkip
 * @notice 페이징 스킵 계산
 * @param page 페이지
 * @param limit 제한
 * @returns number
 * @author IcarusToSun
 */
export function calculateSkip(page: number, limit: number): number {
    return (page - 1) * limit;
}
