import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MidnightGrantDocument = HydratedDocument<MidnightGrant>;

/**
 * Midnight eligibility grant — the analogue of TournamentFinalizeRequest (EIP-712 signature).
 * The operator inserted `leaf = eligibilityLeaf(domainTag, userPk, tournamentId, point, deadline)`
 * on-chain (`grantEligibility`, tx `txId`); the user proves membership when finalizing.
 */
@Schema({ timestamps: true })
export class MidnightGrant {
    @Prop({ type: Number, required: true })
    chainId: number;

    // session wallet (mn_addr_…, unshielded bech32m)
    @Prop({ type: String, required: true, lowercase: true, trim: true })
    walletAddress: string;

    @Prop({ type: Number, required: true })
    tournamentId: number;

    // userPublicKey(userSecret) — hex, derived client-side; secret never reaches the server
    @Prop({ type: String, required: true, lowercase: true, trim: true })
    userPk: string;

    @Prop({ type: String, required: true, lowercase: true, trim: true })
    entryItemHexes: string;

    @Prop({ type: String, required: true, lowercase: true, trim: true })
    tournamentDataHash: string;

    @Prop({ type: Number, required: true })
    point: number;

    @Prop({ type: String, required: true, trim: true })
    deadline: string;

    @Prop({ type: String, required: true, lowercase: true, trim: true })
    leaf: string;

    @Prop({ type: String, required: true, trim: true })
    txId: string;

    // set by finalize-confirm once the user's finalizeTournament tx is verified on the indexer
    @Prop({ type: String, required: false, trim: true })
    finalizeTxId?: string;
}

export const MidnightGrantSchema = SchemaFactory.createForClass(MidnightGrant);
MidnightGrantSchema.index({ chainId: 1, walletAddress: 1, tournamentId: 1 }, { unique: true });
