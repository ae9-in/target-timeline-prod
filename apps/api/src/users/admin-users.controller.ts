import {
  Controller, Get, Post, Patch, Body, Param, Req, Ip,
  UseGuards, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermission } from '../rbac/require-permission.decorator';

/**
 * All endpoints here are under /admin/users.
 * Every endpoint requires JWT auth + explicit @RequirePermission.
 * SUPER_ADMIN is the only role with 'user' permissions per the DB seed.
 * A second admin-tier role can be granted these permissions in the future
 * without any code change — the PermissionsGuard is DB-driven.
 */
@Controller('admin/users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminUsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  // ─── List users (with filters) ──────────────────────────────────────────────

  @Get()
  @RequirePermission('user', 'read')
  async findAll(
    @Query('role') role?: string,
    @Query('vertical') vertical?: string,
    @Query('status') status?: string,
  ) {
    return this.usersService.findAll({ role, vertical, status });
  }

  // ─── Get single user ────────────────────────────────────────────────────────

  @Get(':id')
  @RequirePermission('user', 'read')
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  // ─── Invite / create user ────────────────────────────────────────────────────

  @Post()
  @RequirePermission('user', 'create')
  @HttpCode(HttpStatus.CREATED)
  async inviteUser(
    @Body() dto: InviteUserDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    return this.authService.inviteUser(dto, req.user.sub, ip || 'Unknown');
  }

  // ─── Update role / verticalScope / status ───────────────────────────────────

  @Patch(':id')
  @RequirePermission('user', 'update')
  async updateUser(
    @Param('id') id: string,
    @Body() body: { roles?: string[]; verticalScope?: string[]; status?: string },
    @Req() req: any,
    @Ip() ip: string,
  ) {
    return this.usersService.updateUser(id, body, req.user.sub, ip || 'Unknown');
  }

  // ─── Resend invite ───────────────────────────────────────────────────────────

  @Post(':id/resend-invite')
  @RequirePermission('user', 'update')
  @HttpCode(HttpStatus.OK)
  async resendInvite(
    @Param('id') id: string,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    return this.authService.resendInvite(id, req.user.sub, ip || 'Unknown');
  }

  // ─── Admin-triggered password reset ─────────────────────────────────────────

  @Post(':id/reset-password')
  @RequirePermission('user', 'update')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Param('id') id: string,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    await this.authService.adminResetPassword(id, req.user.sub, ip || 'Unknown');
    return { success: true, message: 'User will be required to set a new password on next login.' };
  }

  // ─── Revoke sessions ─────────────────────────────────────────────────────────

  @Post(':id/revoke-sessions')
  @RequirePermission('user', 'update')
  @HttpCode(HttpStatus.OK)
  async revokeSessions(
    @Param('id') id: string,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    return this.authService.revokeUserSessions(id, req.user.sub, ip || 'Unknown');
  }

  // ─── Disable user ────────────────────────────────────────────────────────────

  @Patch(':id/disable')
  @RequirePermission('user', 'update')
  @HttpCode(HttpStatus.OK)
  async disableUser(
    @Param('id') id: string,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    await this.authService.disableUser(id, req.user.sub, ip || 'Unknown');
    return { success: true };
  }

  // ─── Enable user ─────────────────────────────────────────────────────────────

  @Patch(':id/enable')
  @RequirePermission('user', 'update')
  @HttpCode(HttpStatus.OK)
  async enableUser(
    @Param('id') id: string,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    await this.authService.enableUser(id, req.user.sub, ip || 'Unknown');
    return { success: true };
  }

  // ─── Pending sign-up approvals ───────────────────────────────────────────────

  @Get('pending-signups')
  @RequirePermission('user', 'read')
  async getPendingSignups() {
    return this.usersService.findAll({ status: 'PENDING_APPROVAL' });
  }

  @Post(':id/approve-signup')
  @RequirePermission('user', 'update')
  @HttpCode(HttpStatus.OK)
  async approveSignup(
    @Param('id') id: string,
    @Body() body: { role?: string },
    @Req() req: any,
    @Ip() ip: string,
  ) {
    await this.authService.approveSignUp(id, req.user.sub, ip || 'Unknown', body.role);
    return { success: true, message: 'User account activated.' };
  }

  @Post(':id/reject-signup')
  @RequirePermission('user', 'update')
  @HttpCode(HttpStatus.OK)
  async rejectSignup(
    @Param('id') id: string,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    await this.authService.rejectSignUp(id, req.user.sub, ip || 'Unknown');
    return { success: true, message: 'Sign-up request rejected.' };
  }

  // ─── Pending password reset approvals ─────────────────────────────────────────

  @Get('pending-resets')
  @RequirePermission('user', 'read')
  async getPendingResets() {
    return this.authService.getPendingResets();
  }

  @Post(':id/approve-reset')
  @RequirePermission('user', 'update')
  @HttpCode(HttpStatus.OK)
  async approveReset(
    @Param('id') id: string,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    return this.authService.approvePendingReset(id, req.user.sub, ip || 'Unknown');
  }

  @Post(':id/reject-reset')
  @RequirePermission('user', 'update')
  @HttpCode(HttpStatus.OK)
  async rejectReset(
    @Param('id') id: string,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    await this.authService.rejectPendingReset(id, req.user.sub, ip || 'Unknown');
    return { success: true, message: 'Password reset request rejected.' };
  }
}
