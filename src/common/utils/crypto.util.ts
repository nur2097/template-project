import * as crypto from "crypto";

export class CryptoUtil {
  static generateRandomToken(length: number = 32): string {
    return crypto.randomBytes(length).toString("hex");
  }

  static generateResetToken(): string {
    return this.generateRandomToken(32);
  }

  static generateRefreshToken(): string {
    return this.generateRandomToken(32);
  }

  static generateUuid(): string {
    return crypto.randomUUID();
  }

  static hash(data: string, algorithm: string = "sha256"): string {
    return crypto.createHash(algorithm).update(data).digest("hex");
  }
}
