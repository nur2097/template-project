import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import { ValidationUtil } from "../utils/validation.util";

@ValidatorConstraint({ name: "isValidDomain", async: false })
export class DomainValidator implements ValidatorConstraintInterface {
  validate(domain: string) {
    if (!domain) return true; // Allow empty domain (optional field)
    return ValidationUtil.isValidDomain(domain);
  }

  defaultMessage() {
    return "Domain must be a valid domain name format";
  }
}
