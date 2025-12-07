import { Module } from '@nestjs/common';
import { AuthController } from './AuthController.controller';

@Module({
  controllers: [AuthController],
})
export class AuthModule {}

