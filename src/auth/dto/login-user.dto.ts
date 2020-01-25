import {ApiProperty} from '@nestjs/swagger';

export class LoginUserDto {
    @ApiProperty()
    readonly username: string;
    @ApiProperty()
    readonly password: string;
}
