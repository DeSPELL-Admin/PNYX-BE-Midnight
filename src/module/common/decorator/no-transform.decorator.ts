// no-transform.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const NO_TRANSFORM_KEY = 'noTransform';
export const NoTransform = () => SetMetadata(NO_TRANSFORM_KEY, true);
