import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
    BettingType,
    TournamentGenre,
    TournamentType,
} from 'src/module/common/util/enum.util';

export type TournamentDocument = HydratedDocument<Tournament>;

@Schema({ timestamps: true })
export class Tournament {
    @Prop({ type: String, required: true })
    category: string;

    @Prop({ type: Number, required: true })
    tournamentId: number;

    @Prop({ type: String, required: true })
    title: string;

    @Prop({
        type: String,
        enum: TournamentType,
        required: true,
        default: TournamentType.CLASSIC,
    })
    type: TournamentType;

    @Prop({ type: Number, default: 0 })
    selectedCount: number;

    @Prop({
        type: String,
        enum: TournamentGenre,
        required: true,
        default: TournamentGenre.TOURNAMENT,
    })
    genre: TournamentGenre;

    @Prop({ type: Date, default: null })
    startedAt: Date | null;

    @Prop({ type: Date, default: null })
    endedAt: Date | null;

    // 이벤트 토너먼트가 지급하는 포인트량.
    @Prop({ type: Number })
    point?: number;

    // 베팅용 총 상금 풀. bigint-safe 위해 string 저장.
    @Prop({ type: String })
    totalPrize?: string;

    // 베팅용 최소 베팅 금액. bigint-safe 위해 string 저장.
    @Prop({ type: String })
    minBetAmount?: string;

    // 베팅 화폐 종류.
    @Prop({ type: String, enum: BettingType })
    bettingType?: BettingType;

    // 베팅 우승 아이템.
    @Prop({ type: Number, default: null })
    winItemId?: number | null;
}

export const TournamentSchema = SchemaFactory.createForClass(Tournament);

TournamentSchema.index({ tournamentId: 1 }, { unique: true });

// period(startedAt/endedAt) 필터를 정렬 키 뒤(ESR)에 붙여, 정렬은 인덱스로
// 처리하고 기간 불일치 문서는 FETCH 없이 인덱스 키 필터로 제거한다.
// upcoming은 startedAt, ended는 endedAt, ongoing은 둘 다 사용하므로 두 필드를 함께 둔다.
TournamentSchema.index({
    type: 1,
    selectedCount: -1,
    createdAt: -1,
    startedAt: 1,
    endedAt: 1,
});

TournamentSchema.index({ type: 1, createdAt: -1, startedAt: 1, endedAt: 1 });

TournamentSchema.index({
    category: 1,
    type: 1,
    selectedCount: -1,
    createdAt: -1,
    startedAt: 1,
    endedAt: 1,
});

TournamentSchema.index({
    category: 1,
    type: 1,
    createdAt: -1,
    startedAt: 1,
    endedAt: 1,
});
