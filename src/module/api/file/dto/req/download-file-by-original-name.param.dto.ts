// download-image.param.dto.ts
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DownloadFileByOriginalNameParamDto {
    @ApiProperty({
        description:
            '원본 파일명 (영문, 숫자, 점, 하이픈, 공백만 허용, 최대 255자)',
        example: 'example-file.json',
        type: String,
        maxLength: 255,
        pattern: '^[\\w.\\-\\s]+$',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    @Matches(/^[\w.\-\s]+$/, {
        message: 'originalName contains invalid characters',
    })
    @Transform(({ value }) => safeDecodeAndTrim(value))
    readonly originalName!: string;
}

/** 잘못된 퍼센트 인코딩 대비 안전 디코드 */
function safeDecodeAndTrim(val: unknown): string {
    const s = typeof val === 'string' ? val : '';
    try {
        return decodeURIComponent(s).trim();
    } catch {
        // 잘못된 인코딩이면 그대로 trim만
        return s.trim();
    }
}
