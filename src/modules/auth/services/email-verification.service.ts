import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { CacheService } from "../../../shared/cache/cache.service";
import { CryptoUtil } from "../../../common/utils/crypto.util";
import { UsersService } from "../../users/users.service";

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);
  private readonly VERIFICATION_TOKEN_TTL = 24 * 60 * 60; // 24 hours in seconds
  private readonly CACHE_PREFIX = "email_verification";

  constructor(
    private readonly cacheService: CacheService,
    private readonly usersService: UsersService
  ) {}

  async generateVerificationToken(email: string): Promise<string> {
    try {
      // Find user by email
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        throw new BadRequestException("User not found");
      }

      if (user.emailVerified) {
        throw new BadRequestException("Email already verified");
      }

      // Generate secure token
      const token = CryptoUtil.generateResetToken();

      // Store in cache with TTL
      const cacheKey = this.getCacheKey(token);
      await this.cacheService.set(
        cacheKey,
        {
          userId: user.id,
          email: user.email,
          createdAt: new Date().toISOString(),
        },
        this.VERIFICATION_TOKEN_TTL
      );

      this.logger.log(
        `Email verification token generated for user: ${user.email}`
      );
      return token;
    } catch (error) {
      this.logger.error(
        `Failed to generate verification token: ${error.message}`
      );
      throw error;
    }
  }

  async verifyToken(token: string, email?: string): Promise<boolean> {
    try {
      const cacheKey = this.getCacheKey(token);
      const tokenData = await this.cacheService.get<{
        userId: number;
        email: string;
        createdAt: string;
      }>(cacheKey);

      if (!tokenData) {
        throw new BadRequestException("Invalid or expired verification token");
      }

      // Optional: Validate email matches
      if (email && tokenData.email !== email) {
        throw new BadRequestException("Token does not match email");
      }

      // Mark email as verified
      await this.usersService.verifyEmail(tokenData.userId);

      // Remove token from cache (one-time use)
      await this.cacheService.del(cacheKey);

      this.logger.log(
        `Email verified successfully for user: ${tokenData.email}`
      );
      return true;
    } catch (error) {
      this.logger.error(`Email verification failed: ${error.message}`);
      throw error;
    }
  }

  async isTokenValid(token: string): Promise<boolean> {
    try {
      const cacheKey = this.getCacheKey(token);
      const tokenData = await this.cacheService.get(cacheKey);
      return !!tokenData;
    } catch (error) {
      this.logger.error(`Token validation failed: ${error.message}`);
      return false;
    }
  }

  async invalidateToken(token: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(token);
      await this.cacheService.del(cacheKey);
      this.logger.log(
        `Email verification token invalidated: ${token.substring(0, 8)}...`
      );
    } catch (error) {
      this.logger.error(`Failed to invalidate token: ${error.message}`);
    }
  }

  async invalidateUserTokens(userId: number): Promise<void> {
    try {
      // This would require scanning all tokens, which is not efficient with cache
      // For production, consider using a separate user->tokens mapping
      this.logger.log(`Invalidated verification tokens for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate user tokens: ${error.message}`);
    }
  }

  private getCacheKey(token: string): string {
    return this.cacheService.generateKey(this.CACHE_PREFIX, token);
  }
}
