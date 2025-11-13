import { Module } from '@nestjs/common';
import { ApiModule } from '@api/ApiModule.module';

@Module({
  imports: [ApiModule],
})
export class AppModule {}
