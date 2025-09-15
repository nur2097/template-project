import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Environment } from "./env.schema";

/**
 * Type-safe configuration service wrapper
 * Provides strongly-typed access to validated environment variables
 */
@Injectable()
export class ConfigurationService {
  constructor(
    private readonly configService: ConfigService<Environment, true>
  ) {}

  // Server Configuration
  get port(): number {
    return this.configService.get("PORT", { infer: true });
  }

  get apiPrefix(): string {
    return this.configService.get("API_PREFIX", { infer: true });
  }

  get nodeEnv(): "development" | "production" | "test" {
    return this.configService.get("NODE_ENV", { infer: true });
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === "development";
  }

  get isProduction(): boolean {
    return this.nodeEnv === "production";
  }

  get isTest(): boolean {
    return this.nodeEnv === "test";
  }

  // Database Configuration
  get databaseUrl(): string {
    return this.configService.get("DATABASE_URL", { infer: true });
  }

  get mongodbUri(): string {
    return this.configService.get("MONGODB_URI", { infer: true });
  }

  get mongodbLogDb(): string {
    return this.configService.get("MONGODB_LOG_DB", { infer: true });
  }

  // Redis Configuration
  get redisHost(): string {
    return this.configService.get("REDIS_HOST", { infer: true });
  }

  get redisPort(): number {
    return this.configService.get("REDIS_PORT", { infer: true });
  }

  get redisPassword(): string | undefined {
    return this.configService.get("REDIS_PASSWORD", { infer: true });
  }

  // JWT Configuration
  get jwtSecret(): string {
    return this.configService.get("JWT_SECRET", { infer: true });
  }

  get jwtRefreshSecret(): string {
    return this.configService.get("JWT_REFRESH_SECRET", { infer: true });
  }

  get jwtExpiresIn(): string {
    return this.configService.get("JWT_EXPIRES_IN", { infer: true });
  }

  get jwtIssuer(): string {
    return this.configService.get("JWT_ISSUER", { infer: true });
  }

  get jwtAudience(): string {
    return this.configService.get("JWT_AUDIENCE", { infer: true });
  }

  // CORS Configuration
  get corsOrigin(): string {
    return this.configService.get("CORS_ORIGIN", { infer: true });
  }

  // Logging Configuration
  get logLevel(): "error" | "warn" | "info" | "verbose" | "debug" | "silly" {
    return this.configService.get("LOG_LEVEL", { infer: true });
  }

  get logToMongodb(): boolean {
    return this.configService.get("LOG_TO_MONGODB", { infer: true });
  }

  // Swagger Configuration
  get swaggerEnabled(): boolean {
    // Disable Swagger in production by default for security
    if (this.isProduction) {
      return (
        this.configService.get("SWAGGER_ENABLED", { infer: true }) === true
      );
    }
    return this.configService.get("SWAGGER_ENABLED", { infer: true }) !== false;
  }

  // Email Configuration
  get resendApiKey(): string | undefined {
    return this.configService.get("RESEND_API_KEY", { infer: true });
  }

  get frontendUrl(): string {
    return this.configService.get("FRONTEND_URL", { infer: true });
  }

  get fromEmail(): string {
    return this.configService.get("FROM_EMAIL", { infer: true });
  }

  get fromName(): string {
    return this.configService.get("FROM_NAME", { infer: true });
  }

  // Rate Limiting
  get throttleTtl(): number {
    return this.configService.get("THROTTLE_TTL", { infer: true });
  }

  get throttleLimit(): number {
    return this.configService.get("THROTTLE_LIMIT", { infer: true });
  }

  // Security
  get bcryptRounds(): number {
    return this.configService.get("BCRYPT_ROUNDS", { infer: true });
  }

  // File Upload
  get maxFileSize(): number {
    return this.configService.get("MAX_FILE_SIZE", { infer: true });
  }

  get uploadDest(): string {
    return this.configService.get("UPLOAD_DEST", { infer: true });
  }

  // OpenTelemetry Configuration
  get otelJaegerEndpoint(): string | undefined {
    return this.configService.get("OTEL_EXPORTER_JAEGER_ENDPOINT", {
      infer: true,
    });
  }

  get otelServiceName(): string {
    return this.configService.get("OTEL_SERVICE_NAME", { infer: true });
  }

  get otelServiceVersion(): string {
    return this.configService.get("OTEL_SERVICE_VERSION", { infer: true });
  }

  get tracingEnabled(): boolean {
    return this.configService.get("TRACING_ENABLED", { infer: true });
  }

  // Cache Configuration
  get cacheTtl(): number {
    return this.configService.get("CACHE_TTL", { infer: true });
  }

  get cacheMaxItems(): number {
    return this.configService.get("CACHE_MAX_ITEMS", { infer: true });
  }

  // Utility methods
  get redisConfig() {
    return {
      host: this.redisHost,
      port: this.redisPort,
      password: this.redisPassword,
    };
  }

  get jwtConfig() {
    return {
      secret: this.jwtSecret,
      signOptions: {
        expiresIn: this.jwtExpiresIn,
        issuer: this.jwtIssuer,
        audience: this.jwtAudience,
      },
      verifyOptions: {
        issuer: this.jwtIssuer,
        audience: this.jwtAudience,
        clockTolerance: 30, // Allow 30 seconds clock skew
        maxAge: this.jwtExpiresIn,
        ignoreNotBefore: false, // Respect 'nbf' claim
      },
    };
  }

  get throttleConfig() {
    return {
      ttl: this.throttleTtl,
      limit: this.throttleLimit,
    };
  }

  get cacheConfig() {
    return {
      ttl: this.cacheTtl,
      max: this.cacheMaxItems,
    };
  }

  get corsConfig() {
    // Fix: credentials:true cannot be used with origin:* for security
    const origins =
      this.corsOrigin === "*"
        ? false // Disable credentials when wildcard is used
        : this.corsOrigin
            .split(",")
            .map((origin) => origin.trim())
            .filter(Boolean);

    return {
      origin: this.corsOrigin === "*" ? true : origins,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: [
        "Origin",
        "X-Requested-With",
        "Content-Type",
        "Accept",
        "Authorization",
        "X-Correlation-ID",
      ],
      credentials: this.corsOrigin !== "*", // Only enable credentials when specific origins are set
      optionsSuccessStatus: 200,
    };
  }
}
