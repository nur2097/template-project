import { PasswordUtil } from "./password.util";
import { PersonalInfo } from "./password-policy.util";
import { BadRequestException } from "@nestjs/common";

describe("PasswordUtil", () => {
  describe("hash and compare", () => {
    it("should hash and verify password correctly", async () => {
      const password = "TestPassword123!";

      const hashedPassword = await PasswordUtil.hash(password);
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);

      const isValid = await PasswordUtil.compare(password, hashedPassword);
      expect(isValid).toBe(true);

      const isInvalid = await PasswordUtil.compare(
        "wrongpassword",
        hashedPassword
      );
      expect(isInvalid).toBe(false);
    });

    it("should return false for incorrect password", async () => {
      const password = "TestPassword123!";
      const hashedPassword = await PasswordUtil.hash(password);

      const result = await PasswordUtil.compare(
        "WrongPassword",
        hashedPassword
      );
      expect(result).toBe(false);
    });
  });

  describe("validatePassword", () => {
    const personalInfo: PersonalInfo = {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      phoneNumber: "+1234567890",
    };

    it("should throw BadRequestException for weak password", () => {
      const weakPassword = "weak";

      expect(() => {
        PasswordUtil.validatePassword(weakPassword, undefined, personalInfo);
      }).toThrow(BadRequestException);
    });

    it("should validate strong password without throwing", () => {
      const strongPassword = "VeryStrongP@ssw0rd2024!";

      expect(() => {
        PasswordUtil.validatePassword(strongPassword, undefined, personalInfo);
      }).not.toThrow();
    });

    it("should handle undefined personal info", () => {
      const strongPassword = "VeryStrongP@ssw0rd2024!";

      expect(() => {
        PasswordUtil.validatePassword(strongPassword, undefined, undefined);
      }).not.toThrow();
    });
  });

  describe("isValidPassword", () => {
    it("should validate password using hash comparison", async () => {
      const password = "TestPassword123!";
      const hashedPassword = await PasswordUtil.hash(password);

      const isValid = await PasswordUtil.isValidPassword(
        password,
        hashedPassword
      );
      expect(isValid).toBe(true);

      const isInvalid = await PasswordUtil.isValidPassword(
        "wrongpassword",
        hashedPassword
      );
      expect(isInvalid).toBe(false);
    });
  });
});
