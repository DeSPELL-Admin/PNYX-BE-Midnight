import { TournamentType } from 'src/module/common/util/enum.util';

export class FindTypeAndPointByIdQueryResult {
    readonly type!: TournamentType;
    readonly point?: number;
}
