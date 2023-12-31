import {Controller, Get, Request, UseGuards} from '@nestjs/common';
import {AuthGuard} from '@nestjs/passport';
import {AppService} from './app.service';
import {ApiTags} from "@nestjs/swagger";

@ApiTags("Default")
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

  @Get('hello')
  hello(@Request() req) {
    return this.appService.getHello();
  }

}
