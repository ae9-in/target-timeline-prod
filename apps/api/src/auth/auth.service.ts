import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { generateSecret, verifySync, generateURI } from 'otplib';
import * as qrcode from 'qrcode';
import { encrypt, decrypt } from '../utils/crypto';
import { getJwtKeys } from './keys';

class InMemoryRedis {
  private store = new Map<string, { value: string; expiresAt: number }>();

  async incr(key: string): Promise<number> {
    const item = this.store.get(key);
    let val = 1;
    if (item && item.expiresAt > Date.now()) {
      val = parseInt(item.value, 10) + 1;
    }
    this.store.set(key, { value: val.toString(), expiresAt: item?.expiresAt || (Date.now() + 900000) });
    return val;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.store.get(key);
    if (item) {
      item.expiresAt = Date.now() + (seconds * 1000);
      return 1;
    }
    return 0;
  }

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (item && item.expiresAt > Date.now()) {
      return item.value;
    }
    if (item) this.store.delete(key);
    return null;
  }

  async del(key: string): Promise<number> {
    const exists = this.store.has(key);
    this.store.delete(key);
    return exists ? 1 : 0;
  }

  async ttl(key: string): Promise<number> {
    const item = this.store.get(key);
    if (item && item.expiresAt > Date.now()) {
      return Math.round((item.expiresAt - Date.now()) / 1000);
    }
    return -2;
  }

  async setex(key: string, seconds: number, value: string): Promise<string> {
    this.store.set(key, { value, expiresAt: Date.now() + (seconds * 1000) });
    return 'OK';
  }
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly redis: InMemoryRedis;
  private readonly mfaEncryptionKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.redis = new InMemoryRedis();
    this.mfaEncryptionKey = this.configService.get<string>(
      'MFA_ENCRYPTION_KEY',
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    );
    const keyBuffer = Buffer.from(this.mfaEncryptionKey, 'hex');
    if (keyBuffer.length !== 32) {
      throw new Error(
        `MFA_ENCRYPTION_KEY must be a 64-character hex string representing a 32-byte key. ` +
        `Current key has parsed length of ${keyBuffer.length} bytes.`
      );
    }
  }

  // Hash an opaque refresh token for storage
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Track failed login attempts
  async handleFailedLogin(email: string, ip: string): Promise<void> {
    const key = `login_failures:${email}`;
    const failures = await this.redis.incr(key);

    // Set TTL on first failure
    if (failures === 1) {
      await this.redis.expire(key, 900); // 15 minutes lockout window
    }

    this.logger.warn(`Failed login attempt for user ${email} from IP ${ip}. Failures count: ${failures}`);

    await this.prisma.auditLog.create({
      data: {
        action: 'LOGIN_FAILURE',
        resourceType: 'user',
        ip,
        before: { email, failures },
      },
    });
  }

  async checkLockout(email: string): Promise<void> {
    const key = `login_failures:${email}`;
    const failures = await this.redis.get(key);
    const failureCount = failures ? parseInt(failures, 10) : 0;

    if (failureCount >= 5) {
      const ttl = await this.redis.ttl(key);
      const backoffSec = Math.max(0, ttl);
      throw new ForbiddenException({
        message: `Account is temporarily locked due to multiple failed login attempts. Try again in ${Math.ceil(backoffSec / 60)} minutes.`,
        lockoutDuration: backoffSec,
      });
    }
  }

  async resetLockout(email: string): Promise<void> {
    await this.redis.del(`login_failures:${email}`);
  }

  // Generate Access Token (RS256 JWT)
  async generateAccessToken(user: any): Promise<string> {
    const { privateKey } = getJwtKeys();
    
    // Get roles as string array
    const roles = user.roles.map((r: any) => r.name);
    
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      roles,
      verticalScope: user.verticalScope || [],
    };

    return this.jwtService.sign(payload, {
      privateKey,
      algorithm: 'RS256',
      expiresIn: '15m',
    });
  }

  // Generate Refresh Token and save hash to DB
  async generateRefreshToken(userId: string, userAgent: string, ip: string, familyId?: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        familyId: familyId || crypto.randomBytes(16).toString('hex'),
        expiresAt,
        userAgent,
        ipAddress: ip,
      },
    });

    return token;
  }

  // Validate credentials and process MFA requirements
  async validateUser(email: string, pass: string, mfaCode?: string, ip?: string): Promise<any> {
    await this.checkLockout(email);

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { roles: true },
    });

    if (!user || !user.isActive) {
      if (ip) await this.handleFailedLogin(email, ip);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      if (ip) await this.handleFailedLogin(email, ip);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed login counter on success
    await this.resetLockout(email);

    // Track Audit Log
    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'LOGIN',
        resourceType: 'user',
        resourceId: user.id,
        ip,
      },
    });

    return user;
  }

  // Complete MFA Setup
  async completeMfaSetup(token: string, code: string, ip: string): Promise<any> {
    const data = await this.redis.get(`mfa_setup:${token}`);
    if (!data) {
      throw new BadRequestException('MFA setup session expired or invalid');
    }

    const { userId, secret } = JSON.parse(data);
    const decryptedSecret = decrypt(secret, this.mfaEncryptionKey);

    const isMfaValid = verifySync({
      token: code,
      secret: decryptedSecret,
    });

    if (!isMfaValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    // Save encrypted MFA secret to user
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret },
      include: { roles: true },
    });

    await this.redis.del(`mfa_setup:${token}`);

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'MFA_ENABLE',
        resourceType: 'user',
        resourceId: user.id,
        ip,
      },
    });

    return user;
  }

  // Refresh Token Rotation & Reuse Detection
  async rotateRefreshToken(token: string, userAgent: string, ip: string): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = this.hashToken(token);

    const dbToken = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: { user: { include: { roles: true } } },
    });

    if (!dbToken) {
      throw new UnauthorizedException('Invalid token');
    }

    const isExpired = new Date() > dbToken.expiresAt;
    const isRevoked = dbToken.revokedAt !== null;

    if (isExpired || isRevoked) {
      if (isRevoked) {
        // Reuse detected! Invalidate the entire token family
        this.logger.error(`Refresh token reuse detected for user ${dbToken.userId}! Revoking token family.`);
        await this.prisma.refreshToken.updateMany({
          where: { familyId: dbToken.familyId },
          data: { revokedAt: new Date() },
        });

        await this.prisma.auditLog.create({
          data: {
            actorId: dbToken.userId,
            action: 'TOKEN_REUSE_ATTEMPT',
            resourceType: 'user',
            resourceId: dbToken.userId,
            ip,
            before: { familyId: dbToken.familyId, userAgent },
          },
        });
      }
      throw new UnauthorizedException('Token is no longer valid');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: dbToken.id },
      data: { revokedAt: new Date() },
    });

    // Issue new family tokens
    const nextRefreshToken = await this.generateRefreshToken(dbToken.userId, userAgent, ip, dbToken.familyId);
    const nextAccessToken = await this.generateAccessToken(dbToken.user);

    return {
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
    };
  }

  // Revoke token / logout
  async logout(token: string, ip: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const dbToken = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
    });

    if (dbToken) {
      await this.prisma.refreshToken.update({
        where: { id: dbToken.id },
        data: { revokedAt: new Date() },
      });

      await this.prisma.auditLog.create({
        data: {
          actorId: dbToken.userId,
          action: 'LOGOUT',
          resourceType: 'user',
          resourceId: dbToken.userId,
          ip,
        },
      });
    }
  }

  // Request password reset
  async requestPasswordReset(email: string, ip: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // To prevent account harvesting, return success silently in controller
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store in Redis with 15 minutes TTL
    await this.redis.setex(`password_reset:${tokenHash}`, 900, user.id);

    // In a real app we'd email this, but for now we log it clearly
    const resetLink = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173')}/reset-password?token=${resetToken}`;
    this.logger.log(`Password reset requested for ${email}. Link: ${resetLink}`);

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'PASSWORD_RESET_REQUEST',
        resourceType: 'user',
        resourceId: user.id,
        ip,
      },
    });
  }

  // Confirm password reset
  async confirmPasswordReset(token: string, newPass: string, ip: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const userId = await this.redis.get(`password_reset:${tokenHash}`);

    if (!userId) {
      throw new BadRequestException('Reset token has expired or is invalid');
    }

    const passwordHash = await bcrypt.hash(newPass, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.redis.del(`password_reset:${tokenHash}`);

    // Fetch user for audit log
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await this.resetLockout(user.email);
    }

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'PASSWORD_RESET_CONFIRM',
        resourceType: 'user',
        resourceId: userId,
        ip,
      },
    });
  }
}
