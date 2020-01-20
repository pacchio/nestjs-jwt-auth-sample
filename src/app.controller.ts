import {Controller, Get, Request, UseGuards} from '@nestjs/common';
import {AuthGuard} from '@nestjs/passport';
import {AppService} from './app.service';

@Controller()
export class AppController {

  constructor(
    private appService: AppService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('hello')
  hello(@Request() req) {
    return this.appService.getHello();
  }

}
