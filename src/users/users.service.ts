import {HttpException, HttpStatus, Inject, Injectable} from '@nestjs/common';
import {Provider} from '../auth/auth.service';
import {CreateUserDto} from './dto/create-user.dto';
import {Model} from 'mongoose';
import * as bcrypt from 'bcrypt';
import {UserInfo} from './interfaces/user-info.interface';
import {User} from './interfaces/user.interface';
import {GoogleUser, GoogleUserRawObject} from '../auth/interfaces/google-user.interface';

const saltRounds = 10;

export enum Role {
  USER = 'User',
  ADMIN = 'Admin'
}

@Injectable()
export class UsersService {

  constructor(
    @Inject('USER_MODEL') private userModel: Model<User>
  ) {}

  async create(newUser: CreateUserDto): Promise<UserInfo> {
    newUser = {
      ...newUser,
      email: newUser.email.trim(),
      name: newUser.name.trim(),
      surname: newUser.surname.trim(),
      username: newUser.username.trim()
    };
    if (this.isValidPassword(newUser.password)) {
      if (this.isValidEmail(newUser.email)) {
        const userRegisteredByEmail = await this.findOneByUsernameOrEmail(newUser.email);
        const userRegisteredByUsername = await this.findOneByUsernameOrEmail(newUser.username);
        if (!userRegisteredByEmail && !userRegisteredByUsername) {
          newUser.password = await bcrypt.hash(newUser.password, saltRounds);
          const createdUser = new this.userModel(newUser);
          createdUser.roles = [Role.USER];
          const userSaved = await createdUser.save();
          return this.mapUserToUserInfo(userSaved);
        } else {
          if (userRegisteredByEmail) {
            if(!userRegisteredByEmail.auth.email.valid) {
              throw new HttpException('Utente già registrato con la mail inserita, ma la mail non è stata verificata', HttpStatus.FORBIDDEN);
            }
            throw new HttpException('Utente già registrato con la mail inserita', HttpStatus.FORBIDDEN);
          }
          if (userRegisteredByUsername) {
            if(!userRegisteredByEmail.auth.email.valid) {
              throw new HttpException('Utente già registrato con lo username inserito, ma la mail non è stata verificata', HttpStatus.FORBIDDEN);
            }
            throw new HttpException('Utente già registrato con lo username inserito', HttpStatus.FORBIDDEN);
          }
        }
      } else {
        throw new HttpException('Email non valida', HttpStatus.FORBIDDEN);
      }
    } else {
      throw new HttpException('Password non valida', HttpStatus.FORBIDDEN);
    }
  }

  async createOAuthUser(profile: GoogleUser) {
      let userRawObject = JSON.parse(profile._raw) as GoogleUserRawObject;
      let userRegistered = await this.findOneByUsernameOrEmail(userRawObject.email);
      if(!userRegistered) {
        let user = {
          name: profile.name.givenName,
          surname: profile.name.familyName,
          username: profile.displayName,
          email: userRawObject.email,
          roles: [Role.USER],
        } as User;
        const createdUser = new this.userModel(user);
        createdUser.auth = {
          email: {valid: true},
          google: {userid: profile.id},
          facebook: {userid: ''}
        };
        return await createdUser.save();
      } else {
        userRegistered.auth = {
          email: {valid: true},
          google: {userid: profile.id},
          facebook: {userid: userRegistered.auth.facebook.userid}
        };
        return await userRegistered.save();
      }
  }

  async findAll(): Promise<UserInfo[]> {
    return this.userModel.find().map(
      doc => doc.map(user => this.mapUserToUserInfo(user))
    );
  }

  async findOneByUsernameOrEmail(query: string): Promise<User> {
    return new Promise((resolve) => {
      if (query) {
        const resultSearchByUsername = this.userModel.findOne({username: query.trim()});
        resultSearchByUsername.then(
          user => {
            if (user) {
              resolve(user);
            } else {
              const resultSearchByEmail = this.userModel.findOne({email: query.trim()});
              resolve(resultSearchByEmail);
            }
          }
        );
      } else {
        resolve(null);
      }
    });
  }

  async deleteUser(id: string) {
    return this.userModel.findByIdAndDelete(id);
  }

  async throwErrorIfNotAdmin(userFromToken: {username: string}) {
    if (userFromToken) {
      const user = await this.findOneByUsernameOrEmail(userFromToken.username);
      if (!user || !user.roles || user.roles.indexOf(Role.ADMIN) === -1) {
        throw new HttpException('Accesso non autorizzato: permessi mancanti', HttpStatus.UNAUTHORIZED);
      }
    }
  }

  isValidEmail(email: string) {
    if (email) {
      const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      return re.test(email);
    } else { return false; }
  }

  isValidPassword(password: string) {
    return !!password;
  }

  async checkPassword(passwordFromDb: string, password: string) {
    return await bcrypt.compare(password, passwordFromDb);
  }

  async setPassword(email: string, newPassword: string): Promise<boolean> {
    const userFromDb = await this.userModel.findOne({email});
    if (!userFromDb) { throw new HttpException('Utente non trovato', HttpStatus.INTERNAL_SERVER_ERROR); }

    userFromDb.password = await bcrypt.hash(newPassword, saltRounds);

    await userFromDb.save();
    return true;
  }

  mapUserToUserInfo(user: User): UserInfo {
    if (user) {
      return {
        id: user._id + '',
        name: user.name,
        surname: user.surname,
        username: user.username,
        email: user.email,
        roles: user.roles,
        auth: user.auth,
        settings: user.settings
      } as UserInfo;
    }
    return {} as UserInfo;
  }

}
