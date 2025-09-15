/**
 * Type-safe error handling utilities
 */
export class ErrorUtil {
  /**
   * Safely get error message from unknown error
   */
  static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    if (error && typeof error === "object" && "message" in error) {
      return String(error.message);
    }
    return "An unknown error occurred";
  }

  /**
   * Safely get error stack from unknown error
   */
  static getErrorStack(error: unknown): string | undefined {
    if (error instanceof Error) {
      return error.stack;
    }
    if (error && typeof error === "object" && "stack" in error) {
      return String(error.stack);
    }
    return undefined;
  }

  /**
   * Check if error has specific property
   */
  static hasErrorProperty(error: unknown, property: string): boolean {
    return error && typeof error === "object" && property in error;
  }

  /**
   * Get error property value safely
   */
  static getErrorProperty(error: unknown, property: string): unknown {
    if (error && typeof error === "object" && property in error) {
      return (error as any)[property];
    }
    return undefined;
  }
}
