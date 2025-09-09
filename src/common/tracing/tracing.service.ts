import { Injectable, Logger } from "@nestjs/common";
import { ConfigurationService } from "../../config/configuration.service";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
// Note: JaegerExporter is deprecated, but kept for compatibility
// TODO: Migrate to @opentelemetry/exporter-otlp-http when upgrading
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

    // Temporary fix: Skip tracing initialization to avoid version conflicts
    if (!jaegerEndpoint) {
      this.logger.warn(
        "OpenTelemetry tracing skipped - no Jaeger endpoint configured"
      );
      return;
    }

    try {
      const exporters = [];

      // Add Jaeger exporter if endpoint is provided
      // Note: JaegerExporter is deprecated but still functional
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
