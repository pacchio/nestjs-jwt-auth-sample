import {HttpException, HttpStatus, Inject, Injectable} from '@nestjs/common';
import {CreateUserDto} from "./dto/create-user.dto";
import {Model} from "mongoose";
import * as bcrypt from 'bcrypt';
import {User} from "./interfaces/user.interface";
import {GoogleUser, GoogleUserRawObject} from "../auth/interfaces/google-user.interface";

const saltRounds = 10;

@Injectable()
export class UsersService {

  constructor(
    @Inject('USER_MODEL') private userModel: Model<User>
  ) {}

  async create(newUser: CreateUserDto): Promise<User> {
    if (this.isValidPassword(newUser.password)) {
      if (this.isValidEmail(newUser.email)) {
        let userRegistered = await this.findOneByUsernameOrEmail(newUser.email);
        if(!userRegistered) {
          newUser.password = await bcrypt.hash(newUser.password, saltRounds);
          let createdUser = new this.userModel(newUser);
          createdUser.roles = ["User"];
          return await createdUser.save();
        } else if (!userRegistered.auth.email.valid) {
          return userRegistered;
        } else {
          throw new HttpException('Utente già registrato', HttpStatus.FORBIDDEN);
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
          roles: ["User"],
        } as User;
        let createdUser = new this.userModel(user);
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

  async findAll(): Promise<User[]> {
    return this.userModel.find();
  }

  async findOneByUsernameOrEmail(query: string): Promise<User> {
    return new Promise((resolve) => {
      let resultSearchByUsername = this.userModel.findOne({username: query});
      resultSearchByUsername.then(
          user => {
            if (user) {
              resolve(user);
            } else {
              const resultSearchByEmail = this.userModel.findOne({email: query});
              resolve(resultSearchByEmail);
            }
          }
      );
    });
  }

  isValidEmail (email : string){
    if(email){
      let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      return re.test(email);
    } else return false
  }

  isValidPassword (password : string){
    return !!password;
  }

  async checkPassword(passwordFromDb: string, password: string){
    return await bcrypt.compare(password, passwordFromDb);
  }

  async setPassword(email: string, newPassword: string): Promise<boolean> {
    let userFromDb = await this.userModel.findOne({email});
    if(!userFromDb) throw new HttpException('Utente non trovato', HttpStatus.INTERNAL_SERVER_ERROR);

    userFromDb.password = await bcrypt.hash(newPassword, saltRounds);

    await userFromDb.save();
    return true;
  }

}
