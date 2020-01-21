import {Body, Controller, Get, Post, Request, Response, UseGuards} from '@nestjs/common';
import {AuthGuard} from '@nestjs/passport';
import {Response as Res} from 'express';
import {AuthService} from './auth.service';
import {LoginUserDto} from "./dto/login-user.dto";

@Controller('auth')
export class AuthController {

    constructor(
        private readonly authService: AuthService
    ) {}

    @UseGuards(AuthGuard('local'))
    @Post('login')
    async login(@Request() req, @Body() loginUserDto: LoginUserDto) {
        return this.authService.login(req.user);
    }

    @UseGuards(AuthGuard('google'))
    @Get('google')
    googleLogin() {}

    @UseGuards(AuthGuard('google'))
    @Get('google/callback')
    googleCallback(@Request() req, @Response() res: Res) {
        if(req.user.jwt) {
            res.send({message: 'Authentication success', ...req.user});
        } else {
            res.send({message: 'Authentication fail'})
        }
    }
}
