import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MidnightEscrowDocument = HydratedDocument<MidnightEscrow>;

/**
 * Escrowed vote row for the data market — every vote is escrowed and sellable.
 * `(tournamentId, itemId, segment, salt)` opens the on-chain `voteCommitment`.
 */
@Schema({ timestamps: true })
export class MidnightEscrow {
    @Prop({ type: Number, required: true })
    chainId: number;

    @Prop({ type: String, required: true, lowercase: true, trim: true })
    walletAddress: string;

    @Prop({ type: Number, required: true })
    tournamentId: number;

    @Prop({ type: Number, required: true })
    itemId: number;

    @Prop({ type: String, required: true, trim: true })
    segment: string;

    /** LWA final array (선택 전체) — 커밋의 bracketHash 를 여는 원문. B-design 판매 파일에 포함된다. */
    @Prop({ type: [Number], required: true, default: [] })
    bracket: number[];

    @Prop({ type: String, required: true, lowercase: true, trim: true })
    salt: string;

    @Prop({ type: String, required: true, trim: true })
    txId: string;
}

export const MidnightEscrowSchema = SchemaFactory.createForClass(MidnightEscrow);
MidnightEscrowSchema.index({ chainId: 1, walletAddress: 1, tournamentId: 1 }, { unique: true });
MidnightEscrowSchema.index({ chainId: 1, tournamentId: 1 });
