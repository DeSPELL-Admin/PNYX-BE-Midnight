export interface ApiResponse<T> {
    success: boolean;
    data: T;
    meta: {
        timestamp: string;
    };
}

export interface PaginationData {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export interface PaginatedApiResponse<T> {
    success: boolean;
    data: T[];
    pagination: PaginationData;
    meta: {
        timestamp: string;
    };
}

export interface PaginationResult<T> {
    data: T[];
    page: number;
    limit: number;
    total: number;
}

export function createPaginationData(
    page: number,
    limit: number,
    total: number,
): PaginationData {
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;
    return {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
    };
}
