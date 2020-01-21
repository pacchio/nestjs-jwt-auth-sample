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

  async findOneByUsername(username): Promise<User> {
    return this.userModel.findOne({username});
  }
}
