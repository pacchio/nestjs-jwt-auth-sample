import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpException,
    HttpStatus,
    Param,
    Post,
    Request,
    Response,
    UseGuards
} from '@nestjs/common';
import {AuthGuard} from '@nestjs/passport';
import {ApiParam, ApiTags} from '@nestjs/swagger';
import {Response as Res} from 'express';
import {CreateUserDto} from '../users/dto/create-user.dto';
import {UserInfo} from '../users/interfaces/user-info.interface';
import {UsersService} from '../users/users.service';
import {AuthService} from './auth.service';
import {LoginUserDto} from './dto/login-user.dto';
import {ResetPasswordDto} from './dto/reset-password.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {

    constructor(
        private authService: AuthService,
        private userService: UsersService
    ) {}

    @UseGuards(AuthGuard('local'))
    @Post('login')
    async login(@Request() req, @Body() loginUserDto: LoginUserDto) {
        return req.user;
    }

    @UseGuards(AuthGuard('google'))
    @Get('google')
    googleLogin() {}

    @UseGuards(AuthGuard('google'))
    @Get('google/callback')
    googleCallback(@Request() req, @Response() res: Res) {
        if (req.user.jwt) {
            res.send({message: 'Authentication success', ...req.user});
        } else {
            res.send({message: 'Authentication fail'});
        }
    }

    @Post('register')
    async create(@Body() createUserDto: CreateUserDto) {
        try {
            const newUser: UserInfo = await this.userService.create(createUserDto);
            await this.authService.createEmailToken(newUser.email);
            await this.authService.saveUserConsent(newUser.email);
            const sent = await this.authService.sendEmailVerification(newUser.email);
            return sent ? newUser : {message: 'Errore durante la registrazione'};
        } catch (error) {
            return {error, message: 'Errore durante la registrazione'};
        }
    }

    @ApiParam({name: 'token'})
    @Get('email/verify/:token')
    public async verifyEmail(@Param() params): Promise<any> {
        try {
            const isEmailVerified = await this.authService.verifyEmail(params.token);
            return {isEmailVerified};
        } catch (error) {
            return {error, message: 'Errore durante la verifica della mail'};
        }
    }

    @ApiParam({name: 'email'})
    @Get('email/resend-verification/:email')
    public async sendEmailVerification(@Param() params): Promise<any> {
        try {
            await this.authService.createEmailToken(params.email);
            const isEmailSent = await this.authService.sendEmailVerification(params.email);
            return isEmailSent ? {message: 'Email inviata nuovamente'} : {message: 'Errore durante l\'invio della mail'};
        } catch (error) {
            return {error, message: 'Errore durante l\'invio della mail'};
        }
    }

    @ApiParam({name: 'email'})
    @Get('email/forgot-password/:email')
    public async sendEmailForgotPassword(@Param() params): Promise<any> {
        try {
            const isEmailSent = await this.authService.sendEmailForgotPassword(params.email);
            return isEmailSent ? {message: 'Email per il cambio della password inviata'} : {message: 'Errore durante l\'invio della mail'};
        } catch (error) {
            return {error, message: 'Errore durante l\'invio della mail'};
        }
    }

    @Post('email/reset-password')
    @HttpCode(HttpStatus.OK)
    public async setNewPassord(@Body() resetPassword: ResetPasswordDto): Promise<any> {
        try {
            let isNewPasswordChanged: boolean = false;
            if (resetPassword.email && resetPassword.currentPassword) {
                const user = await this.userService.findOneByUsernameOrEmail(resetPassword.email);
                if (!user) {
                    return new HttpException('Utente non trovato', HttpStatus.INTERNAL_SERVER_ERROR);
                }
                const isValidPassword = await this.userService.checkPassword(user.password, resetPassword.currentPassword);
                if (isValidPassword) {
                    isNewPasswordChanged = await this.userService.setPassword(resetPassword.email, resetPassword.newPassword);
                } else {
                    return {message: 'Errore durante l\'aggiornamento della password'};
                }
            } else if (resetPassword.newPasswordToken) {
                const forgottenPasswordModel = await this.authService.getForgottenPasswordModel(resetPassword.newPasswordToken);
                isNewPasswordChanged = await this.userService.setPassword(forgottenPasswordModel.email, resetPassword.newPassword);
                if (isNewPasswordChanged) { await forgottenPasswordModel.remove(); }
            } else {
                return {message: 'Errore durante l\'aggiornamento della password'};
            }
            return {isNewPasswordChanged, message: 'Password aggiornata'};
        } catch (error) {
            return {error, message: 'Errore durante l\'aggiornamento della password'};
        }
    }
}
