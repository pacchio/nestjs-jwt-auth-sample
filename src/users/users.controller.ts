import {Body, Controller, Param, Post, Query} from '@nestjs/common';
import {CreateUserDto} from './dto/create-user.dto';
import {UsersService} from './users.service';
import {ApiParam} from "@nestjs/swagger";

@Controller('users')
export class UsersController {

    constructor(
      private usersService: UsersService
    ) {}

    @Post('register')
    async create(@Body() createUserDto: CreateUserDto) {
        return await this.usersService.create(createUserDto);
    }

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
