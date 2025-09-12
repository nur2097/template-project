import { Injectable, Logger } from "@nestjs/common";
import { ConfigurationService } from "../../config/configuration.service";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { JaegerExporter } from "@opentelemetry/exporter-jaeger";
import * as api from "@opentelemetry/api";

@Injectable()
export class TracingService {
  private readonly logger = new Logger(TracingService.name);
  private sdk: NodeSDK | null = null;

  constructor(private readonly configService: ConfigurationService) {}

  initialize(): void {
    const jaegerEndpoint = this.configService.otelJaegerEndpoint;

    // Skip tracing if disabled or in test environment
    if (
      this.configService.nodeEnv === "test" ||
      !this.configService.tracingEnabled
    ) {
      this.logger.warn("Tracing is disabled");
      return;
    }

    // Skip if no endpoint configured
    if (!jaegerEndpoint) {
      this.logger.warn(
        "OpenTelemetry tracing skipped - no Jaeger endpoint configured"
      );
      return;
    }

    try {
      const jaegerExporter = new JaegerExporter({
        endpoint: jaegerEndpoint,
      });

      this.sdk = new NodeSDK({
        traceExporter: jaegerExporter,
        instrumentations: [
          getNodeAutoInstrumentations({
            "@opentelemetry/instrumentation-redis": {
              enabled: true,
            },
            "@opentelemetry/instrumentation-http": {
              enabled: true,
              requestHook: (span, request) => {
                // Add safe request metadata without PII
                if (request && typeof request === "object") {
                  const safeHeaders = [
                    "user-agent",
                    "content-type",
                    "authorization",
                  ];
                  const headers: Record<string, any> = {};

                  if ("headers" in request && request.headers) {
                    safeHeaders.forEach((header) => {
                      if ((request.headers as any)[header]) {
                        // Mask authorization header
                        headers[header] =
                          header === "authorization"
                            ? "***MASKED***"
                            : (request.headers as any)[header];
                      }
                    });
                  }

                  span.setAttributes({
                    "http.request.headers": JSON.stringify(headers),
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
      this.logger.log(
        "✅ OpenTelemetry tracing initialized with Jaeger exporter"
      );
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
      this.configService.otelServiceName,
      this.configService.otelServiceVersion
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
