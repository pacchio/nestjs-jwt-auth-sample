import {ApiProperty} from '@nestjs/swagger';

export class CreateCatDto {
    @ApiProperty()
    readonly name: string;
    @ApiProperty()
    readonly gender: string;
}
