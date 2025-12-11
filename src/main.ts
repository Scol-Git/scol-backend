// src/main.ts
import 'reflect-metadata';
import { networkInterfaces } from 'os';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './AppModule.module';
import { HttpExceptionFilter } from '@api/common/filters/HttpExceptionFilter.filter';
import { UserContextInterceptor } from '@api/common/interceptors/UserContextInterceptor.interceptor';
import { ResponseInterceptor } from '@api/common/interceptors/ResponseInterceptor.interceptor';

function getLanIp(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  app.enableCors({
    origin: '*',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ✅ Let Nest inject AppLogger into the filter
  app.useGlobalFilters(app.get(HttpExceptionFilter));

  // ✅ Register interceptors globally
  // ResponseInterceptor wraps all success responses with base structure
  app.useGlobalInterceptors(new ResponseInterceptor());
  // UserContextInterceptor extracts user context (runs after guards, before controllers)
  app.useGlobalInterceptors(new UserContextInterceptor());

  const swaggerCfg = new DocumentBuilder()
    .setTitle('SCOL Backend')
    .setDescription('API documentation')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'OTP',
        description: 'Enter OTP access token from /auth/register',
        in: 'header',
      },
      'OTP-auth',
    )
    .build();
  const doc = SwaggerModule.createDocument(app, swaggerCfg);
  SwaggerModule.setup('/swagger', app, doc);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`🌐 LAN URL: http://${getLanIp()}:${port}`);
}
void bootstrap();
