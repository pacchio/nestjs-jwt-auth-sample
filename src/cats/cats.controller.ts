import {Controller, Get, Request, UseGuards} from '@nestjs/common';
import {AuthGuard} from '@nestjs/passport';
import {CatsService} from './cats.service';

@Controller()
export class CatsController {
  constructor(
    private catsService: CatsService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('get-cats')
  hello(@Request() req) {
    return this.catsService.findAll();
  }
}
