// src/bootstrap.ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './AppModule.module';
import { HttpExceptionFilter } from '@api/common/filters/HttpExceptionFilter.filter';
import { UserContextInterceptor } from '@api/common/interceptors/UserContextInterceptor.interceptor';
import { ResponseInterceptor } from '@api/common/interceptors/ResponseInterceptor.interceptor';
import type { INestApplication } from '@nestjs/common';
import type { IApiConfig } from '@shared/interfaces/config/IApiConfig.interface';
import { IApiConfig as IApiConfigToken } from '@shared/tokens/injection.tokens';

export interface CreateNestAppOptions {
  /**
   * Optional ExpressAdapter for use with serverless environments (e.g., Vercel).
   * When provided, the Nest app will be created with this adapter.
   */
  expressAdapter?: ExpressAdapter;
}

/**
 * Creates and configures a NestJS application instance.
 * This function sets up all middleware, pipes, filters, interceptors, and Swagger.
 *
 * @param options - Optional configuration for the app creation
 * @returns Configured Nest application (not listening - call app.listen() for local dev)
 */
export async function createNestApp(
  options?: CreateNestAppOptions,
): Promise<INestApplication> {
  const app = options?.expressAdapter
    ? await NestFactory.create(AppModule, options.expressAdapter, {
        bufferLogs: true,
      })
    : await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  const apiConfig = app.get<IApiConfig>(IApiConfigToken);
  if (apiConfig.trustProxyHops > 0) {
    app.getHttpAdapter().getInstance().set('trust proxy', apiConfig.trustProxyHops);
  }

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

  // Let Nest inject AppLogger into the filter
  app.useGlobalFilters(app.get(HttpExceptionFilter));

  // Register interceptors globally
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
      'JWT-auth',
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
  SwaggerModule.setup('/swagger', app, doc, {
    // Use CDN for Swagger UI assets (required for serverless environments like Vercel)
    customCssUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.js',
    ],
  });

  await app.init();

  return app;
}
