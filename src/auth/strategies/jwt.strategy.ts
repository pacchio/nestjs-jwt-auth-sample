import {ExtractJwt, Strategy} from 'passport-jwt';
import {PassportStrategy} from '@nestjs/passport';
import {Injectable} from '@nestjs/common';
import {default as config} from '../../config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.secret,
    });
  }

  async validate(payload: any) {
    return payload;
  }
}
