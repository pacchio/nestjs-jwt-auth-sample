import {Injectable, InternalServerErrorException, UnauthorizedException} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {sign} from 'jsonwebtoken';
import {Constants} from '../constants';
import {LoginUserDto} from './dto/login-user.dto';
import {UsersService} from '../users/users.service';
import {JwtPayload} from './interfaces/jwt-payload.interface';

export enum Provider {
    GOOGLE = 'google'
}

@Injectable()
export class AuthService {

    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
    ) {
    }

    async validateUser(loginAttempt: LoginUserDto): Promise<any> {
        const userToAttempt = await this.usersService.findOneByUsernameOrEmail(loginAttempt.username);

        return new Promise((resolve) => {
            // @ts-ignore
            if(userToAttempt) {
                userToAttempt.checkPassword(loginAttempt.password, (err, isMatch) => {
                    if (err) {
                        throw new UnauthorizedException();
                    }
                    if (isMatch) {
                        // @ts-ignore
                        resolve(this.createJwtPayload(userToAttempt));
                    } else {
                        throw new UnauthorizedException();
                    }
                });
            } else {
                throw new UnauthorizedException();
            }
        });
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

            return sign(payload, Constants.secret);
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

    createJwtPayload(user) {
        const data: JwtPayload = {
            username: user.username
        };
        const jwt = this.jwtService.sign(data);
        return {
            token: jwt
        };
    }
}
