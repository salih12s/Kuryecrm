import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { join } from 'node:path';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { resolveCorsOrigins } from './common/security-config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const frontendPath = join(__dirname, '..', '..', 'frontend', 'dist');

  app.use(helmet());
  app.useStaticAssets(frontendPath);
  app.setGlobalPrefix('api');

  // Static assets are attempted first. Any remaining browser GET loads the
  // React entry point, while API requests continue to Nest controllers/404.
  app.use((request: Request, response: Response, next: NextFunction) => {
    const isApiRequest = request.path === '/api' || request.path.startsWith('/api/');
    if (request.method !== 'GET' || isApiRequest || !request.accepts('html')) {
      return next();
    }
    return response.sendFile(join(frontendPath, 'index.html'));
  });

  // Global API prefix is intentionally NOT set so routes stay /auth, /admin, etc.
  app.enableCors({
    origin: resolveCorsOrigins(config),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`KuryeCrm backend running on http://localhost:${port} [${config.get('APP_ENV')}]`);
}
bootstrap();
