import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { encrypt, decrypt } from '../utils/crypto';
import { getJwtKeys } from './keys';

// ─── Admin portal role configuration ───────────────────────────────────────────
// Extend this array (e.g. add 'OPS_ADMIN') without touching the login handler.
const ADMIN_PORTAL_ROLES = ['SUPER_ADMIN'];

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

  // ─── Token helpers ───────────────────────────────────────────────────────────

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // ─── Rate-limit / lockout helpers ───────────────────────────────────────────

  /** Track failed login attempts with per-portal keys */
  async handleFailedLogin(email: string, ip: string, portal: 'user' | 'admin' = 'user'): Promise<void> {
    const key = `login_failures:${portal}:${email}`;
    const failures = await this.redis.incr(key);

    if (failures === 1) {
      await this.redis.expire(key, 900); // 15-minute window
    }

    this.logger.warn(`Failed ${portal} login attempt for user ${email} from IP ${ip}. Count: ${failures}`);

    await this.prisma.auditLog.create({
      data: {
        action: portal === 'admin' ? 'ADMIN_LOGIN_ATTEMPT' : 'LOGIN_FAILURE',
        resourceType: 'user',
        ip,
        before: { email, failures, portal, success: false },
      },
    });
  }

  async checkLockout(email: string, portal: 'user' | 'admin' = 'user'): Promise<void> {
    const key = `login_failures:${portal}:${email}`;
    const failures = await this.redis.get(key);
    const failureCount = failures ? parseInt(failures, 10) : 0;

    // Admin portal: stricter — 5 attempts per 15 minutes (controller throttle adds an extra layer)
    // User portal: 10 attempts per 15 minutes (previously 5 — relaxed here, throttle still applies at controller)
    const maxFailures = portal === 'admin' ? 5 : 10;

    if (failureCount >= maxFailures) {
      const ttl = await this.redis.ttl(key);
      const backoffSec = Math.max(0, ttl);
      throw new ForbiddenException({
        message: `Account is temporarily locked. Try again in ${Math.ceil(backoffSec / 60)} minutes.`,
        lockoutDuration: backoffSec,
      });
    }
  }

  async resetLockout(email: string, portal: 'user' | 'admin' = 'user'): Promise<void> {
    await this.redis.del(`login_failures:${portal}:${email}`);
  }

  // ─── JWT / Token generation ─────────────────────────────────────────────────

  async generateAccessToken(user: any): Promise<string> {
    const { privateKey } = getJwtKeys();

    const roles = user.roles.map((r: any) => r.name);

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      roles,
      verticalScope: user.verticalScope || [],
      mustChangePassword: user.mustChangePassword ?? false,
    };

    return this.jwtService.sign(payload, {
      privateKey,
      algorithm: 'RS256',
      expiresIn: '15m',
    });
  }

  async generateRefreshToken(userId: string, userAgent: string, ip: string, familyId?: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

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

  // ─── Login ──────────────────────────────────────────────────────────────────

  /**
   * Validates credentials. If portal === 'admin', enforces ADMIN_PORTAL_ROLES.
   * Returns the same generic error for both wrong password and wrong-portal-role
   * to prevent role/existence enumeration from the admin login form.
   */
  async validateUser(
    email: string,
    pass: string,
    mfaCode?: string,
    ip?: string,
    portal: 'user' | 'admin' = 'user',
  ): Promise<any> {
    await this.checkLockout(email, portal);

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { roles: true },
    });

    // Generic failure path — same message for wrong password AND wrong-portal-role
    const rejectGeneric = async (reason: string): Promise<never> => {
      this.logger.warn(`Login rejected [${portal}] for ${email}: ${reason}`);
      if (ip) await this.handleFailedLogin(email, ip, portal);
      throw new UnauthorizedException('Invalid email or password');
    };

    if (!user || !user.isActive || user.status === 'DISABLED') {
      return rejectGeneric('user not found / inactive / disabled');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      return rejectGeneric('wrong password');
    }

    // Portal enforcement — must happen AFTER password check to avoid timing attacks
    if (portal === 'admin') {
      const userRoleNames = user.roles.map((r: any) => r.name);
      const isAdminEligible = userRoleNames.some((r: string) => ADMIN_PORTAL_ROLES.includes(r));
      if (!isAdminEligible) {
        return rejectGeneric('role not eligible for admin portal');
      }
    }

    // Successful login
    await this.resetLockout(email, portal);

    // Update lastLoginAt
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: portal === 'admin' ? 'ADMIN_LOGIN_ATTEMPT' : 'LOGIN',
        resourceType: 'user',
        resourceId: user.id,
        ip,
        before: { portal, success: true },
      },
    });

    return user;
  }


  // ─── MFA (disabled) ─────────────────────────────────────────────────────────

  async completeMfaSetup(token: string, code: string, ip: string): Promise<any> {
    throw new BadRequestException('MFA is disabled');
  }

  // ─── Refresh Token Rotation & Reuse Detection ───────────────────────────────

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

    const nextRefreshToken = await this.generateRefreshToken(dbToken.userId, userAgent, ip, dbToken.familyId);
    const nextAccessToken = await this.generateAccessToken(dbToken.user);

    return { accessToken: nextAccessToken, refreshToken: nextRefreshToken };
  }

  // ─── Logout ─────────────────────────────────────────────────────────────────

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

  // ─── Password Reset (self-service, requires admin approval) ─────────────────

  /**
   * Stores the reset request as PENDING in Redis.
   * Admin must call approvePendingReset() to generate the actual token.
   */
  async requestPasswordReset(email: string, ip: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return; // Silent — prevent account harvesting
    if (!user.isActive || user.status === 'DISABLED') return;

    // Store pending reset keyed by userId so admin can see who requested it
    await this.redis.setex(`password_reset_pending:${user.id}`, 86400, JSON.stringify({ email: user.email, name: user.name, requestedAt: new Date().toISOString() }));

    this.logger.log(`Password reset pending admin approval for ${email} (userId: ${user.id})`);

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'PASSWORD_RESET_REQUEST',
        resourceType: 'user',
        resourceId: user.id,
        ip,
        before: { status: 'PENDING_ADMIN_APPROVAL' },
      },
    });
  }

  /** Admin approves the pending reset — generates and returns the reset token/link */
  async approvePendingReset(userId: string, actorId: string, ip: string): Promise<{ resetLink: string }> {
    const pending = await this.redis.get(`password_reset_pending:${userId}`);
    if (!pending) {
      throw new BadRequestException('No pending reset request found for this user');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    // 15 minute window to use the link after admin approves
    await this.redis.setex(`password_reset:${tokenHash}`, 900, userId);
    await this.redis.del(`password_reset_pending:${userId}`);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    this.logger.log(`Admin ${actorId} approved password reset for user ${userId}. Link: ${resetLink}`);

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'PASSWORD_RESET_APPROVED',
        resourceType: 'user',
        resourceId: userId,
        ip,
      },
    });

    return { resetLink };
  }

  /** Admin rejects the pending reset request */
  async rejectPendingReset(userId: string, actorId: string, ip: string): Promise<void> {
    await this.redis.del(`password_reset_pending:${userId}`);

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'PASSWORD_RESET_REJECTED',
        resourceType: 'user',
        resourceId: userId,
        ip,
      },
    });
  }

  /** Returns all pending password reset requests (for admin panel) */
  async getPendingResets(): Promise<Array<{ userId: string; email: string; name: string; requestedAt: string }>> {
    // We store keys as password_reset_pending:{userId} — scan our in-memory store
    // InMemoryRedis doesn't support SCAN, so we track pending resets via a set
    const results: Array<{ userId: string; email: string; name: string; requestedAt: string }> = [];

    // Query users who have PENDING_APPROVAL status for password resets via AuditLog
    const recentResets = await this.prisma.auditLog.findMany({
      where: {
        action: 'PASSWORD_RESET_REQUEST',
        createdAt: { gte: new Date(Date.now() - 86400 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const seen = new Set<string>();
    for (const log of recentResets) {
      if (!log.resourceId || seen.has(log.resourceId)) continue;
      const pending = await this.redis.get(`password_reset_pending:${log.resourceId}`);
      if (pending) {
        seen.add(log.resourceId);
        try {
          const data = JSON.parse(pending);
          results.push({ userId: log.resourceId, ...data });
        } catch {}
      }
    }
    return results;
  }

  async confirmPasswordReset(token: string, newPass: string, ip: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const userId = await this.redis.get(`password_reset:${tokenHash}`);

    if (!userId) {
      throw new BadRequestException('Reset token has expired or is invalid');
    }

    const passwordHash = await bcrypt.hash(newPass, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });

    await this.redis.del(`password_reset:${tokenHash}`);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) await this.resetLockout(user.email);

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

  // ─── Force change password (after mustChangePassword flag) ──────────────────

  async changePassword(userId: string, newPass: string, ip: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPass, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'PASSWORD_CHANGED',
        resourceType: 'user',
        resourceId: userId,
        ip,
      },
    });
  }

  // ─── Invite flow ────────────────────────────────────────────────────────────

  /**
   * Admin creates a new user. Generates a 48-hour single-use invite token,
   * stores it hashed in InMemoryRedis. The user has no usable password yet.
   */
  async inviteUser(
    dto: { email: string; name: string; role: string; verticalScope?: string[] },
    actorId: string,
    ip: string,
  ): Promise<{ userId: string; inviteLink: string }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new BadRequestException('A user with this email already exists');
    }

    const dbRole = await this.prisma.role.findUnique({ where: { name: dto.role } });
    if (!dbRole) {
      throw new BadRequestException(`Role "${dto.role}" does not exist`);
    }

    // Unusable placeholder password — the invite token is the real entry point
    const placeholderHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash: placeholderHash,
        verticalScope: dto.verticalScope || [],
        status: 'INVITED',
        mustChangePassword: true,
        invitedBy: actorId,
        invitedAt: new Date(),
        isActive: true,
        roles: { connect: [{ id: dbRole.id }] },
      },
      include: { roles: true },
    });

    const { inviteLink, tokenHash } = await this.generateInviteToken(user.id);

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'USER_INVITED',
        resourceType: 'user',
        resourceId: user.id,
        after: { email: user.email, name: user.name, role: dto.role, verticalScope: user.verticalScope },
        ip,
      },
    });

    return { userId: user.id, inviteLink };
  }

  private async generateInviteToken(userId: string): Promise<{ inviteLink: string; tokenHash: string }> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    // 48 hours = 172800 seconds
    await this.redis.setex(`invite_token:${tokenHash}`, 172800, userId);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const inviteLink = `${frontendUrl}/accept-invite?token=${rawToken}`;
    this.logger.log(`Invite link for user ${userId}: ${inviteLink}`);

    return { inviteLink, tokenHash };
  }

  async resendInvite(userId: string, actorId: string, ip: string): Promise<{ inviteLink: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.status !== 'INVITED') throw new BadRequestException('User is not in INVITED status');

    const { inviteLink } = await this.generateInviteToken(userId);

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'USER_INVITE_RESENT',
        resourceType: 'user',
        resourceId: userId,
        ip,
      },
    });

    return { inviteLink };
  }

  /**
   * POST /auth/accept-invite
   * Validates the invite token, sets the real password, activates the user,
   * and issues tokens so the user lands directly in the app.
   */
  async acceptInvite(
    rawToken: string,
    newPassword: string,
    userAgent: string,
    ip: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const userId = await this.redis.get(`invite_token:${tokenHash}`);

    if (!userId) {
      throw new BadRequestException('Invite link has expired or has already been used');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        status: 'ACTIVE',
        mustChangePassword: false,
        isActive: true,
        lastLoginAt: new Date(),
      },
      include: { roles: true },
    });

    // Invalidate token immediately after use
    await this.redis.del(`invite_token:${tokenHash}`);

    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(userId, userAgent, ip);

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'USER_INVITE_ACCEPTED',
        resourceType: 'user',
        resourceId: userId,
        ip,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles.map((r: any) => r.name),
        verticalScope: user.verticalScope,
        mustChangePassword: false,
      },
    };
  }

  // ─── Admin user management helpers ─────────────────────────────────────────

  /** Admin-forced password reset: sets mustChangePassword, revokes all sessions */
  async adminResetPassword(userId: string, actorId: string, ip: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { mustChangePassword: true },
    });

    // Revoke all active refresh tokens — forces immediate re-login
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'USER_PASSWORD_RESET_FORCED',
        resourceType: 'user',
        resourceId: userId,
        ip,
      },
    });
  }

  /** Immediately invalidates all of a user's refresh tokens */
  async revokeUserSessions(userId: string, actorId: string, ip: string): Promise<{ revokedCount: number }> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'USER_SESSIONS_REVOKED',
        resourceType: 'user',
        resourceId: userId,
        after: { revokedCount: result.count },
        ip,
      },
    });

    return { revokedCount: result.count };
  }

  /** Disables a user account and revokes all sessions */
  async disableUser(userId: string, actorId: string, ip: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'DISABLED', isActive: false },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'USER_DISABLED',
        resourceType: 'user',
        resourceId: userId,
        before: { status: user.status },
        after: { status: 'DISABLED' },
        ip,
      },
    });
  }

  // ─── Self-service Sign Up (requires admin approval) ────────────────────────

  async signUp(
    dto: { email: string; name: string; password: string },
    ip: string,
  ): Promise<{ message: string }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      // Generic message — don't reveal whether email exists
      return { message: 'Registration request submitted. Awaiting admin approval.' };
    }

    // Assign a default viewer role
    const viewerRole = await this.prisma.role.findFirst({ where: { name: 'VIEWER' } });

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        verticalScope: [],
        status: 'PENDING_APPROVAL',
        isActive: false,
        mustChangePassword: false,
        ...(viewerRole ? { roles: { connect: [{ id: viewerRole.id }] } } : {}),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'USER_SIGNUP_REQUEST',
        resourceType: 'user',
        resourceId: user.id,
        ip,
        after: { email: user.email, name: user.name, status: 'PENDING_APPROVAL' },
      },
    });

    this.logger.log(`New sign-up request from ${dto.email} — awaiting admin approval.`);
    return { message: 'Registration request submitted. Awaiting admin approval.' };
  }

  /** Admin approves a PENDING_APPROVAL user — activates their account */
  async approveSignUp(userId: string, actorId: string, ip: string, role?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { roles: true } });
    if (!user) throw new BadRequestException('User not found');
    if (user.status !== 'PENDING_APPROVAL') throw new BadRequestException('User is not pending approval');

    const updateData: any = { status: 'ACTIVE', isActive: true };

    // Optionally assign a specific role on approval
    if (role) {
      const dbRole = await this.prisma.role.findUnique({ where: { name: role } });
      if (dbRole) {
        updateData.roles = { set: [{ id: dbRole.id }] };
      }
    }

    await this.prisma.user.update({ where: { id: userId }, data: updateData });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'USER_SIGNUP_APPROVED',
        resourceType: 'user',
        resourceId: userId,
        ip,
        after: { status: 'ACTIVE' },
      },
    });
  }

  /** Admin rejects a PENDING_APPROVAL user — marks as REJECTED and deactivates */
  async rejectSignUp(userId: string, actorId: string, ip: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'DISABLED', isActive: false },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'USER_SIGNUP_REJECTED',
        resourceType: 'user',
        resourceId: userId,
        ip,
      },
    });
  }

  /** Re-enables a previously disabled user */
  async enableUser(userId: string, actorId: string, ip: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE', isActive: true },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'USER_ENABLED',
        resourceType: 'user',
        resourceId: userId,
        before: { status: user.status },
        after: { status: 'ACTIVE' },
        ip,
      },
    });
  }
}
