import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { CsrfMiddleware } from "../../common/security/csrf.middleware";
import { RateLimitingModule } from "../../common/rate-limiting/rate-limiting.module";

@Module({
  imports: [RateLimitingModule],
  providers: [CsrfMiddleware],
})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CsrfMiddleware).forRoutes("*");
  }
}
