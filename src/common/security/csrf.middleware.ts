import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CsrfMiddleware.name);
  private csrfProtection: any;

  constructor(private readonly configService: ConfigService) {
    // Only enable CSRF in production or when explicitly enabled
    const isEnabled = this.configService.get('CSRF_ENABLED') === 'true' || 
                     process.env.NODE_ENV === 'production';

    if (isEnabled) {
      this.logger.warn('CSRF middleware is disabled as csurf package is deprecated. Consider using alternative CSRF protection.');
      // For now, implement a basic CSRF check instead of using the deprecated csurf package
      this.csrfProtection = (req: Request, res: Response, next: NextFunction) => {
        // Skip CSRF for API endpoints that use Bearer tokens
        const authHeader = req.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          return next();
        }

        // Skip for specific paths
        const skipPaths = [
          '/api/auth/login',
          '/api/auth/register',
          '/api/health',
          '/api/docs',
          '/api/metrics',
        ];

        if (skipPaths.some(path => req.path.startsWith(path))) {
          return next();
        }

        // Skip for safe methods
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
          return next();
        }

        // Basic referer check as a simple CSRF protection
        const referer = req.get('Referer');
        const origin = req.get('Origin');
        const host = req.get('Host');

        if (referer || origin) {
          const requestHost = referer ? new URL(referer).host : new URL(origin).host;
          if (requestHost !== host) {
            return res.status(403).json({ error: 'CSRF protection: Invalid referer/origin' });
          }
        }

        next();
      };
    } else {
      // No-op middleware for development
      this.csrfProtection = (req: Request, res: Response, next: NextFunction) => {
        next();
      };
    }
  }

  use(req: Request, res: Response, next: NextFunction) {
    this.csrfProtection(req, res, next);
  }
}