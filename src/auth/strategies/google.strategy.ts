import {Injectable} from "@nestjs/common";
import {PassportStrategy} from "@nestjs/passport";
import {Strategy, VerifyCallback} from "passport-google-oauth20";
import {AuthService, Provider} from "../auth.service";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {

    constructor(
        private authService: AuthService
    ) {
        super({
            clientID: '374164632375-c3sc5hqbqun50vtjfjasjptqgd5ehuld.apps.googleusercontent.com',     // <- Replace this with your client id
            clientSecret: '8zm_qlIViBPDEFwGYi5ZnQI2', // <- Replace this with your client secret
            callbackURL: 'http://localhost:3100/auth/google/callback',
            passReqToCallback: true,
            scope: ['profile', 'email']
        });
    }

    async validate(request: Request, accessToken: string, refreshToken: string, profile, done: VerifyCallback) {
        try {
            const jwt: string = await this.authService.validateOAuthLogin(profile.id, Provider.GOOGLE);
            const user = {
                jwt,
                name: profile._json.name,
                picture: profile._json.picture,
                email: profile._json.email,
                locale: profile._json.locale,
            };
            done(null, user);
        } catch (err) {
            console.log(err);
            done(err, false);
        }
    }

}
