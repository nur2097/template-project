import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error.errors) {
        const errorMessages = error.errors.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        throw new BadRequestException({
          message: 'Validation failed',
          errors: errorMessages,
        });
      }
      throw new BadRequestException('Validation failed');
    }
  }
}

// Decorator for easier usage
export const UsePipes = (schema: ZodSchema) => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('pipes', [new ZodValidationPipe(schema)], descriptor.value);
  };
};