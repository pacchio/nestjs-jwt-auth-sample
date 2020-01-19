import {Module} from '@nestjs/common';
import {AppController} from './app.controller';
import {AppService} from './app.service';
import {AuthModule} from './auth/auth.module';
import {CatsModule} from './cats/cats.module';
import {DatabaseModule} from './database/database.module';
import {UsersModule} from './users/users.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    DatabaseModule,
    CatsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
