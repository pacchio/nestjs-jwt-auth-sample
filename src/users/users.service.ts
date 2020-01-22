import {Inject, Injectable} from '@nestjs/common';
import {CreateUserDto} from "./dto/create-user.dto";
import {Model} from "mongoose";

export type User = any;

@Injectable()
export class UsersService {

  constructor(
    @Inject('USER_MODEL')
    private userModel: Model<User>
  ) {}

  async create(createUserDto: CreateUserDto) {
    const createdUser = new this.userModel(createUserDto);
    return await createdUser.save();
  }

  async findAll(): Promise<User> {
    return this.userModel.find();
  }

  async findOneByUsernameOrEmail(query): Promise<User> {
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

}
