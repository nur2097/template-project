import { z } from "zod";

// Environment validation schema using Zod
export const envSchema = z.object({
  // Node Environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development")
    .describe("Application environment"),

  // Server Configuration
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0 && val < 65536, {
      message: "PORT must be between 1 and 65535",
    })
    .default("3000")
    .describe("Server port number"),

  API_PREFIX: z.string().min(1).default("api").describe("API route prefix"),

  // Database Configuration
  DATABASE_URL: z
    .string()
    .url()
    .refine(
      (url) => url.startsWith("postgresql://") || url.startsWith("postgres://"),
      {
        message: "DATABASE_URL must be a valid PostgreSQL connection string",
      }
    )
    .describe("PostgreSQL database connection URL"),

  // MongoDB Configuration (for logging)
  MONGODB_URI: z
    .string()
    .url()
    .refine(
      (url) => url.startsWith("mongodb://") || url.startsWith("mongodb+srv://"),
      {
        message: "MONGODB_URI must be a valid MongoDB connection string",
      }
    )
    .describe("MongoDB connection URL for logging"),

  MONGODB_LOG_DB: z
    .string()
    .url()
    .refine(
      (url) => url.startsWith("mongodb://") || url.startsWith("mongodb+srv://"),
      {
        message: "MONGODB_LOG_DB must be a valid MongoDB connection string",
      }
    )
    .optional()
    .describe("MongoDB log database connection URL (optional)"),

  // Redis Configuration
  REDIS_HOST: z
    .string()
    .min(1)
    .default("localhost")
    .describe("Redis server host"),

  REDIS_PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0 && val < 65536, {
      message: "REDIS_PORT must be between 1 and 65535",
    })
    .default("6379")
    .describe("Redis server port"),

  REDIS_PASSWORD: z
    .string()
    .optional()
    .describe("Redis server password (optional)"),

  // JWT Configuration
  JWT_SECRET: z
    .string()
    .min(32, {
      message: "JWT_SECRET must be at least 32 characters long for security",
    })
    .describe("JWT signing secret key"),

  JWT_EXPIRES_IN: z
    .string()
    .regex(/^(\d+[smhd]|\d+)$/, {
      message:
        "JWT_EXPIRES_IN must be a valid time format (e.g., '1h', '30m', '7d')",
    })
    .default("1h")
    .describe("JWT token expiration time"),

  // CORS Configuration
  CORS_ORIGIN: z.string().default("*").describe("CORS allowed origins"),

  // Logging Configuration
  LOG_LEVEL: z
    .enum(["error", "warn", "info", "verbose", "debug", "silly"])
    .default("info")
    .describe("Winston log level"),

  LOG_TO_MONGODB: z
    .string()
    .transform((val) => val.toLowerCase())
    .refine((val) => ["true", "false"].includes(val), {
      message: "LOG_TO_MONGODB must be 'true' or 'false'",
    })
    .transform((val) => val === "true")
    .default("true")
    .describe("Enable logging to MongoDB"),

  // Swagger Configuration
  SWAGGER_ENABLED: z
    .string()
    .transform((val) => val.toLowerCase())
    .refine((val) => ["true", "false"].includes(val), {
      message: "SWAGGER_ENABLED must be 'true' or 'false'",
    })
    .transform((val) => val === "true")
    .default("true")
    .describe("Enable Swagger API documentation"),

  // Email Configuration (Optional)
  RESEND_API_KEY: z
    .string()
    .optional()
    .describe("Resend API key for email service"),

  // Frontend URL
  FRONTEND_URL: z
    .string()
    .url()
    .default("http://localhost:3000")
    .describe("Frontend application URL for email links"),

  FROM_EMAIL: z
    .string()
    .email()
    .default("noreply@example.com")
    .describe("Default from email address"),

  FROM_NAME: z
    .string()
    .default("API Service")
    .describe("Default from name for emails"),

  // Rate Limiting
  THROTTLE_TTL: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, {
      message: "THROTTLE_TTL must be a positive number",
    })
    .default("60")
    .describe("Rate limiting time window in seconds"),

  THROTTLE_LIMIT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, {
      message: "THROTTLE_LIMIT must be a positive number",
    })
    .default("100")
    .describe("Rate limiting request limit per window"),

  // Security
  BCRYPT_ROUNDS: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val >= 8 && val <= 15, {
      message:
        "BCRYPT_ROUNDS must be between 8 and 15 for optimal security/performance balance",
    })
    .default("10")
    .describe("BCrypt hashing rounds"),

  // File Upload
  MAX_FILE_SIZE: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, {
      message: "MAX_FILE_SIZE must be a positive number",
    })
    .default("10485760") // 10MB
    .describe("Maximum file upload size in bytes"),

  UPLOAD_DEST: z
    .string()
    .default("./uploads")
    .describe("File upload destination directory"),

  // OpenTelemetry Configuration
  OTEL_EXPORTER_JAEGER_ENDPOINT: z
    .string()
    .url()
    .optional()
    .describe("Jaeger endpoint for OpenTelemetry traces"),

  OTEL_SERVICE_NAME: z
    .string()
    .default("nestjs-enterprise-api")
    .describe("Service name for OpenTelemetry"),

  OTEL_SERVICE_VERSION: z
    .string()
    .default("1.0.0")
    .describe("Service version for OpenTelemetry"),

  TRACING_ENABLED: z
    .string()
    .transform((val) => val.toLowerCase())
    .refine((val) => ["true", "false"].includes(val), {
      message: "TRACING_ENABLED must be 'true' or 'false'",
    })
    .transform((val) => val === "true")
    .default("true")
    .describe("Enable OpenTelemetry tracing"),

  // Cache Configuration
  CACHE_TTL: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, {
      message: "CACHE_TTL must be a positive number",
    })
    .default("300") // 5 minutes
    .describe("Default cache TTL in seconds"),

  CACHE_MAX_ITEMS: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, {
      message: "CACHE_MAX_ITEMS must be a positive number",
    })
    .default("100")
    .describe("Maximum number of cached items"),
});

// Type inference for the validated environment
export type Environment = z.infer<typeof envSchema>;

// Environment validation function
export function validateEnvironment(): Environment {
  try {
    // Parse and validate environment variables
    const parsed = envSchema.parse(process.env);

    console.log("✅ Environment variables validated successfully");

    // Log some non-sensitive config info in development
    if (parsed.NODE_ENV === "development") {
      console.log(`🚀 Server will run on port: ${parsed.PORT}`);
      console.log(`📊 API prefix: /${parsed.API_PREFIX}`);
      console.log(`📝 Log level: ${parsed.LOG_LEVEL}`);
      console.log(`📚 Swagger enabled: ${parsed.SWAGGER_ENABLED}`);
    }

    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Environment validation failed:");
      console.error("🔍 Missing or invalid environment variables:");

      error.errors.forEach((err) => {
        const field = err.path.join(".");
        const message = err.message;
        console.error(`  • ${field}: ${message}`);
      });

      console.error(
        "\n💡 Please check your .env file and ensure all required variables are set correctly."
      );
      console.error(
        "📖 Refer to .env.example for the complete list of variables.\n"
      );
    } else {
      console.error(
        "❌ Unexpected error during environment validation:",
        error
      );
    }

    process.exit(1);
  }
}
