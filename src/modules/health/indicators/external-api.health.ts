import { Injectable } from "@nestjs/common";
import { HealthIndicator, HealthIndicatorResult } from "@nestjs/terminus";
import { ConfigurationService } from "../../../config";
import axios, { AxiosError } from "axios";

export interface ExternalApiConfig {
  name: string;
  url: string;
  timeout?: number;
  expectedStatus?: number;
  headers?: Record<string, string>;
  method?: "GET" | "POST" | "HEAD";
  healthEndpoint?: string;
}

@Injectable()
export class ExternalApiHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigurationService) {
    super();
  }

  async isHealthy(
    key: string,
    apiConfig: ExternalApiConfig
  ): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      const config = {
        method: apiConfig.method || "GET",
        url: apiConfig.healthEndpoint || apiConfig.url,
        timeout: apiConfig.timeout || 5000,
        headers: apiConfig.headers || {},
        validateStatus: (status: number) => {
          const expectedStatus = apiConfig.expectedStatus || 200;
          return status === expectedStatus;
        },
      };

      const response = await axios(config);
      const responseTime = Date.now() - startTime;

      return this.getStatus(key, true, {
        url: apiConfig.url,
        name: apiConfig.name,
        status: response.status,
        responseTime: `${responseTime}ms`,
        headers: this.sanitizeHeaders(response.headers),
        lastChecked: new Date().toISOString(),
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      let errorDetails: any = {
        url: apiConfig.url,
        name: apiConfig.name,
        responseTime: `${responseTime}ms`,
        lastChecked: new Date().toISOString(),
      };

      if (error instanceof AxiosError) {
        errorDetails = {
          ...errorDetails,
          status: error.response?.status || "TIMEOUT",
          message: error.message,
          code: error.code,
        };
      } else {
        errorDetails.message =
          error instanceof Error ? error.message : "Unknown error";
      }

      return this.getStatus(key, false, errorDetails);
    }
  }

  async checkMultipleApis(
    apis: ExternalApiConfig[]
  ): Promise<Record<string, HealthIndicatorResult>> {
    const results: Record<string, HealthIndicatorResult> = {};

    const promises = apis.map(async (api) => {
      const key = api.name.replace(/\s+/g, "_").toLowerCase();
      try {
        results[key] = await this.isHealthy(key, api);
      } catch (error) {
        results[key] = this.getStatus(key, false, {
          url: api.url,
          name: api.name,
          error: error instanceof Error ? error.message : "Unknown error",
          lastChecked: new Date().toISOString(),
        });
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  private sanitizeHeaders(headers: any): Record<string, any> {
    const sanitized = { ...headers };
    const sensitiveHeaders = ["authorization", "cookie", "x-api-key"];

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = "[REDACTED]";
      }
    });

    return sanitized;
  }

  // Predefined common external services
  async checkCommonServices(): Promise<Record<string, HealthIndicatorResult>> {
    const commonApis: ExternalApiConfig[] = [
      {
        name: "Google DNS",
        url: "https://8.8.8.8:53",
        healthEndpoint: "https://www.google.com",
        timeout: 3000,
        method: "HEAD",
      },
      {
        name: "Cloudflare DNS",
        url: "https://1.1.1.1:53",
        healthEndpoint: "https://www.cloudflare.com",
        timeout: 3000,
        method: "HEAD",
      },
    ];

    // Add custom external APIs from environment
    const customApis = this.getCustomExternalApis();

    return this.checkMultipleApis([...commonApis, ...customApis]);
  }

  private getCustomExternalApis(): ExternalApiConfig[] {
    const apis: ExternalApiConfig[] = [];

    // Check for environment variables like EXTERNAL_API_1_NAME, EXTERNAL_API_1_URL, etc.
    for (let i = 1; i <= 10; i++) {
      const name = process.env[`EXTERNAL_API_${i}_NAME`];
      const url = process.env[`EXTERNAL_API_${i}_URL`];

      if (name && url) {
        apis.push({
          name,
          url,
          timeout: parseInt(process.env[`EXTERNAL_API_${i}_TIMEOUT`] || "5000"),
          expectedStatus: parseInt(
            process.env[`EXTERNAL_API_${i}_STATUS`] || "200"
          ),
          method: (process.env[`EXTERNAL_API_${i}_METHOD`] as any) || "GET",
          healthEndpoint: process.env[`EXTERNAL_API_${i}_HEALTH_ENDPOINT`],
        });
      }
    }

    return apis;
  }
}
