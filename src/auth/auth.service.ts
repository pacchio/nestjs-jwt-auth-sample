import {
    HttpException,
    HttpStatus,
    Inject,
    Injectable,
    InternalServerErrorException,
    UnauthorizedException
} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import {sign} from 'jsonwebtoken';
import {Model} from 'mongoose';
import * as nodemailer from 'nodemailer';
import {default as config} from '../config';
import {UsersService} from '../users/users.service';
import {LoginUserDto} from './dto/login-user.dto';
import {ConsentRegistry} from './interfaces/consentregistry.interface';
import {EmailVerification} from './interfaces/emailverification.interface';
import {ForgottenPassword} from './interfaces/forgottenpassword.interface';
import {GoogleUser} from './interfaces/google-user.interface';
import {JwtPayload} from './interfaces/jwt-payload.interface';

export enum Provider {
    GOOGLE = 'google'
}

@Injectable()
export class AuthService {

    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        @Inject('EMAIL_VERIFICATION_MODEL') private readonly emailVerificationModel: Model<EmailVerification>,
        @Inject('FORGOTTEN_PASSWORD_MODEL') private readonly forgottenPasswordModel: Model<ForgottenPassword>,
        @Inject('CONSENT_REGISTRY_MODEL') private readonly consentRegistryModel: Model<ConsentRegistry>,
    ) {
    }

    async validateUser(loginAttempt: LoginUserDto): Promise<any> {
        const userToAttempt = await this.usersService.findOneByUsernameOrEmail(loginAttempt.username);
        if (!userToAttempt) {
            throw new HttpException('Utente non trovato', HttpStatus.UNAUTHORIZED);
        }
        if (!userToAttempt.auth.email.valid) {
            throw new HttpException('Email non verificata', HttpStatus.UNAUTHORIZED);
        }
        return new Promise((resolve, reject) => {
            bcrypt.compare(loginAttempt.password, userToAttempt.password).then(
                isValidPass => {
                    if (isValidPass) {
                        resolve(this.createJwtPayload(userToAttempt));
                    } else {
                        reject(new UnauthorizedException());
                    }
                }
            );
        });
    }

    createJwtPayload(user) {
        const data: JwtPayload = {username: user.username};
        const jwt = this.jwtService.sign(data);
        return {token: jwt};
    }

    async validateOAuthLogin(profile: GoogleUser, provider: Provider): Promise<string> {
        try {
            await this.usersService.createOAuthUser(profile);

            const payload = {
                thirdPartyId: profile.id,
                provider
            };

            return sign(payload, config.secret);
        } catch (err) {
            throw new InternalServerErrorException('validateOAuthLogin', err.message);
        }
    }

    async login(user: any) {
        const payload = {username: user.username, sub: user.userId};
        return {
            token: this.jwtService.sign(payload),
        };
    }

    async createEmailToken(email: string): Promise<boolean> {
        const emailVerification = await this.emailVerificationModel.findOne({email});
        if (emailVerification && ( (new Date().getTime() - emailVerification.timestamp.getTime()) / 60000 < 15 )) {
            throw new HttpException('Email già inviata recentemente', HttpStatus.INTERNAL_SERVER_ERROR);
        } else {
            const emailVerificationModel = await this.emailVerificationModel.findOneAndUpdate(
                {email},
                {
                    email,
                    emailToken: Math.floor(Math.random() * (9000000)) + 1000000, // Generate 7 digits number
                    timestamp: new Date()
                },
                {upsert: true}
            );
            return true;
        }
    }

    async saveUserConsent(email: string): Promise<ConsentRegistry> {
        try {
            const newConsent = new this.consentRegistryModel();
            newConsent.email = email;
            newConsent.date = new Date();
            newConsent.registrationForm = ['name', 'surname', 'email', 'birthday date', 'password'];
            newConsent.checkboxText = 'I accept privacy policy';
            newConsent.privacyPolicy = 'privacy policy';
            newConsent.cookiePolicy = 'cookie policy';
            newConsent.acceptedPolicy = 'Y';
            return await newConsent.save();
        } catch (error) {
            console.error(error);
        }
    }

    async createForgottenPasswordToken(email: string): Promise<ForgottenPassword> {
        const forgottenPassword = await this.forgottenPasswordModel.findOne({email});
        if (forgottenPassword && ((new Date().getTime() - forgottenPassword.timestamp.getTime()) / 60000 < 15)) {
            throw new HttpException('RESET_PASSWORD.EMAIL_SENDED_RECENTLY', HttpStatus.INTERNAL_SERVER_ERROR);
        } else {
            const forgottenPasswordModel = await this.forgottenPasswordModel.findOneAndUpdate(
                {email},
                {
                    email,
                    newPasswordToken: Math.floor(Math.random() * (9000000)) + 1000000, // Generate 7 digits number,
                    timestamp: new Date()
                },
                {upsert: true, new: true}
            );
            if (forgottenPasswordModel) {
                return forgottenPasswordModel;
            } else {
                throw new HttpException('LOGIN.ERROR.GENERIC_ERROR', HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }
    }

    async verifyEmail(token: string): Promise<boolean> {
        const emailVerif = await this.emailVerificationModel.findOne({emailToken: token});
        if (emailVerif && emailVerif.email) {
            const userFromDb = await this.usersService.findOneByUsernameOrEmail(emailVerif.email);
            if (userFromDb) {
                userFromDb.auth.email.valid = true;
                const savedUser = await userFromDb.save();
                await emailVerif.remove();
                return !!savedUser;
            }
        } else {
            throw new HttpException('LOGIN.EMAIL_CODE_NOT_VALID', HttpStatus.FORBIDDEN);
        }
    }

    async getForgottenPasswordModel(newPasswordToken: string): Promise<ForgottenPassword> {
        return this.forgottenPasswordModel.findOne({newPasswordToken});
    }

    async sendEmailVerification(email: string): Promise<boolean> {
        const model = await this.emailVerificationModel.findOne({email});

        if (model && model.emailToken) {
            const transporter = nodemailer.createTransport({
                host: config.mail.host,
                port: config.mail.port,
                secure: config.mail.secure, // true for 465, false for other ports
                auth: {
                    user: config.mail.user,
                    pass: config.mail.pass
                }
            });

            const mailOptions = {
                from: 'no-reply@andreapacchioni.it',
                to: email, // list of receivers (separated by ,)
                subject: 'Verify Email',
                text: 'Verify Email',
                html: 'Hi! <br><br> Thanks for your registration<br><br>' +
                    '<a href=' + config.host.url + ':' + config.host.port + '/auth/email/verify/' + model.emailToken + '>Click here to activate your account</a>'  // html body
            };

            // tslint:disable-next-line:only-arrow-functions
            return await new Promise<boolean>(async function(resolve, reject) {
                return await transporter.sendMail(mailOptions, async (error, info) => {
                    if (error) {
                        console.log('Message sent: %s', error);
                        return reject(false);
                    }
                    console.log('Message sent: %s', info.messageId);
                    resolve(true);
                });
            });
        } else {
            throw new HttpException('REGISTER.USER_NOT_REGISTERED', HttpStatus.FORBIDDEN);
        }
    }

    async sendEmailForgotPassword(email: string): Promise<boolean> {
        const userFromDb = await this.usersService.findOneByUsernameOrEmail(email);
        if (!userFromDb) { throw new HttpException('LOGIN.USER_NOT_FOUND', HttpStatus.NOT_FOUND); }

        const tokenModel = await this.createForgottenPasswordToken(email);

        if (tokenModel && tokenModel.newPasswordToken) {
            const transporter = nodemailer.createTransport({
                host: config.mail.host,
                port: config.mail.port,
                secure: config.mail.secure, // true for 465, false for other ports
                auth: {
                    user: config.mail.user,
                    pass: config.mail.pass
                }
            });

            const mailOptions = {
                from: '"Company" <' + config.mail.user + '>',
                to: email, // list of receivers (separated by ,)
                subject: 'Frogotten Password',
                text: 'Forgot Password',
                html: 'Hi! <br><br>You requested to reset your password' +
                    '<br><br> Your token is: ' + tokenModel.newPasswordToken // html body
                    // '<a href=' + config.host.url + ':' + config.host.port + '/auth/email/reset-password/'
                    // + tokenModel.newPasswordToken + '>Click here</a>'  // html body
            };

            // tslint:disable-next-line:only-arrow-functions
            return await new Promise<boolean>(async function(resolve, reject) {
                return await transporter.sendMail(mailOptions, async (error, info) => {
                    if (error) {
                        console.log('Message sent: %s', error);
                        return reject(false);
                    }
                    console.log('Message sent: %s', info.messageId);
                    resolve(true);
                });
            });
        } else {
            throw new HttpException('REGISTER.USER_NOT_REGISTERED', HttpStatus.FORBIDDEN);
        }
    }

}
