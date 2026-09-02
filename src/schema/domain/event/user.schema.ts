import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
    @Prop({ type: String, required: true, lowercase: true, trim: true })
    walletAddress: string;

    @Prop({ type: Number, default: 0 })
    point: number;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ walletAddress: 1 }, { unique: true });
