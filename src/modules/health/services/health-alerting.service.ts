import { Injectable, Logger } from "@nestjs/common";
import { EmailService } from "../../email/email.service";

export interface HealthAlert {
  id: string;
  type: "critical" | "warning" | "recovery";
  service: string;
  message: string;
  details?: any;
  timestamp: Date;
  resolved?: boolean;
  resolvedAt?: Date;
}

export interface AlertingRule {
  name: string;
  condition: (healthData: any) => boolean;
  severity: "critical" | "warning";
  message: string;
  cooldownMinutes?: number;
}

@Injectable()
export class HealthAlertingService {
  private readonly logger = new Logger(HealthAlertingService.name);
  private readonly activeAlerts = new Map<string, HealthAlert>();
  private readonly alertHistory: HealthAlert[] = [];
  private readonly lastAlertTime = new Map<string, Date>();

  constructor(private readonly emailService?: EmailService) {}

  private readonly defaultRules: AlertingRule[] = [
    {
      name: "database_down",
      condition: (health) =>
        health.databases?.postgres?.status === "unhealthy" ||
        health.databases?.mongodb?.status === "unhealthy",
      severity: "critical",
      message: "Database connection is down",
      cooldownMinutes: 5,
    },
    {
      name: "memory_critical",
      condition: (health) => health.system?.memory?.status === "critical",
      severity: "critical",
      message: "Memory usage is critical",
      cooldownMinutes: 10,
    },
    {
      name: "disk_critical",
      condition: (health) => health.system?.disk?.status === "critical",
      severity: "critical",
      message: "Disk usage is critical",
      cooldownMinutes: 15,
    },
    {
      name: "memory_warning",
      condition: (health) => health.system?.memory?.status === "warning",
      severity: "warning",
      message: "Memory usage is high",
      cooldownMinutes: 30,
    },
    {
      name: "disk_warning",
      condition: (health) => health.system?.disk?.status === "warning",
      severity: "warning",
      message: "Disk usage is high",
      cooldownMinutes: 30,
    },
    {
      name: "redis_down",
      condition: (health) => health.redis?.status === "down",
      severity: "warning",
      message: "Redis connection is down",
      cooldownMinutes: 5,
    },
    {
      name: "external_api_down",
      condition: (health) => {
        if (!health.externalApis) return false;
        return Object.values(health.externalApis).some(
          (api: any) => api.status === "down"
        );
      },
      severity: "warning",
      message: "External API is unreachable",
      cooldownMinutes: 10,
    },
  ];

  async evaluateHealth(healthData: any): Promise<HealthAlert[]> {
    const newAlerts: HealthAlert[] = [];

    for (const rule of this.defaultRules) {
      try {
        const shouldAlert = rule.condition(healthData);
        const alertKey = `${rule.name}_${rule.severity}`;
        const existingAlert = this.activeAlerts.get(alertKey);
        const lastAlert = this.lastAlertTime.get(alertKey);

        if (shouldAlert) {
          // Check cooldown period
          if (lastAlert && rule.cooldownMinutes) {
            const cooldownMs = rule.cooldownMinutes * 60 * 1000;
            if (Date.now() - lastAlert.getTime() < cooldownMs) {
              continue; // Skip due to cooldown
            }
          }

          if (!existingAlert) {
            // Create new alert
            const alert: HealthAlert = {
              id: this.generateAlertId(),
              type: rule.severity === "critical" ? "critical" : "warning",
              service: rule.name,
              message: rule.message,
              details: this.extractRelevantDetails(rule.name, healthData),
              timestamp: new Date(),
            };

            this.activeAlerts.set(alertKey, alert);
            this.alertHistory.push(alert);
            this.lastAlertTime.set(alertKey, alert.timestamp);
            newAlerts.push(alert);

            this.logger.warn(`Health alert triggered: ${rule.message}`, {
              alert: alert.id,
              service: rule.name,
              details: alert.details,
            });
          }
        } else if (existingAlert && !existingAlert.resolved) {
          // Service recovered
          existingAlert.resolved = true;
          existingAlert.resolvedAt = new Date();

          const recoveryAlert: HealthAlert = {
            id: this.generateAlertId(),
            type: "recovery",
            service: rule.name,
            message: `${rule.message} - RECOVERED`,
            timestamp: new Date(),
          };

          this.alertHistory.push(recoveryAlert);
          newAlerts.push(recoveryAlert);
          this.activeAlerts.delete(alertKey);

          this.logger.log(`Service recovered: ${rule.name}`, {
            originalAlert: existingAlert.id,
            recoveryAlert: recoveryAlert.id,
          });
        }
      } catch (error) {
        this.logger.error(`Error evaluating health rule ${rule.name}:`, error);
      }
    }

    // Send notifications for new alerts
    if (newAlerts.length > 0) {
      await this.sendAlertNotifications(newAlerts);
    }

    return newAlerts;
  }

  private extractRelevantDetails(ruleName: string, healthData: any): any {
    switch (ruleName) {
      case "database_down":
        return {
          postgres: healthData.databases?.postgres,
          mongodb: healthData.databases?.mongodb,
        };
      case "memory_critical":
      case "memory_warning":
        return healthData.system?.memory;
      case "disk_critical":
      case "disk_warning":
        return healthData.system?.disk;
      case "redis_down":
        return healthData.redis;
      case "external_api_down":
        return healthData.externalApis;
      default:
        return healthData;
    }
  }

