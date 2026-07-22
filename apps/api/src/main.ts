import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';

const server = express();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ['error', 'warn'],
  });

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
}

// For local running
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  bootstrap().then(() => {
    const port = process.env.PORT ?? 3000;
    server.listen(port, () => {
      console.log(`Backend API is running locally on: http://localhost:${port}`);
    });
  });
} else {
  // Initialize NestJS app for serverless function execution environment
  bootstrap();
}

export default server;
