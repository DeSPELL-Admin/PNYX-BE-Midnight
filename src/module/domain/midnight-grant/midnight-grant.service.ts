import { Injectable } from '@nestjs/common';
import { MidnightGrantKey, MidnightGrantRecord, MidnightGrantRepository } from './midnight-grant.repository';

@Injectable()
export class MidnightGrantService {
    constructor(private readonly repo: MidnightGrantRepository) {}

    findOne(key: MidnightGrantKey): Promise<MidnightGrantRecord | null> {
        return this.repo.findOne(key);
    }

    upsert(key: MidnightGrantKey, data: Omit<MidnightGrantRecord, keyof MidnightGrantKey>): Promise<void> {
        return this.repo.upsert(key, data);
    }

    setFinalizeTxId(key: MidnightGrantKey, finalizeTxId: string): Promise<void> {
        return this.repo.setFinalizeTxId(key, finalizeTxId);
    }
}
