import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { ConfigurationService } from "../src/config";

describe("Performance Tests (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    const configService = app.get<ConfigurationService>(ConfigurationService);
    app.setGlobalPrefix(configService.apiPrefix);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("API Response Times", () => {
    it("should respond to health check within 100ms", async () => {
      const startTime = Date.now();

      await request(app.getHttpServer()).get("/api/health").expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(100);
    });

    it("should handle concurrent health check requests", async () => {
      const concurrentRequests = 50;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app.getHttpServer()).get("/api/health").expect(200)
        );
      }

      const startTime = Date.now();
      await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // All requests should complete within reasonable time
      expect(totalTime).toBeLessThan(2000);
    });

    it("should maintain performance under load", async () => {
      const iterations = 100;
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        await request(app.getHttpServer()).get("/api/health").expect(200);

        responseTimes.push(Date.now() - startTime);
      }

      const averageTime =
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxTime = Math.max(...responseTimes);

      expect(averageTime).toBeLessThan(50); // Average under 50ms
      expect(maxTime).toBeLessThan(200); // Max under 200ms
    });
  });

  describe("Memory Usage", () => {
    it("should not have memory leaks during repeated requests", async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Make many requests to potentially trigger memory leaks
      for (let i = 0; i < 1000; i++) {
        await request(app.getHttpServer()).get("/api/health");
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe("Error Handling Performance", () => {
    it("should handle 404 errors quickly", async () => {
      const startTime = Date.now();

      await request(app.getHttpServer()).get("/api/nonexistent").expect(404);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(50);
    });

    it("should handle validation errors quickly", async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({
          email: "invalid",
          password: "short",
        })
        .expect(400);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(100);
    });
  });
});
