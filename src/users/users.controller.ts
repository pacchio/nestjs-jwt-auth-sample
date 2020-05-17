import {Controller, Delete, Get, HttpException, HttpStatus, Param, Query, Request, UseGuards} from '@nestjs/common';
import {AuthGuard} from '@nestjs/passport';
import {ApiParam, ApiTags} from '@nestjs/swagger';
import {UserInfo} from './interfaces/user-info.interface';
import {UsersService} from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {

    constructor(
      private usersService: UsersService
    ) {}

    @UseGuards(AuthGuard('jwt'))
    @Get('get-all')
    async getAll(@Request() req, @Query('excludeCurrentUser') excludeCurrentUser) {
        console.log(req.user)
        await this.usersService.throwErrorIfNotAdmin(req.user);
        const users = await this.usersService.findAll();
        if (excludeCurrentUser === 'true' && users && req.user) {
            const i = users.findIndex(u => u.username === req.user.username);
            users.splice(i, 1);
        }
        return users;
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('get-user')
    async getUserInfo(@Request() req): Promise<UserInfo> {
        const user = await this.usersService.findOneByUsernameOrEmail(req.user.username);
        if (user) {
            return this.usersService.mapUserToUserInfo(user);
        }
        throw new HttpException('Impossibile recuperare le informazioni utente', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @UseGuards(AuthGuard('jwt'))
    @ApiParam({name: 'id'})
    @Delete('delete/:id')
    async deleteUserById(@Request() req, @Param() params) {
        await this.usersService.throwErrorIfNotAdmin(req.user);
        await this.usersService.deleteUser(params.id);
        return this.usersService.findAll();
    }

}
