import {Body, Controller, Get, Post, Request, UseGuards} from '@nestjs/common';
import {AuthGuard} from '@nestjs/passport';
import {CatsService} from './cats.service';
import {CreateCatDto} from "./dto/create-cat.dto";
import {Cat} from "./interfaces/cat.interface";
import {ApiHeader, ApiTags} from "@nestjs/swagger";

@ApiTags('Cats')
@ApiHeader({
  name: 'Authorization',
  description: 'Auth token',
})
@Controller('cats')
export class CatsController {
  constructor(
    private catsService: CatsService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('add-cat')
  addCat(@Body() cat: CreateCatDto): Promise<Cat> {
    return this.catsService.create(cat);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('get-all')
  getCats(@Request() req): Promise<Cat[]> {
    return this.catsService.findAll();
  }
}
