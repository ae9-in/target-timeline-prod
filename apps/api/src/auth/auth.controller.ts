import {
  Controller, Post, Body, Req, Res, UnauthorizedException,
  HttpCode, HttpStatus, Ip, Headers, UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from './jwt-auth.guard';

const isProduction = process.env.NODE_ENV === 'production';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
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

  // ─── Login ──────────────────────────────────────────────────────────────────
  // Two separate throttle tiers applied at controller level via conditional
  // logic — the admin portal gets 5 attempts per 15 minutes (stricter).
  // The @Throttle decorator here applies the tighter limit globally; the
  // user portal is further relaxed by the lockout threshold in AuthService.

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 900000 } }) // 10/15-min for user portal; admin enforced in service
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { email: string; pass: string; mfaCode?: string; portal?: 'user' | 'admin' | 'admin_user' },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const portal = body.portal === 'admin' ? 'admin' : (body.portal === 'admin_user' ? 'admin_user' : 'user');
    const result = await this.authService.validateUser(body.email, body.pass, body.mfaCode, ip, portal);

    if (result.mfaSetupRequired || result.mfaRequired) {
      return result;
    }

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
        mustChangePassword: result.mustChangePassword ?? false,
      },
    };
  }

  // ─── MFA Setup ──────────────────────────────────────────────────────────────

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
        mustChangePassword: user.mustChangePassword ?? false,
      },
    };
  }

  // ─── Token Refresh ──────────────────────────────────────────────────────────

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

  // ─── Logout ─────────────────────────────────────────────────────────────────

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

  // ─── Self-service password reset ────────────────────────────────────────────

  @Post('reset-password/request')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async requestReset(@Body() body: { email: string }, @Ip() ip: string) {
    await this.authService.requestPasswordReset(body.email, ip);
    return { success: true, message: 'If the email exists, a password reset link has been generated.' };
  }

  @Post('reset-password/confirm')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async confirmReset(@Body() body: { token: string; newPass: string }, @Ip() ip: string) {
    await this.authService.confirmPasswordReset(body.token, body.newPass, ip);
    return { success: true };
  }

  // ─── Accept invite ───────────────────────────────────────────────────────────
  // No auth guard — the invite token IS the authentication credential.

  @Post('accept-invite')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async acceptInvite(
    @Body() body: { token: string; newPassword: string },
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const result = await this.authService.acceptInvite(body.token, body.newPassword, userAgent || 'Unknown', ip);
    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  // ─── Self-service sign up (public) ────────────────────────────────────

  @Post('signup')
  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 per 5 minutes
  @HttpCode(HttpStatus.OK)
  async signUp(
    @Body() body: { email: string; name: string; password: string; role?: string },
    @Ip() ip: string,
  ) {
    return this.authService.signUp(body, ip || 'Unknown');
  }

  // ─── Force-change password (mustChangePassword gate) ─────────────────────────

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() body: { newPassword: string },
    @Req() req: any,
    @Ip() ip: string,
  ) {
    await this.authService.changePassword(req.user.sub, body.newPassword, ip);
    return { success: true };
  }
}
