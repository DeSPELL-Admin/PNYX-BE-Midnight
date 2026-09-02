import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MatchDocument = HydratedDocument<Match>;

@Schema({ timestamps: true })
export class Match {
    @Prop({ type: Number, required: true })
    tournamentId: number;

    @Prop({ type: Number, required: true })
    itemLowId: number;

    @Prop({ type: Number, required: true })
    itemHighId: number;

    @Prop({ type: Number, default: 0 })
    lowWins: number;

    @Prop({ type: Number, default: 0 })
    highWins: number;

    @Prop({ type: Number, default: 0 })
    totalMatches: number;
}

export const MatchSchema = SchemaFactory.createForClass(Match);

MatchSchema.index(
    { tournamentId: 1, itemLowId: 1, itemHighId: 1 },
    { unique: true },
);

MatchSchema.index({
    tournamentId: 1,
    itemHighId: 1,
    createdAt: -1,
});
