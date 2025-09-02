import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from "class-validator";
import { ValidationUtil } from "../utils/validation.util";

@ValidatorConstraint({ name: "passwordStrength", async: false })
export class PasswordStrengthValidator implements ValidatorConstraintInterface {
  validate(password: string) {
    const validation = ValidationUtil.validatePasswordStrength(password);
    return validation.isValid;
  }

  defaultMessage(args: ValidationArguments) {
    const validation = ValidationUtil.validatePasswordStrength(args.value);
    return validation.errors.join(", ");
  }
}
