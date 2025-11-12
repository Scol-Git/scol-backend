import { Module } from '@nestjs/common';
import { ApiModule } from '@api/Api.module';

@Module({ imports: [ApiModule] })
export class AppModule {}
