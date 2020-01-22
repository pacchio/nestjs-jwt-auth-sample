import {Module} from '@nestjs/common';
import {AuthService} from './auth.service';
import {LocalStrategy} from './strategies/local.strategy';
import {JwtStrategy} from './strategies/jwt.strategy';
import {UsersModule} from '../users/users.module';
import {PassportModule} from '@nestjs/passport';
import {JwtModule} from '@nestjs/jwt';
import {AuthController} from "./auth.controller";
import {GoogleStrategy} from "./strategies/google.strategy";
import {default as config} from '../config';
import {authProviders} from "./auth.provider";
import {DatabaseModule} from "../database/database.module";

@Module({
    imports: [
        UsersModule,
        DatabaseModule,
        PassportModule.register({defaultStrategy: 'jwt'}),
        JwtModule.register({
            secret: config.secret,
            signOptions: {},
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        LocalStrategy,
        JwtStrategy,
        GoogleStrategy,
        ...authProviders
    ],
    exports: [AuthService],
})
export class AuthModule {
}
