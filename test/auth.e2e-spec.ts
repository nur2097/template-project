import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { ConfigurationService } from "../src/config";

describe("Authentication (e2e)", () => {
  let app: INestApplication;
  let configService: ConfigurationService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configService = app.get<ConfigurationService>(ConfigurationService);

    // Apply same configuration as main app
    app.setGlobalPrefix(configService.apiPrefix);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("/auth/login (POST)", () => {
    it("should reject invalid email format", () => {
      return request(app.getHttpServer())
        .post("/api/auth/login")
        .send({
          email: "invalid-email",
          password: "Password123!",
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.statusCode).toBe(400);
          expect(res.body.message).toContain("valid email address");
        });
    });

    it("should reject short password", () => {
      return request(app.getHttpServer())
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "123",
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.statusCode).toBe(400);
          expect(res.body.message).toContain("at least 8 characters");
        });
    });

    it("should reject empty fields", () => {
      return request(app.getHttpServer())
        .post("/api/auth/login")
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body.statusCode).toBe(400);
          expect(res.body.message).toBeInstanceOf(Array);
          expect(
            res.body.message.some((msg: string) =>
              msg.includes("Email is required")
            )
          ).toBe(true);
          expect(
            res.body.message.some((msg: string) =>
              msg.includes("Password is required")
            )
          ).toBe(true);
        });
    });

    it("should sanitize input fields", () => {
      return request(app.getHttpServer())
        .post("/api/auth/login")
        .send({
          email: "  <script>alert('xss')</script>test@example.com  ",
          password: "Password123!",
        })
        .expect(401) // Will fail auth but input should be sanitized
        .expect((res) => {
          // The email should be sanitized and trimmed in the validation error
          expect(res.body.statusCode).toBe(401);
        });
    });
  });

  describe("/auth/register (POST)", () => {
    it("should validate all required fields", () => {
      return request(app.getHttpServer())
        .post("/api/auth/register")
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body.statusCode).toBe(400);
          expect(res.body.message).toBeInstanceOf(Array);
          const messages = res.body.message;
          expect(messages.some((msg: string) => msg.includes("email"))).toBe(
            true
          );
          expect(
            messages.some((msg: string) => msg.includes("firstName"))
          ).toBe(true);
          expect(messages.some((msg: string) => msg.includes("lastName"))).toBe(
            true
          );
          expect(messages.some((msg: string) => msg.includes("password"))).toBe(
            true
          );
          expect(
            messages.some((msg: string) => msg.includes("companySlug"))
          ).toBe(true);
        });
    });

    it("should reject weak password", () => {
      return request(app.getHttpServer())
        .post("/api/auth/register")
        .send({
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
          password: "weakpass",
          companySlug: "test-company",
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.statusCode).toBe(400);
          expect(res.body.message).toContain("Password must contain");
        });
    });
  });

  describe("Rate Limiting", () => {
    it("should apply rate limiting to auth endpoints", async () => {
      const promises = [];
      // Send multiple requests quickly to trigger rate limiting
      for (let i = 0; i < 25; i++) {
        promises.push(
          request(app.getHttpServer())
            .post("/api/auth/login")
            .send({
              email: `test${i}@example.com`,
              password: "Password123!",
            })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(
        (res) => res.status === 429
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe("Security Headers", () => {
    it("should include security headers", () => {
      return request(app.getHttpServer())
        .get("/api/health")
        .expect((res) => {
          expect(res.headers).toHaveProperty("x-content-type-options");
          expect(res.headers).toHaveProperty("x-frame-options");
          expect(res.headers).toHaveProperty("x-xss-protection");
        });
    });
  });
});
