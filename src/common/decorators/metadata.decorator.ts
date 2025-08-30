import { SetMetadata } from "@nestjs/common";

/**
 * Generic metadata decorator factory
 * Creates type-safe decorators for setting metadata
 */
export function createMetadataDecorator<T = string>(key: string) {
  return (...values: T[]) => SetMetadata(key, values);
}

/**
 * Creates a decorator that sets a single metadata value
 */
export function createSingleValueDecorator<T = string>(key: string) {
  return (value: T) => SetMetadata(key, value);
}
