import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsString, Matches, MaxLength, Min } from 'class-validator';

export class EscrowBodyDto {
    @ApiProperty({ example: 7 }) @IsInt() @Min(0) readonly tournamentId!: number;
    @ApiProperty({ example: 3 }) @IsInt() @Min(0) readonly itemId!: number;
    @ApiProperty({ description: 'LWA final array — 16/32/64 개', type: [Number] })
    @IsArray()
    @ArrayMinSize(16)
    @ArrayMaxSize(64)
    @IsInt({ each: true })
    readonly bracket!: number[];

    @ApiProperty({ example: '20s:F' }) @IsString() @IsNotEmpty() @MaxLength(32) readonly segment!: string;
    @ApiProperty({ description: 'voteSalt (64 hex)' }) @Matches(/^[0-9a-fA-F]{64}$/) readonly salt!: string;
    @ApiProperty({ description: 'finalizeTournament tx id' }) @IsString() @IsNotEmpty() @MaxLength(128) readonly txId!: string;
}
