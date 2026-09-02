import {
    Controller,
    Get,
    Header,
    Param,
    Res,
    StreamableFile,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileService } from './file.service';
import { DownloadFileByOriginalNameParamDto } from './dto/req/download-file-by-original-name.param.dto';
import { DownloadJsonByOriginalNameResDto } from './dto/res/download-json-by-original-name.res.dto';
import type { Response } from 'express';
import { ResponseDto } from 'src/module/common/decorator/response-dto.decorator';
import { ApiStandardResponse } from 'src/module/common/decorator/swagger.decorator';
import { NoTransform } from 'src/module/common/decorator/no-transform.decorator';

@ApiTags('File')
@Controller('files')
export class FileController {
    constructor(private readonly fileService: FileService) {}

    @NoTransform()
    @Get('/download/json/:originalName')
    @ResponseDto(DownloadJsonByOriginalNameResDto)
    @ApiStandardResponse({
        summary: 'JSON 파일 다운로드',
        description:
            '원본 파일명으로 JSON 파일을 다운로드합니다. 파일이 존재하지 않거나 JSON 형식이 아닌 경우 오류를 반환합니다.',
        successType: DownloadJsonByOriginalNameResDto,
        successDescription: 'JSON 파일 다운로드 성공',
        includeBadRequest: true, // DTO Validation 또는 JSON 형식이 아닌 경우 (400)
        includeNotFound: true, // 파일을 찾을 수 없음 (404)
        includeInternalServerError: true, // GCS 다운로드 또는 JSON 파싱 실패 등 (500)
    })
    @Header('Content-Type', 'application/json')
    @Header('Cache-Control', 'public, max-age=3600')
    async downloadJsonByOriginalName(
        @Param() param: DownloadFileByOriginalNameParamDto,
    ): Promise<DownloadJsonByOriginalNameResDto> {
        return await this.fileService.downloadJsonByOriginalName(
            param.originalName,
        );
    }

    @NoTransform()
    @Get('/download/image/:originalName')
    @ApiStandardResponse({
        summary: '이미지 파일 다운로드',
        description:
            '원본 파일명으로 이미지 파일을 다운로드합니다. 파일이 존재하지 않는 경우 오류를 반환합니다. CORS 및 캐싱 헤더가 설정되어 있습니다.',
        isBinary: true,
        binaryContentType: 'image/*',
        successDescription: '이미지 파일 다운로드 성공',
        includeBadRequest: true, // DTO Validation 또는 이미지 형식이 아닌 경우 (400)
        includeNotFound: true, // 파일을 찾을 수 없음 (404)
        includeInternalServerError: true, // GCS 다운로드 실패 등 (500)
    })
    async downloadImageByOriginalName(
        @Param() param: DownloadFileByOriginalNameParamDto,
        @Res({ passthrough: true }) res: Response,
    ): Promise<StreamableFile> {
        const image = await this.fileService.downloadImageByOriginalName(
            param.originalName,
        );

        res.set({
            'Cross-Origin-Resource-Policy': 'cross-origin', // 외부 도메인 이미지 로딩 허용 (핵심)
            'Access-Control-Allow-Origin': '*', // 일부 fetch 기반 뷰어 대비 (중요)
            'Accept-Ranges': 'bytes', // 썸네일러/미디어 프리뷰 호환
            'Content-Type': image.mimeType,
            'Content-Length': image.buffer.length,
            'Content-Disposition': `inline; filename="${image.fileName}"`,
            'Cache-Control': 'public, max-age=31536000, immutable',
            ETag: `"${Buffer.from(image.fileName + image.buffer.length).toString('base64')}"`,
        });
        res.removeHeader('Content-Security-Policy');
        res.removeHeader('Access-Control-Allow-Credentials');

        return new StreamableFile(image.buffer);
    }
}
