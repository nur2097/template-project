import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../../shared/database/prisma.service";
import { ConfigService } from "@nestjs/config";
import { CryptoUtil } from "../../../common/utils/crypto.util";
import { PasswordUtil } from "../../../common/utils/password.util";

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService
  ) {}

  async generateResetToken(email: string): Promise<string> {
    const user = await this.prismaService.user.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.status !== "ACTIVE") {
      throw new BadRequestException("User account is not active");
    }

    // Generate reset token
    const resetToken = CryptoUtil.generateResetToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    // Invalidate any existing reset tokens for this user
    await this.prismaService.passwordReset.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Create new reset token
    await this.prismaService.passwordReset.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt,
      },
    });

    return resetToken;
  }

  async validateResetToken(token: string): Promise<any> {
    const resetRecord = await this.prismaService.passwordReset.findUnique({
      where: { token },
      include: {
        user: {
          include: { company: true },
        },
      },
    });

    if (!resetRecord) {
      throw new BadRequestException("Invalid reset token");
    }

    if (resetRecord.used) {
      throw new BadRequestException("Reset token has already been used");
    }

    if (resetRecord.expiresAt < new Date()) {
      throw new BadRequestException("Reset token has expired");
    }

    if (resetRecord.user.status !== "ACTIVE") {
      throw new BadRequestException("User account is not active");
    }

    return resetRecord;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetRecord = await this.validateResetToken(token);

    // Hash the new password
    const hashedPassword = await PasswordUtil.hash(newPassword);

    // Update password and mark token as used
    await this.prismaService.$transaction([
      this.prismaService.user.update({
        where: { id: resetRecord.userId },
        data: {
          password: hashedPassword,
          passwordChangedAt: new Date(),
        },
      }),
      this.prismaService.passwordReset.update({
        where: { id: resetRecord.id },
        data: { used: true },
      }),
      // Invalidate all refresh tokens for the user (force re-login)
      this.prismaService.refreshToken.deleteMany({
        where: { userId: resetRecord.userId },
      }),
    ]);
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Verify current password
    const isCurrentPasswordValid = await PasswordUtil.compare(
      currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException("Current password is incorrect");
    }

    // Check if new password is different from current
    const isSamePassword = await PasswordUtil.compare(
      newPassword,
      user.password
    );
    if (isSamePassword) {
      throw new BadRequestException(
        "New password must be different from current password"
      );
    }

    // Hash new password
    const hashedPassword = await PasswordUtil.hash(newPassword);

    // Update password
    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      },
    });
  }

  async cleanupExpiredTokens(): Promise<void> {
    await this.prismaService.passwordReset.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}
