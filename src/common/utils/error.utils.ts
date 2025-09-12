/**
 * Type-safe error handling utilities for TypeScript strict mode
 */

/**
 * Type guard to check if an unknown error is an Error instance
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Type guard to check if an unknown error has a message property
 */
export function hasMessage(error: unknown): error is { message: string } {
  return (
    error !== null &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  );
}

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }

  if (hasMessage(error)) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unknown error occurred";
}

/**
 * Safely extract error name from unknown error
 */
export function getErrorName(error: unknown): string {
  if (isError(error)) {
    return error.name;
  }

  return "UnknownError";
}

/**
 * Convert unknown error to Error instance
 */
export function toError(error: unknown): Error {
  if (isError(error)) {
    return error;
  }

  return new Error(getErrorMessage(error));
}

/**
 * Type-safe error logging utility
 */
export function logError(error: unknown, context?: string): void {
  const errorMessage = getErrorMessage(error);
  const errorName = getErrorName(error);

  if (context) {
    console.error(`[${context}] ${errorName}: ${errorMessage}`);
  } else {
    console.error(`${errorName}: ${errorMessage}`);
  }

  if (isError(error) && error.stack) {
    console.error(error.stack);
  }
}
