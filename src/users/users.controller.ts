import {Controller, Param, Post, UseGuards} from '@nestjs/common';
import {UsersService} from './users.service';
import {ApiParam, ApiTags} from "@nestjs/swagger";
import {AuthGuard} from "@nestjs/passport";

@ApiTags('Users')
@Controller('users')
export class UsersController {

    constructor(
      private usersService: UsersService
    ) {}

    @UseGuards(AuthGuard('jwt'))
    @Post('get-all')
    async getAll() {
        return await this.usersService.findAll();
    }

    @UseGuards(AuthGuard('jwt'))
    @ApiParam({name: 'username'})
    @Post('get-user/:username')
    async getByUsername(@Param() params) {
        return await this.usersService.findOneByUsernameOrEmail(params.username);
    }

}
