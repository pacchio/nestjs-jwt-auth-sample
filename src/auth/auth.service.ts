import {
    HttpException,
    HttpStatus,
    Inject,
    Injectable,
    InternalServerErrorException,
    UnauthorizedException
} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {sign} from 'jsonwebtoken';
import {LoginUserDto} from './dto/login-user.dto';
import {UsersService} from '../users/users.service';
import {JwtPayload} from './interfaces/jwt-payload.interface';
import {Model} from "mongoose";
import {EmailVerification} from "./interfaces/emailverification.interface";
import {ForgottenPassword} from "./interfaces/forgottenpassword.interface";
import {ConsentRegistry} from "./interfaces/consentregistry.interface";
import * as nodemailer from 'nodemailer';
import {default as config} from '../config';
import {User} from "../users/interfaces/user.interface";
import * as bcrypt from 'bcrypt';

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
                        resolve(this.createJwtPayload(userToAttempt))
                    } else {
                        reject(new UnauthorizedException());
                    }
                }
            )
        });
    }

    createJwtPayload(user) {
        const data: JwtPayload = {username: user.username};
        const jwt = this.jwtService.sign(data);
        return {token: jwt};
    }

    async validateOAuthLogin(thirdPartyId: string, provider: Provider): Promise<string> {
        try {
            // You can add some registration logic here,
            // to register the user using their thirdPartyId (in this case their googleId)
            // let user: IUser = await this.usersService.findOneByThirdPartyId(thirdPartyId, provider);

            // if (!user)
            // user = await this.usersService.registerOAuthUser(thirdPartyId, provider);

            const payload = {
                thirdPartyId,
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
        let emailVerification = await this.emailVerificationModel.findOne({email});
        let emailVerificationModel = await this.emailVerificationModel.findOneAndUpdate(
            {email: email},
            {
                email: email,
                emailToken: Math.floor(Math.random() * (9000000)) + 1000000, //Generate 7 digits number
                timestamp: new Date()
            },
            {upsert: true}
        );
        return true;
    }

    async saveUserConsent(email: string): Promise<ConsentRegistry> {
        try {
            let newConsent = new this.consentRegistryModel();
            newConsent.email = email;
            newConsent.date = new Date();
            newConsent.registrationForm = ["name", "surname", "email", "birthday date", "password"];
            newConsent.checkboxText = "I accept privacy policy";
            newConsent.privacyPolicy = "privacy policy";
            newConsent.cookiePolicy = "cookie policy";
            newConsent.acceptedPolicy = "Y";
            return await newConsent.save();
        } catch (error) {
            console.error(error)
        }
    }

    async createForgottenPasswordToken(email: string): Promise<ForgottenPassword> {
        let forgottenPassword = await this.forgottenPasswordModel.findOne({email: email});
        if (forgottenPassword && ((new Date().getTime() - forgottenPassword.timestamp.getTime()) / 60000 < 15)) {
            throw new HttpException('RESET_PASSWORD.EMAIL_SENDED_RECENTLY', HttpStatus.INTERNAL_SERVER_ERROR);
        } else {
            let forgottenPasswordModel = await this.forgottenPasswordModel.findOneAndUpdate(
                {email: email},
                {
                    email: email,
                    newPasswordToken: Math.floor(Math.random() * (9000000)) + 1000000, //Generate 7 digits number,
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
        let emailVerif = await this.emailVerificationModel.findOne({emailToken: token});
        if (emailVerif && emailVerif.email) {
            let userFromDb = await this.usersService.findOneByUsernameOrEmail(emailVerif.email);
            if (userFromDb) {
                userFromDb.auth.email.valid = true;
                let savedUser = await userFromDb.save();
                await emailVerif.remove();
                return !!savedUser;
            }
        } else {
            throw new HttpException('LOGIN.EMAIL_CODE_NOT_VALID', HttpStatus.FORBIDDEN);
        }
    }

    async getForgottenPasswordModel(newPasswordToken: string): Promise<ForgottenPassword> {
        return this.forgottenPasswordModel.findOne({newPasswordToken: newPasswordToken});
    }

    async sendEmailVerification(email: string): Promise<boolean> {
        let model = await this.emailVerificationModel.findOne({email});

        if (model && model.emailToken) {
            let transporter = nodemailer.createTransport({
                host: config.mail.host,
                port: config.mail.port,
                secure: config.mail.secure, // true for 465, false for other ports
                auth: {
                    user: config.mail.user,
                    pass: config.mail.pass
                }
            });

            let mailOptions = {
                from: 'no-reply@andreapacchioni.it',
                to: email, // list of receivers (separated by ,)
                subject: 'Verify Email',
                text: 'Verify Email',
                html: 'Hi! <br><br> Thanks for your registration<br><br>' +
                    '<a href=' + config.host.url + ':' + config.host.port + '/auth/email/verify/' + model.emailToken + '>Click here to activate your account</a>'  // html body
            };

            return await new Promise<boolean>(async function (resolve, reject) {
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
        let userFromDb = await this.usersService.findOneByUsernameOrEmail(email);
        if (!userFromDb) throw new HttpException('LOGIN.USER_NOT_FOUND', HttpStatus.NOT_FOUND);

        let tokenModel = await this.createForgottenPasswordToken(email);

        if (tokenModel && tokenModel.newPasswordToken) {
            let transporter = nodemailer.createTransport({
                host: config.mail.host,
                port: config.mail.port,
                secure: config.mail.secure, // true for 465, false for other ports
                auth: {
                    user: config.mail.user,
                    pass: config.mail.pass
                }
            });

            let mailOptions = {
                from: '"Company" <' + config.mail.user + '>',
                to: email, // list of receivers (separated by ,)
                subject: 'Frogotten Password',
                text: 'Forgot Password',
                html: 'Hi! <br><br> If you requested to reset your password<br><br>' +
                    '<a href=' + config.host.url + ':' + config.host.port + '/auth/email/reset-password/' + tokenModel.newPasswordToken + '>Click here</a>'  // html body
            };

            return await new Promise<boolean>(async function (resolve, reject) {
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
