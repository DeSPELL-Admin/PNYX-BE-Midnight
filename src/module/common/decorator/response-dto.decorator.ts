import { SetMetadata, Type } from '@nestjs/common';

export const RESPONSE_DTO_KEY = 'response_dto';

export const ResponseDto = (dto: Type<unknown>) =>
    SetMetadata(RESPONSE_DTO_KEY, dto);
