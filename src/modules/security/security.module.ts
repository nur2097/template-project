import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { CsrfMiddleware } from "../../common/security/csrf.middleware";
import { RateLimitingModule } from "../../common/rate-limiting/rate-limiting.module";

@Module({
  imports: [RateLimitingModule],
  providers: [CsrfMiddleware],
})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // CSRF middleware re-enabled with correct path configuration
    consumer.apply(CsrfMiddleware).forRoutes("*");
    console.log("SecurityModule configure called - CSRF middleware enabled");
  }
}
