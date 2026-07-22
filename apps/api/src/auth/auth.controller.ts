import { Controller, Post, Body, Req, Res, UnauthorizedException, HttpCode, HttpStatus, Ip, Headers } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Throttle } from '@nestjs/throttler';

const isProduction = process.env.NODE_ENV === 'production';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: isProduction,          // false in dev (HTTP), true in prod (HTTPS)
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',                     // Accessible on all paths so /api/auth/refresh works
    });
  }

  private clearRefreshTokenCookie(res: Response) {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
    });
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // Lockout/Throttle login: max 5 requests per minute
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { email: string; pass: string; mfaCode?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const result = await this.authService.validateUser(body.email, body.pass, body.mfaCode, ip);

    // If MFA setup is required or MFA validation is pending
    if (result.mfaSetupRequired || result.mfaRequired) {
      return result;
    }

    // Otherwise, login is successful, issue tokens
    const accessToken = await this.authService.generateAccessToken(result);
    const refreshToken = await this.authService.generateRefreshToken(result.id, userAgent || 'Unknown', ip);

    this.setRefreshTokenCookie(res, refreshToken);

    return {
      accessToken,
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
        roles: result.roles.map((r: any) => r.name),
        verticalScope: result.verticalScope,
      },
    };
  }

  @Post('mfa/setup')
  @HttpCode(HttpStatus.OK)
  async completeMfa(
    @Body() body: { token: string; code: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const user = await this.authService.completeMfaSetup(body.token, body.code, ip);
    const accessToken = await this.authService.generateAccessToken(user);
    const refreshToken = await this.authService.generateRefreshToken(user.id, userAgent || 'Unknown', ip);

    this.setRefreshTokenCookie(res, refreshToken);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles.map((r: any) => r.name),
        verticalScope: user.verticalScope,
      },
    };
  }

  @Post('refresh')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    try {
      const result = await this.authService.rotateRefreshToken(refreshToken, userAgent || 'Unknown', ip);
      this.setRefreshTokenCookie(res, result.refreshToken);
      return { accessToken: result.accessToken };
    } catch (err) {
      this.clearRefreshTokenCookie(res);
      throw err;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await this.authService.logout(refreshToken, ip);
    }
    this.clearRefreshTokenCookie(res);
    return { success: true };
  }

  @Post('reset-password/request')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async requestReset(@Body() body: { email: string }, @Ip() ip: string) {
    await this.authService.requestPasswordReset(body.email, ip);
    // Silent return to prevent email enumeration attacks
    return { success: true, message: 'If the email exists, a password reset link has been generated.' };
  }

  @Post('reset-password/confirm')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async confirmReset(@Body() body: { token: string; newPass: string }, @Ip() ip: string) {
    await this.authService.confirmPasswordReset(body.token, body.newPass, ip);
    return { success: true };
  }
}
