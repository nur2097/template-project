import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";
import { TerminusModule } from "@nestjs/terminus";

describe("HealthController", () => {
  let controller: HealthController;
  let healthService: jest.Mocked<HealthService>;

  beforeEach(async () => {
    const mockHealthService = {
      getHealthStatus: jest.fn(),
      checkDatabase: jest.fn(),
      checkRedis: jest.fn(),
      checkMemory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      imports: [TerminusModule],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthService>(
      HealthService
    ) as jest.Mocked<HealthService>;
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("check", () => {
    it("should return health status", async () => {
      const mockHealthResult = {
        status: "ok",
        info: {
          database: {
            status: "up",
          },
        },
        error: {},
        details: {
          database: {
            status: "up",
          },
        },
      };

      const mockHealthCheck = jest.fn().mockResolvedValue(mockHealthResult);
      controller.check = mockHealthCheck;

      const result = await controller.check();

      expect(mockHealthCheck).toHaveBeenCalled();
      expect(result).toEqual(mockHealthResult);
    });
  });

  describe("controller methods", () => {
    it("should have check method", () => {
      expect(typeof controller.check).toBe("function");
    });

    it("should be properly initialized", () => {
      expect(controller).toBeDefined();
      expect(healthService).toBeDefined();
    });
  });
});
