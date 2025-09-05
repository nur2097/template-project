import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { validateEnvironment } from "./env.schema";
import { ConfigurationService } from "./configuration.service";

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        ".env.local",
        `.env.${process.env.NODE_ENV || "development"}`,
        ".env",
      ],
      validate: validateEnvironment,
      validationOptions: {
        allowUnknown: true, // Allow additional env vars that aren't in our schema
        abortEarly: false, // Show all validation errors, not just the first one
      },
      expandVariables: true, // Enable variable expansion like ${PORT:3000}
    }),
  ],
  providers: [ConfigurationService],
  exports: [ConfigService, ConfigurationService],
})
export class ConfigurationModule {}
