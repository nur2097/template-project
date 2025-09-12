import { validate } from "class-validator";
import { plainToClass } from "class-transformer";
import { LoginDto } from "./login.dto";

describe("LoginDto", () => {
  const createDto = (overrides: Partial<LoginDto> = {}): LoginDto => {
    const base = {
      email: "test@example.com",
      password: "Password123!",
    };
    return plainToClass(LoginDto, { ...base, ...overrides });
  };

  describe("email validation", () => {
    it("should accept valid email", async () => {
      const dto = createDto({ email: "user@example.com" });
      const errors = await validate(dto);
      const emailErrors = errors.filter((error) => error.property === "email");
      expect(emailErrors).toHaveLength(0);
    });

    it("should reject invalid email format", async () => {
      const dto = createDto({ email: "invalid-email" });
      const errors = await validate(dto);
      const emailErrors = errors.filter((error) => error.property === "email");
      expect(emailErrors).toHaveLength(1);
      expect(emailErrors[0].constraints?.isEmail).toContain(
        "valid email address"
      );
    });

    it("should reject empty email", async () => {
      const dto = createDto({ email: "" });
      const errors = await validate(dto);
      const emailErrors = errors.filter((error) => error.property === "email");
      expect(emailErrors.length).toBeGreaterThan(0);
      expect(
        emailErrors.some((error) => error.constraints?.isNotEmpty)
      ).toBeTruthy();
    });

    it("should sanitize HTML in email", async () => {
      const dto = plainToClass(LoginDto, {
        email: "<script>alert('xss')</script>test@example.com",
        password: "Password123!",
      });

      // The transform should sanitize the email
      expect(dto.email).not.toContain("<script>");
      expect(dto.email).toContain("test@example.com");
    });

    it("should trim whitespace from email", async () => {
      const dto = plainToClass(LoginDto, {
        email: "  test@example.com  ",
        password: "Password123!",
      });

      expect(dto.email).toBe("test@example.com");
    });
  });

  describe("password validation", () => {
    it("should accept valid password", async () => {
      const dto = createDto({ password: "ValidPassword123!" });
      const errors = await validate(dto);
      const passwordErrors = errors.filter(
        (error) => error.property === "password"
      );
      expect(passwordErrors).toHaveLength(0);
    });

    it("should reject short password", async () => {
      const dto = createDto({ password: "short" });
      const errors = await validate(dto);
      const passwordErrors = errors.filter(
        (error) => error.property === "password"
      );
      expect(passwordErrors).toHaveLength(1);
      expect(passwordErrors[0].constraints?.minLength).toContain(
        "at least 8 characters"
      );
    });

    it("should reject empty password", async () => {
      const dto = createDto({ password: "" });
      const errors = await validate(dto);
      const passwordErrors = errors.filter(
        (error) => error.property === "password"
      );
      expect(passwordErrors.length).toBeGreaterThan(0);
      expect(
        passwordErrors.some((error) => error.constraints?.isNotEmpty)
      ).toBeTruthy();
    });

    it("should accept minimum length password", async () => {
      const dto = createDto({ password: "12345678" });
      const errors = await validate(dto);
      const passwordErrors = errors.filter(
        (error) => error.property === "password"
      );
      expect(passwordErrors).toHaveLength(0);
    });
  });

  describe("complete validation", () => {
    it("should pass validation with all valid fields", async () => {
      const dto = createDto({
        email: "user@example.com",
        password: "SecurePassword123!",
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should fail validation with all invalid fields", async () => {
      const dto = createDto({
        email: "invalid-email",
        password: "short",
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      const emailErrors = errors.filter((error) => error.property === "email");
      const passwordErrors = errors.filter(
        (error) => error.property === "password"
      );

      expect(emailErrors.length).toBeGreaterThan(0);
      expect(passwordErrors.length).toBeGreaterThan(0);
    });

    it("should handle missing fields", async () => {
      const dto = plainToClass(LoginDto, {});
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);

      const properties = errors.map((error) => error.property);
      expect(properties).toContain("email");
      expect(properties).toContain("password");
    });
  });
});
