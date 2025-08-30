export class SanitizerUtil {
  private static readonly SENSITIVE_HEADERS = [
    "authorization",
    "cookie",
    "x-api-key",
    "x-auth-token",
    "set-cookie",
  ];

  private static readonly SENSITIVE_BODY_FIELDS = [
    "password",
    "token",
    "secret",
    "key",
    "authorization",
    "currentPassword",
    "newPassword",
  ];

  private static readonly SENSITIVE_USER_FIELDS = [
    "password",
    "passwordChangedAt",
  ];

  static sanitizeHeaders(headers: any): any {
    if (!headers) return headers;

    const sanitized = { ...headers };

    for (const header of this.SENSITIVE_HEADERS) {
      if (sanitized[header]) {
        sanitized[header] = "[REDACTED]";
      }
    }

    return sanitized;
  }

  static sanitizeBody(body: any): any {
    if (!body) return body;

    const sanitized = { ...body };

    for (const field of this.SENSITIVE_BODY_FIELDS) {
      if (sanitized[field]) {
        sanitized[field] = "[REDACTED]";
      }
    }

    return sanitized;
  }

  static sanitizeUser(user: any): any {
    if (!user) return user;

    const sanitized = { ...user };

    for (const field of this.SENSITIVE_USER_FIELDS) {
      delete sanitized[field];
    }

    return sanitized;
  }

  static sanitizeObject(obj: any, sensitiveFields: string[]): any {
    if (!obj) return obj;

    const sanitized = { ...obj };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = "[REDACTED]";
      }
    }

    return sanitized;
  }
}
