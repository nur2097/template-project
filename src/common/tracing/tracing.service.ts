import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { JaegerExporter } from "@opentelemetry/exporter-jaeger";
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from "@opentelemetry/semantic-conventions";
import * as api from "@opentelemetry/api";

@Injectable()
export class TracingService {
  private readonly logger = new Logger(TracingService.name);
  private sdk: NodeSDK | null = null;

  constructor(private readonly configService: ConfigService) {}

  initialize(): void {
    const serviceName =
      this.configService.get<string>("SERVICE_NAME") || "nestjs-enterprise-api";
    const serviceVersion =
      this.configService.get<string>("SERVICE_VERSION") || "1.0.0";
    const jaegerEndpoint = this.configService.get<string>("JAEGER_ENDPOINT");

    // Skip tracing if disabled or in test environment
    if (
      process.env.NODE_ENV === "test" ||
      this.configService.get<string>("TRACING_ENABLED") === "false"
    ) {
      this.logger.warn("Tracing is disabled");
      return;
    }

    // Temporary fix: Skip tracing initialization to avoid version conflicts
    if (!jaegerEndpoint) {
      this.logger.warn(
        "OpenTelemetry tracing skipped - no Jaeger endpoint configured"
      );
      return;
    }

    try {
      // Skip resource creation that causes version conflicts
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _attributes = {
        [SEMRESATTRS_SERVICE_NAME]: serviceName,
        [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
        [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]:
          process.env.NODE_ENV || "development",
      };

      const exporters = [];

      // Add Jaeger exporter if endpoint is provided
      if (jaegerEndpoint) {
        exporters.push(
          new JaegerExporter({
            endpoint: jaegerEndpoint,
          })
        );
      }

      this.sdk = new NodeSDK({
        // resource: undefined, // Skip resource to avoid version conflicts
        traceExporter: exporters.length > 0 ? exporters[0] : undefined,
        instrumentations: [
          getNodeAutoInstrumentations({
            "@opentelemetry/instrumentation-redis": {
              enabled: true,
            },
            "@opentelemetry/instrumentation-http": {
              enabled: true,
              requestHook: (span, request) => {
                // Safely handle request body if it exists
                if (
                  request &&
                  typeof request === "object" &&
                  "body" in request
                ) {
                  span.setAttributes({
                    "http.request.body": JSON.stringify(
                      (request as any).body || {}
                    ),
                  });
                }
              },
            },
            "@opentelemetry/instrumentation-express": {
              enabled: true,
            },
            "@opentelemetry/instrumentation-nestjs-core": {
              enabled: true,
            },
          }),
        ],
      });

      this.sdk.start();
      this.logger.log("✅ OpenTelemetry tracing initialized successfully");
    } catch (error) {
      this.logger.error(
        "❌ Failed to initialize OpenTelemetry tracing:",
        error
      );
    }
  }

  async shutdown(): Promise<void> {
    if (this.sdk) {
      try {
        await this.sdk.shutdown();
        this.logger.log("🔌 OpenTelemetry tracing shut down successfully");
      } catch (error) {
        this.logger.error(
          "❌ Error shutting down OpenTelemetry tracing:",
          error
        );
      }
    }
  }

  // Helper methods for manual instrumentation
  startSpan(name: string, options?: api.SpanOptions): api.Span {
    const tracer = api.trace.getTracer(
      this.configService.get<string>("SERVICE_NAME") || "nestjs-enterprise-api",
      this.configService.get<string>("SERVICE_VERSION") || "1.0.0"
    );
    return tracer.startSpan(name, options);
  }

  getCurrentSpan(): api.Span | undefined {
    return api.trace.getActiveSpan();
  }

  withSpan<T>(span: api.Span, fn: () => T): T {
    return api.context.with(api.trace.setSpan(api.context.active(), span), fn);
  }

  addEvent(name: string, attributes?: api.Attributes): void {
    const span = this.getCurrentSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  }

  setAttributes(attributes: api.Attributes): void {
    const span = this.getCurrentSpan();
    if (span) {
      span.setAttributes(attributes);
    }
  }

  recordException(exception: Error): void {
    const span = this.getCurrentSpan();
    if (span) {
      span.recordException(exception);
      span.setStatus({
        code: api.SpanStatusCode.ERROR,
        message: exception.message,
      });
    }
  }
}
