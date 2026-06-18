import { Module } from '@nestjs/common';
import { UsersService } from './services/users.service';

@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
