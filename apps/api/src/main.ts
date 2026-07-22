import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

let cachedServer: any;

async function bootstrap() {
  if (cachedServer) {
    return cachedServer;
  }

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });

  // Security headers
  app.use(helmet());

  // Cookie parser for HTTP-only refresh tokens
  app.use(cookieParser());

  // Strict input validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Explicit CORS origin policy
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  await app.init();
  cachedServer = app.getHttpServer();
  return cachedServer;
}

// For non-Vercel environments (Local development & Render production)
if (!process.env.VERCEL) {
  bootstrap().then(async (server) => {
    const port = process.env.PORT ?? 3000;
    await new Promise<void>((resolve, reject) => {
      server.listen(port, (err?: any) => {
        if (err) return reject(err);
        resolve();
      });
    });
    console.log(`Backend API is running on: http://localhost:${port}`);
  });
}

// Export default serverless handler for Vercel
export default async (req: any, res: any) => {
  const server = await bootstrap();
  server.emit('request', req, res);
};
