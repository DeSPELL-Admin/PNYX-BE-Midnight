import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class FinalizeConfirmBodyDto {
    @ApiProperty({ example: 7 }) @IsInt() @Min(0) readonly tournamentId!: number;
    @ApiProperty({ description: 'finalizeTournament tx id (indexer identifier)' }) @IsString() @IsNotEmpty() @MaxLength(128) readonly txId!: string;
}
