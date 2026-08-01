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

function killProcessOnPort(port: number) {
  try {
    const { execSync } = require('child_process');
    const currentPid = process.pid;
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port}`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
      const lines = output.split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5 && parts[1].endsWith(`:${port}`)) {
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && pid !== currentPid.toString()) {
            console.log(`[Port Cleanup] Killing process ${pid} using port ${port}...`);
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          }
        }
      }
    } else {
      const output = execSync(`lsof -t -i:${port}`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
      if (output) {
        const pids = output.split('\n');
        for (const pid of pids) {
          if (pid && pid !== currentPid.toString()) {
            console.log(`[Port Cleanup] Killing process ${pid} using port ${port}...`);
            execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
          }
        }
      }
    }
  } catch (e) {
    // Fail silently
  }
}

if (!process.env.VERCEL) {
  killProcessOnPort(3000);

  bootstrap()
    .then(async (server) => {
      const port = process.env.PORT ?? 3000;
      await new Promise<void>((resolve, reject) => {
        server.listen(port, (err?: any) => {
          if (err) return reject(err);
          resolve();
        });
      });
      console.log(`Backend API is running on: http://localhost:${port}`);
    })
    .catch((err) => {
      console.error('Failed to start application:', err);
      process.exit(1);
    });
}

// Export default serverless handler for Vercel
export default async (req: any, res: any) => {
  const server = await bootstrap();
  server.emit('request', req, res);
};
