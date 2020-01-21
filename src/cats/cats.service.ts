import {Inject, Injectable} from '@nestjs/common';
import {Model} from 'mongoose';
import {Cat} from './interfaces/cat.interface';
import {CreateCatDto} from "./dto/create-cat.dto";

@Injectable()
export class CatsService {
  constructor(
    @Inject('CAT_MODEL')
    private readonly catModel: Model<Cat>,
  ) {}

  async create(createCatDto: CreateCatDto): Promise<Cat> {
    const createdCat = new this.catModel(createCatDto);
    return createdCat.save();
  }

  async findAll(): Promise<Cat[]> {
    return this.catModel.find().exec();
  }
}
