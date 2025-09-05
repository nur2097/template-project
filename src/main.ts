import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import * as compression from "compression";
import helmet from "helmet";
import { NestLoggerWrapper } from "./common/logger/nest-logger-wrapper";
import { ConfigurationService } from "./config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get type-safe configuration service
  const configService = app.get(ConfigurationService);

  // Custom logger
  const customLogger = app.get(NestLoggerWrapper);
  app.useLogger(customLogger);

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // Global prefix
  app.setGlobalPrefix(configService.apiPrefix);

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });

  // CORS - Centralized configuration
  app.enableCors(configService.corsConfig);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Global filters & interceptors will be handled through APP_FILTER and APP_INTERCEPTOR providers
  // in their respective modules to enable proper dependency injection

  // Swagger documentation
  if (configService.swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle("NestJS Enterprise API")
      .setDescription(
        `
        <h3>Enterprise-grade NestJS API with comprehensive features</h3>
        <p><strong>Features:</strong></p>
        <ul>
          <li>🔐 JWT Authentication with refresh tokens</li>
          <li>👥 Multi-tenant architecture with company isolation</li>
          <li>🛡️ Role-based access control (RBAC)</li>
          <li>📊 Comprehensive health monitoring</li>
          <li>🔄 Standardized response format</li>
          <li>📝 Request/response validation</li>
          <li>🚀 Performance monitoring</li>
          <li>📈 OpenTelemetry tracing</li>
          <li>🔒 Rate limiting and security</li>
        </ul>
        
        <h4>Response Format</h4>
        <p>All API responses follow a standardized format:</p>
        <pre>
{
  "statusCode": 200,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "message": "Operation completed successfully",
  "data": { ... },
  "meta": { ... } // optional
}
        </pre>

        <h4>Error Format</h4>
        <p>Error responses include specific error codes for better handling:</p>
        <pre>
{
  "statusCode": 400,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "message": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "context": { ... } // optional
}
        </pre>

        <h4>Authentication</h4>
        <p>Use the <code>/auth/login</code> endpoint to obtain tokens, then include the access token in the Authorization header:</p>
        <code>Authorization: Bearer &lt;access_token&gt;</code>
      `
      )
      .setVersion("1.0.0")
      .addBearerAuth(
        {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          name: "JWT",
          description: "Enter JWT token",
          in: "header",
        },
        "JWT"
      )
      .addTag("Authentication", "User authentication and authorization")
      .addTag("Users", "User management operations")
      .addTag("Companies", "Multi-tenant company management")
      .addTag("Roles & Permissions", "Role-based access control")
      .addTag("Health", "System health monitoring")
      .addTag("Enhanced Health", "Advanced health monitoring with alerting")
      .addTag("Email", "Email service operations")
      .addTag("Upload", "File upload operations")
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(`${configService.apiPrefix}/docs`, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: "alpha",
        operationsSorter: "method",
        docExpansion: "none",
        filter: true,
        showRequestHeaders: true,
        showCommonExtensions: true,
      },
      customCss: `
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info { margin-bottom: 30px; }
        .swagger-ui .info .title { color: #2c3e50; font-size: 2.5em; margin-bottom: 10px; }
        .swagger-ui .info .description { margin-bottom: 20px; line-height: 1.6; }
        .swagger-ui .info .description h3 { color: #34495e; margin-top: 20px; margin-bottom: 10px; }
        .swagger-ui .info .description h4 { color: #2980b9; margin-top: 15px; margin-bottom: 8px; }
        .swagger-ui .info .description ul { margin-left: 20px; }
        .swagger-ui .info .description li { margin-bottom: 5px; }
        .swagger-ui .info .description pre { background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #2980b9; }
        .swagger-ui .scheme-container { background: #ecf0f1; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
      `,
      customSiteTitle: "Enterprise NestJS API Documentation",
    });
  }

  const port = configService.port;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📊 Environment: ${configService.nodeEnv}`);
  console.log(`📝 Log Level: ${configService.logLevel}`);
  if (configService.swaggerEnabled) {
    console.log(
      `📚 Swagger documentation: http://localhost:${port}/${configService.apiPrefix}/docs`
    );
  }
}

bootstrap().catch((err) => {
  console.error("❌ Error starting server:", err);
  process.exit(1);
});
