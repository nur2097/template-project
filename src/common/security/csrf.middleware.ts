import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { ConfigurationService } from "../../config/configuration.service";
import * as crypto from "crypto";

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CsrfMiddleware.name);
  private readonly tokenSecret: string;
  private readonly tokenExpiry = 1000 * 60 * 60; // 1 hour

  constructor(private readonly configService: ConfigurationService) {
    // Use JWT secret for CSRF token generation or fallback
    this.tokenSecret = this.configService.jwtSecret || "csrf-fallback-secret";
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Debug logging for path resolution
    this.logger.debug(`CSRF Middleware: ${req.method} ${req.path}`, {
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      url: req.url,
    });

    // Only enable CSRF in production or when explicitly enabled
    const isEnabled =
      this.configService.csrfEnabled || this.configService.isProduction;

    if (!isEnabled) {
      this.logger.debug(`CSRF disabled, passing through: ${req.path}`);
      return next();
    }

    // Skip CSRF for API endpoints that use Bearer tokens (stateless)
    const authHeader = req.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return next();
    }

    // Skip for specific paths - Updated for /api/v1 versioning
    const skipPaths = [
      "/api/v1/auth/login",
      "/api/v1/auth/register",
      "/api/v1/auth/refresh",
      "/api/v1/health",
      "/api/v1", // Allow root API endpoint
      "/api/v1/status",
      "/api/v1/test", // Allow test endpoint
      "/api/docs", // Swagger docs (no version)
      "/metrics", // Metrics (no version)
    ];

    // Check both req.path and req.originalUrl for proper path matching
    const requestPath = req.originalUrl || req.path;

    if (skipPaths.some((path) => requestPath.startsWith(path))) {
      this.logger.debug(`CSRF: Skipping path ${requestPath}`);
      return next();
    }

    this.logger.error(
      `CSRF: NOT skipping path' ${req.path}', skipPaths: '${JSON.stringify(skipPaths)}`
    );

    // Skip for safe methods
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      // Generate and set CSRF token for GET requests
      this.setCSRFToken(req, res);
      return next();
    }

    // Validate CSRF token for state-changing operations
    if (!this.validateCSRFToken(req)) {
      this.logger.warn(`CSRF validation failed for ${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        referer: req.get("Referer"),
      });

      return res.status(403).json({
        error: "CSRF_TOKEN_INVALID",
        message: "CSRF protection: Invalid or missing token",
      });
    }

    next();
  }

  private setCSRFToken(req: Request, res: Response): void {
    // Generate session-based CSRF token
    const sessionId = this.getOrCreateSessionId(req, res);
    const timestamp = Date.now();
    const token = this.generateCSRFToken(sessionId, timestamp);

    // Set token in response header and cookie
    res.set("X-CSRF-Token", token);
    res.cookie("csrf-token", token, {
      httpOnly: false, // Client needs to read this
      secure: this.configService.isProduction,
      sameSite: "strict",
      maxAge: this.tokenExpiry,
    });
  }

  private validateCSRFToken(req: Request): boolean {
    // Get token from header or body
    const token =
      req.get("X-CSRF-Token") ||
      req.body?.csrfToken ||
      req.cookies?.["csrf-token"];

    if (!token) {
      return false;
    }

    try {
      const sessionId = this.getSessionId(req);
      if (!sessionId) {
        return false;
      }

      return this.verifyCSRFToken(token, sessionId);
    } catch (error) {
      this.logger.error("CSRF token validation error:", error);
      return false;
    }
  }

  private generateCSRFToken(sessionId: string, timestamp: number): string {
    const payload = `${sessionId}:${timestamp}`;
    const signature = crypto
      .createHmac("sha256", this.tokenSecret)
      .update(payload)
      .digest("base64url");

    return `${Buffer.from(payload).toString("base64url")}.${signature}`;
  }

  private verifyCSRFToken(token: string, sessionId: string): boolean {
    try {
      const [payloadBase64, signature] = token.split(".");
      if (!payloadBase64 || !signature) {
        return false;
      }

      const payload = Buffer.from(payloadBase64, "base64url").toString();
      const [tokenSessionId, timestampStr] = payload.split(":");

      // Verify session ID matches
      if (tokenSessionId !== sessionId) {
        return false;
      }

      // Verify token hasn't expired
      const timestamp = parseInt(timestampStr);
      if (Date.now() - timestamp > this.tokenExpiry) {
        return false;
      }

      // Verify signature
      const expectedSignature = crypto
        .createHmac("sha256", this.tokenSecret)
        .update(payload)
        .digest("base64url");

      return crypto.timingSafeEqual(
        Buffer.from(signature, "base64url"),
        Buffer.from(expectedSignature, "base64url")
      );
    } catch {
      return false;
    }
  }

  private getOrCreateSessionId(req: Request, res: Response): string {
    let sessionId = req.cookies?.["session-id"];

    if (!sessionId) {
      sessionId = crypto.randomBytes(32).toString("base64url");
      res.cookie("session-id", sessionId, {
        httpOnly: true,
        secure: this.configService.isProduction,
        sameSite: "strict",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      });
    }

    return sessionId;
  }

  private getSessionId(req: Request): string | null {
    return req.cookies?.["session-id"] || null;
  }
}
