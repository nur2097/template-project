import { Test, TestingModule } from "@nestjs/testing";
import { HttpException, HttpStatus } from "@nestjs/common";
import { GlobalExceptionFilter } from "./http-exception.filter";
import { LoggerService } from "../logger/logger.service";

describe("GlobalExceptionFilter", () => {
  let filter: GlobalExceptionFilter;
  let loggerService: jest.Mocked<LoggerService>;

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  const mockRequest = {
    url: "/api/test",
    method: "POST",
    headers: {
      "x-correlation-id": "test-correlation-id",
      "user-agent": "test-agent",
    },
    ip: "127.0.0.1",
    user: { sub: "user123" },
    body: { email: "test@example.com", password: "secret" },
    socket: { remoteAddress: "127.0.0.1" },
    get: jest.fn((header: string) => {
      if (header === "User-Agent") return "test-agent";
      return undefined;
    }),
  };

  const mockArgumentsHost = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue(mockResponse),
    }),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalExceptionFilter,
        {
          provide: LoggerService,
          useValue: {
            logError: jest.fn(),
          },
        },
      ],
    }).compile();

    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);
    loggerService = module.get(LoggerService);
  });

  it("should be defined", () => {
    expect(filter).toBeDefined();
  });

  it("should handle HTTP exceptions", () => {
    const exception = new HttpException("Test error", HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalled();
  });

  it("should handle generic errors", () => {
    const exception = new Error("Generic error");

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalled();
  });

  it("should call logger service", () => {
    const exception = new Error("Test error");

    filter.catch(exception, mockArgumentsHost);

    expect(loggerService.logError).toHaveBeenCalled();
  });
});
