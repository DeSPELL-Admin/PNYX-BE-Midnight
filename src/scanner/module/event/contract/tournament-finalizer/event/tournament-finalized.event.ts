export class TournamentFinalizedEvent {
    timestamp!: number;
    user!: string;
    tournamentDataHash!: string;
    tournamentId!: number;
    tournamentData!: string;
    point!: number;
}
