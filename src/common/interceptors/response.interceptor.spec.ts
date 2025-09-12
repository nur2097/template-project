import { Test, TestingModule } from "@nestjs/testing";
import { CallHandler } from "@nestjs/common";
import { of } from "rxjs";
import { ResponseInterceptor } from "./response.interceptor";

describe("ResponseInterceptor", () => {
  let interceptor: ResponseInterceptor;

  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        url: "/api/test",
        method: "GET",
        headers: { "x-correlation-id": "test-correlation-id" },
      }),
      getResponse: jest.fn().mockReturnValue({
        statusCode: 200,
        getHeader: jest.fn().mockReturnValue("application/json"),
        headersSent: false,
      }),
    }),
  } as any;

  const mockCallHandler: CallHandler = {
    handle: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResponseInterceptor],
    }).compile();

    interceptor = module.get<ResponseInterceptor>(ResponseInterceptor);
  });

  it("should be defined", () => {
    expect(interceptor).toBeDefined();
  });

  it("should transform data into standard response format", (done) => {
    const testData = { id: 1, name: "Test" };
    mockCallHandler.handle = jest.fn().mockReturnValue(of(testData));

    interceptor
      .intercept(mockExecutionContext, mockCallHandler)
      .subscribe((result) => {
        expect(result).toMatchObject({
          statusCode: 200,
          path: "/api/test",
          method: "GET",
          message: "Data retrieved successfully",
          requestId: "test-correlation-id",
          data: testData,
        });
        expect(result.timestamp).toBeDefined();
        done();
      });
  });

  it("should preserve already formatted standard responses", (done) => {
    const standardResponse = {
      statusCode: 200,
      timestamp: "2023-01-01T00:00:00.000Z",
      message: "Custom message",
      data: { test: "data" },
      path: "/api/test",
      method: "GET",
      requestId: "test-correlation-id",
      _isStandardResponse: true,
    };
    mockCallHandler.handle = jest.fn().mockReturnValue(of(standardResponse));

    interceptor
      .intercept(mockExecutionContext, mockCallHandler)
      .subscribe((result) => {
        expect(result.statusCode).toBe(200);
        expect(result.message).toBe("Custom message");
        expect(result.data).toEqual({ test: "data" });
        expect(result.path).toBe("/api/test");
        expect(result.method).toBe("GET");
        expect(result.requestId).toBe("test-correlation-id");
        done();
      });
  });

  it("should handle basic interceptor functionality", () => {
    const testData = { test: "data" };
    mockCallHandler.handle = jest.fn().mockReturnValue(of(testData));

    const result = interceptor.intercept(mockExecutionContext, mockCallHandler);
    expect(result).toBeDefined();
  });
});
