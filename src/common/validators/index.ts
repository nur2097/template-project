// Export all custom validators
export * from "./password-strength.validator";
export * from "./domain.validator";
export * from "./email-domain.validator";
export * from "./business-rules.validator";

// Re-export commonly used validation decorators
export {
  IsEmail,
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsIn,
  IsUrl,
  IsUUID,
  IsDateString,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from "class-validator";

// Re-export Type from class-transformer (commonly used with class-validator)
export { Type } from "class-transformer";
