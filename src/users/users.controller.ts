import {Controller, Param, Post} from '@nestjs/common';
import {UsersService} from './users.service';
import {ApiParam} from "@nestjs/swagger";

@Controller('users')
export class UsersController {

    constructor(
      private usersService: UsersService
    ) {}

    @Post('get-all')
    async getAll() {
        return await this.usersService.findAll();
    }

    @ApiParam({name: 'username'})
    @Post('get-user/:username')
    async getByUsername(@Param() params) {
        return await this.usersService.findOneByUsernameOrEmail(params.username);
    }

}
