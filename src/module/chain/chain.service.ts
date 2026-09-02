import { BadRequestException, Injectable } from '@nestjs/common';
import { midnightChainId } from 'src/module/midnight/midnight.config';

@Injectable()
export class ChainService {
    getAllSupportedChainIds(): number[] {
        const midnight = midnightChainId();
        return midnight !== null ? [midnight] : [];
    }

    validateChainId(chainId: number): void {
        if (!this.getAllSupportedChainIds().includes(chainId)) {
            throw new BadRequestException('Unsupported chain ID');
        }
    }
}
