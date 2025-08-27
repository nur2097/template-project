import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import * as compression from "compression";
import helmet from "helmet";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // Global prefix
  app.setGlobalPrefix(process.env.API_PREFIX || "api");

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global filters & interceptors will be handled through APP_FILTER and APP_INTERCEPTOR providers
  // in their respective modules to enable proper dependency injection

  // Swagger documentation
  const swaggerEnabled = process.env.SWAGGER_ENABLED !== "false";
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle("NestJS Enterprise API")
      .setDescription(
        "Enterprise-ready NestJS template with comprehensive logging, monitoring, and security features",
      )
      .setVersion("1.0.0")
      .addBearerAuth()
      .addTag("Authentication", "User authentication endpoints")
      .addTag("Users", "User management endpoints")
      .addTag("Health", "Health check endpoints")
      .addTag("Logger", "Logging system endpoints")
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  if (swaggerEnabled) {
    console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
  }
}

bootstrap().catch((err) => {
  console.error("❌ Error starting server:", err);
  process.exit(1);
});
