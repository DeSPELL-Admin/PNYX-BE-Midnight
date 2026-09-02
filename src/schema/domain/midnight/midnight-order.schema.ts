import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
    MidnightOrderStage,
    MidnightOrderStatus,
} from 'src/module/common/util/enum.util';

export type MidnightOrderDocument = HydratedDocument<MidnightOrder>;

/**
 * Data-market order for escrowed vote rows. Tracks the full lifecycle from
 * creation through payment to fulfillment (registerBuyer -> sellRows -> license).
 * `querySpec`/`specHash` bind the on-chain license to this order (orderId makes it unique,
 * so a retried `sellRows` hitting `LicenseExists` is this order's own prior success).
 * `datasetJson` preserves the exact delivered bytes — never re-serialize it, or its hash
 * will no longer match `datasetHash`.
 */
@Schema({ timestamps: true })
export class MidnightOrder {
    @Prop({ type: String, required: true, trim: true })
    orderId: string;

    @Prop({ type: Number, required: true })
    chainId: number;

    @Prop({ type: String, required: true, lowercase: true, trim: true })
    buyerAddress: string;

    @Prop({ type: String, required: true, lowercase: true, trim: true })
    buyerPk: string;

    @Prop({ type: Number, required: true })
    tournamentId: number;

    @Prop({ type: Number, required: true })
    rowCount: number;

    @Prop({ type: Number, required: true })
    sampleCountAtOrder: number;

    @Prop({ type: String, required: true, trim: true })
    priceUnits: string;

    @Prop({
        type: String,
        enum: MidnightOrderStatus,
        required: true,
        default: MidnightOrderStatus.CREATED,
    })
    status: MidnightOrderStatus;

    @Prop({
        type: String,
        enum: MidnightOrderStage,
        required: true,
        default: MidnightOrderStage.QUEUED,
    })
    stage: MidnightOrderStage;

    @Prop({ type: String, required: false, trim: true })
    paymentTxId?: string;

    @Prop({ type: String, required: false, trim: true })
    registerBuyerTxId?: string;

    @Prop({ type: String, required: false, trim: true })
    sellTxId?: string;

    // canonical JSON string, verbatim — do not re-parse/re-stringify (byte identity feeds specHash)
    @Prop({ type: String, required: true, trim: true })
    querySpec: string;

    @Prop({ type: String, required: true, lowercase: true, trim: true })
    specHash: string;

    @Prop({ type: String, required: false, trim: true })
    licenseId?: string;

    // canonical dataset JSON, verbatim bytes as delivered — never re-serialize (breaks datasetHash)
    @Prop({ type: String, required: false })
    datasetJson?: string;

    @Prop({ type: String, required: false, lowercase: true, trim: true })
    datasetHash?: string;

    @Prop({ type: Number, required: false })
    deliveredRowCount?: number;

    @Prop({ type: Number, required: false })
    sampleAtSale?: number;

    @Prop({ type: Number, required: true, default: 0 })
    attempts: number;

    @Prop({ type: String, required: false })
    error?: string;
}

export const MidnightOrderSchema = SchemaFactory.createForClass(MidnightOrder);
MidnightOrderSchema.index({ orderId: 1 }, { unique: true });
MidnightOrderSchema.index({ chainId: 1, buyerAddress: 1, createdAt: -1 });
MidnightOrderSchema.index({ status: 1, updatedAt: 1 });
MidnightOrderSchema.index({
    chainId: 1,
    buyerAddress: 1,
    tournamentId: 1,
    status: 1,
});