  private async sendAlertNotifications(alerts: HealthAlert[]): Promise<void> {
    const alertingEnabled = process.env.HEALTH_ALERT_ENABLED === "true";

    if (!alertingEnabled) {
      this.logger.debug("Health alerting is disabled");
      return;
    }

    for (const alert of alerts) {
      try {
        await this.sendEmailAlert(alert);
        await this.sendWebhookAlert(alert);
        await this.logToExternalService(alert);
      } catch (error) {
        this.logger.error(`Failed to send alert notification:`, error);
      }
    }
  }

  private async sendEmailAlert(alert: HealthAlert): Promise<void> {
    const emailRecipients = process.env.HEALTH_ALERT_EMAIL_RECIPIENTS;

    if (!emailRecipients || !this.emailService) {
      return;
    }

    const recipients = emailRecipients.split(",").map((email) => email.trim());
    const subject = `${alert.type.toUpperCase()}: ${alert.service} - ${alert.message}`;

    const template = this.generateEmailTemplate(alert);

    for (const recipient of recipients) {
      try {
        await this.emailService.sendEmail({
          to: recipient,
          subject,
          html: template,
        });
      } catch (error) {
        this.logger.error(`Failed to send email to ${recipient}:`, error);
      }
    }
  }

  private async sendWebhookAlert(alert: HealthAlert): Promise<void> {
    const webhookUrl = process.env.HEALTH_ALERT_WEBHOOK_URL;

    if (!webhookUrl) {
      return;
    }

    try {
      const payload = {
        alert_id: alert.id,
        type: alert.type,
        service: alert.service,
        message: alert.message,
        details: alert.details,
        timestamp: alert.timestamp.toISOString(),
        environment: process.env.NODE_ENV,
        application: "nestjs-enterprise-api",
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "nestjs-health-monitor/1.0",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook responded with status ${response.status}`);
      }
    } catch (error) {
      this.logger.error("Failed to send webhook alert:", error);
    }
  }

  private async logToExternalService(alert: HealthAlert): Promise<void> {
    // Example: Send to external logging service like Datadog, New Relic, etc.
    const externalLogUrl = process.env.HEALTH_ALERT_LOG_URL;

    if (!externalLogUrl) {
      return;
    }

    try {
      const logEntry = {
        timestamp: alert.timestamp.toISOString(),
        level: alert.type === "critical" ? "error" : "warn",
        service: "health-monitor",
        alert_id: alert.id,
        message: alert.message,
        tags: {
          service: alert.service,
          type: alert.type,
          environment: process.env.NODE_ENV,
        },
        details: alert.details,
      };

      await fetch(externalLogUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.HEALTH_ALERT_LOG_TOKEN}`,
        },
        body: JSON.stringify(logEntry),
      });
    } catch (error) {
      this.logger.error("Failed to log to external service:", error);
    }
  }

  private generateEmailTemplate(alert: HealthAlert): string {
    const alertColor =
      alert.type === "critical"
        ? "#dc3545"
        : alert.type === "warning"
          ? "#ffc107"
          : "#28a745";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .alert-container { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
          .alert-header { background-color: ${alertColor}; color: white; padding: 20px; text-align: center; }
          .alert-body { padding: 20px; border: 1px solid #ddd; }
          .alert-details { background-color: #f8f9fa; padding: 15px; margin: 10px 0; }
          .timestamp { color: #6c757d; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="alert-container">
          <div class="alert-header">
            <h1>${alert.type.toUpperCase()}</h1>
            <h2>${alert.service}</h2>
          </div>
          <div class="alert-body">
            <p><strong>Message:</strong> ${alert.message}</p>
            <p><strong>Alert ID:</strong> ${alert.id}</p>
            <p><strong>Environment:</strong> ${process.env.NODE_ENV}</p>
            <p><strong>Timestamp:</strong> ${alert.timestamp.toISOString()}</p>
            
            ${
              alert.details
                ? `
            <div class="alert-details">
              <strong>Details:</strong>
              <pre>${JSON.stringify(alert.details, null, 2)}</pre>
            </div>
            `
                : ""
            }
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getActiveAlerts(): HealthAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  getAlertHistory(limit: number = 50): HealthAlert[] {
    return this.alertHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  clearResolvedAlerts(): number {
    let count = 0;
    for (const [key, alert] of this.activeAlerts.entries()) {
      if (alert.resolved) {
        this.activeAlerts.delete(key);
        count++;
      }
    }
    return count;
  }

  getAlertStats(): {
    active: number;
    critical: number;
    warning: number;
    totalHistory: number;
  } {
    const activeAlerts = Array.from(this.activeAlerts.values()).filter(
      (a) => !a.resolved
    );

    return {
      active: activeAlerts.length,
      critical: activeAlerts.filter((a) => a.type === "critical").length,
      warning: activeAlerts.filter((a) => a.type === "warning").length,
      totalHistory: this.alertHistory.length,
    };
  }
}
