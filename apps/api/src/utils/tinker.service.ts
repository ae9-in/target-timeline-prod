import {
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TinkerService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(TinkerService.name);
  private intervalId: NodeJS.Timeout | null = null;

  constructor(private readonly configService: ConfigService) {}

  onApplicationBootstrap() {
    this.startSelfPinging();
  }

  private startSelfPinging() {
    const selfUrl =
      this.configService.get<string>('SELF_PING_URL') ||
      this.configService.get<string>('RENDER_EXTERNAL_URL') ||
      this.configService.get<string>('BACKEND_URL');

    if (!selfUrl) {
      this.logger.warn(
        'Tinker keep-awake service: Self-pinging is disabled. ' +
          'Configure SELF_PING_URL, RENDER_EXTERNAL_URL, or BACKEND_URL in environment variables.',
      );
      return;
    }

    const pingUrl = `${selfUrl.replace(/\/$/, '')}/ping`;
    this.logger.warn(
      `Tinker keep-awake service initiated. Target URL: ${pingUrl}`,
    );

    // Ping immediately on start
    void this.ping(pingUrl);

    // Ping every 1 minute
    this.intervalId = setInterval(() => {
      void this.ping(pingUrl);
    }, 60000);
  }

  private async ping(url: string) {
    try {
      this.logger.debug(`Tinker sending self-ping request to: ${url}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Tinker-KeepAwake-Bot',
        },
      });

      if (response.ok) {
        this.logger.log(
          `Tinker self-ping response: ${response.status} ${response.statusText}`,
        );
      } else {
        this.logger.warn(
          `Tinker self-ping failed with status: ${response.status} ${response.statusText}`,
        );
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Tinker self-ping HTTP request failed: ${message}`,
      );
    }
  }

  onApplicationShutdown() {
    if (this.intervalId) {
      this.logger.log(
        'Tinker keep-awake service: Shutting down self-ping interval.',
      );
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
