import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VotePointManagerRequestDocument =
    HydratedDocument<VotePointManagerRequest>;

@Schema({ timestamps: true })
export class VotePointManagerRequest {
    @Prop({ type: Number, required: true })
    chainId: number;

    @Prop({ type: String, required: true, lowercase: true, trim: true })
    walletAddress: string;

    @Prop({ type: Number, required: true })
    tournamentId: number;

    @Prop({ type: Number, required: true })
    itemId: number;

    // 베팅 금액. bigint-safe 위해 string 저장.
    @Prop({ type: String, required: true })
    amount: string;

    // 베팅 옵션. 타입 미확정(컨트랙트 ABI 확인 후 확정) — 우선 string으로 저장.
    @Prop({ type: String, required: true })
    option: string;

    // On-chain nonce at signing time. Stored as string to stay bigint-safe.
    @Prop({ type: String, required: true, trim: true })
    nonce: string;

    // Signature expiry, Unix seconds as string.
    @Prop({ type: String, required: true, trim: true })
    deadline: string;

    @Prop({ type: String, required: true, trim: true })
    signature: string;
}

export const VotePointManagerRequestSchema = SchemaFactory.createForClass(
    VotePointManagerRequest,
);

// One pending signature per (chain, wallet, nonce) — mirrors the on-chain
// per-user nonce: only one signature can ever consume a given nonce.
VotePointManagerRequestSchema.index(
    { chainId: 1, walletAddress: 1, nonce: 1 },
    { unique: true },
);

// 진행중(PENDING) 베팅 조회용: (지갑, 토너먼트, 아이템)의 최신 서명 1건을 찾는다.
// 위 unique 인덱스는 walletAddress가 접두 필드가 아니라 이 조회를 못 탄다.
VotePointManagerRequestSchema.index({
    walletAddress: 1,
    tournamentId: 1,
    itemId: 1,
    createdAt: -1,
});
