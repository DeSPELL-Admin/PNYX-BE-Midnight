import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ItemDocument = HydratedDocument<Item>;

@Schema({ timestamps: true })
export class Item {
    @Prop({ type: Number, required: true })
    tournamentId: number;

    @Prop({ type: Number, required: true })
    itemId: number;

    @Prop({ type: String, required: true, trim: true })
    name: string;

    @Prop({ type: String, required: true, trim: true })
    imageName: string;

    @Prop({ type: Number })
    firstCount?: number;

    @Prop({ type: Number })
    secondCount?: number;

    @Prop({ type: Number })
    wins?: number;

    @Prop({ type: Number })
    tournamentEntries?: number;

    @Prop({ type: Number })
    totalMatchEntries?: number;

    // 베팅용 총 베팅액. bigint-safe 위해 string 저장.
    @Prop({ type: String })
    totalBetAmount?: string;
}

export const ItemSchema = SchemaFactory.createForClass(Item);

ItemSchema.index({ tournamentId: 1, itemId: 1 }, { unique: true });

ItemSchema.index({
    tournamentId: 1,
    firstCount: -1,
    createdAt: -1,
});
