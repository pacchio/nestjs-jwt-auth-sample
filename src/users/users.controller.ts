import {Body, Controller, Post} from '@nestjs/common';
import {CreateUserDto} from './dto/create-user.dto';
import {UsersService} from './users.service';

@Controller('users')
export class UsersController {

    constructor(
      private usersService: UsersService
    ) {}

    @Post('register')
    async create(@Body() createUserDto: CreateUserDto) {
        return await this.usersService.create(createUserDto);
    }

}
