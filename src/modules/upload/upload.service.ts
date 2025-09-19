import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { promisify } from "util";
import { ConfigurationService } from "../../config/configuration.service";
import { getErrorMessage } from "../../common/utils/error.utils";

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);

export interface FileUploadResult {
  success: boolean;
  filename?: string;
  url?: string;
  path?: string;
  size?: number;
  mimetype?: string;
  error?: string;
}

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir: string;
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/json",
  ];

  private readonly dangerousExtensions = [
    ".exe",
    ".bat",
    ".cmd",
    ".com",
    ".pif",
    ".scr",
    ".vbs",
    ".js",
    ".jar",
    ".php",
    ".asp",
    ".jsp",
    ".pl",
    ".py",
    ".sh",
    ".bash",
    ".ps1",
    ".msi",
    ".deb",
    ".rpm",
    ".dmg",
    ".app",
    ".ipa",
    ".apk",
  ];

  // File signatures (magic numbers) for validation
  private readonly fileSignatures: { [key: string]: number[][] } = {
    "image/jpeg": [[0xff, 0xd8, 0xff]],
    "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    "image/gif": [
      [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
      [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
    ],
    "image/webp": [[0x52, 0x49, 0x46, 0x46]],
    "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
    "text/plain": [], // Text files don't have magic numbers
    "text/csv": [],
    "application/json": [],
  };

  // Virus scanning patterns (basic heuristics)
  private readonly suspiciousPatterns = [
    /eval\s*\(/gi,
    /document\.write/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<script/gi,
    /exec\s*\(/gi,
    /system\s*\(/gi,
    /shell_exec/gi,
    /<?php/gi,
    /<%[\s\S]*?%>/gi,
  ];

  // Maximum dimensions for images (in pixels) - reserved for future use
  // private readonly maxImageDimensions = {
  //   width: 4096,
  //   height: 4096
  // };

  constructor(private readonly configService: ConfigurationService) {
    this.uploadDir = this.configService.uploadDest;
    this.maxFileSize = this.configService.maxFileSize;
  }

  async uploadFile(
    file: UploadedFile,
    folder = "general"
  ): Promise<FileUploadResult> {
    try {
      // Comprehensive file validation
      const validation = await this.validateFile(file);
      if (!validation.valid) {
        this.logger.warn(`File upload rejected: ${validation.error}`, {
          filename: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        });
        return {
          success: false,
          error: validation.error,
        };
      }

      // Ensure upload directory exists
      const uploadPath = path.join(this.uploadDir, folder);
      await this.ensureDirectoryExists(uploadPath);

      // Generate unique filename
      const filename = this.generateFilename(file.originalname);
      const filePath = path.join(uploadPath, filename);

      // Write file to disk
      await writeFile(filePath, file.buffer);

      // Generate public URL
      const url = `/uploads/${folder}/${filename}`;

      this.logger.log(`File uploaded successfully: ${filename}`);

      return {
        success: true,
        filename,
        url,
        path: filePath,
        size: file.size,
        mimetype: file.mimetype,
      };
    } catch (error) {
      this.logger.error(
        `File upload failed: ${getErrorMessage(error)}`,
        error.stack
      );
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  }

  async uploadMultipleFiles(
    files: UploadedFile[],
    folder = "general"
  ): Promise<FileUploadResult[]> {
    const results = await Promise.all(
      files.map((file) => this.uploadFile(file, folder))
    );

    return results;
  }

  async uploadAvatar(
    file: UploadedFile,
    userId: string
  ): Promise<FileUploadResult> {
    // Additional validation for avatar images
    if (!file.mimetype.startsWith("image/")) {
      return {
        success: false,
        error: "Avatar must be an image file",
      };
    }

    return this.uploadFile(file, `avatars/${userId}`);
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      await fs.promises.unlink(filePath);
      this.logger.log(`File deleted: ${filePath}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete file: ${getErrorMessage(error)}`);
      return false;
    }
  }

  private async validateFile(
    file: UploadedFile
  ): Promise<{ valid: boolean; error?: string }> {
    // Check file size
    if (file.size > this.maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`,
      };
    }

    // Check if file has content
    if (!file.buffer || file.buffer.length === 0) {
      return {
        valid: false,
        error: "File is empty",
      };
    }

    // Sanitize filename
    const sanitizedName = this.sanitizeFilename(file.originalname);
    if (!sanitizedName) {
      return {
        valid: false,
        error: "Invalid filename",
      };
    }

    // Check dangerous file extensions
    const extension = path.extname(file.originalname).toLowerCase();
    if (this.dangerousExtensions.includes(extension)) {
      return {
        valid: false,
        error: `File extension ${extension} is not allowed for security reasons`,
      };
    }

    // Check null bytes in filename (security vulnerability)
    if (file.originalname.includes("\x00")) {
      return {
        valid: false,
        error: "Filename contains invalid characters",
      };
    }

    // Check path traversal attempts
    if (
      file.originalname.includes("..") ||
      file.originalname.includes("/") ||
      file.originalname.includes("\\")
    ) {
      return {
        valid: false,
        error: "Filename contains invalid path characters",
      };
    }

    // Check mime type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `File type ${file.mimetype} is not allowed`,
      };
    }

    // Validate file signature (magic numbers)
    const signatureValidation = this.validateFileSignature(file);
    if (!signatureValidation.valid) {
      return signatureValidation;
    }

    // Scan for malicious content
    const contentValidation = await this.scanFileContent(file);
    if (!contentValidation.valid) {
      return contentValidation;
    }

    // Additional validation for images
    if (file.mimetype.startsWith("image/")) {
      const imageValidation = await this.validateImageSafety(file);
      if (!imageValidation.valid) {
        return imageValidation;
      }
    }

    return { valid: true };
  }

  private validateFileSignature(file: UploadedFile): {
    valid: boolean;
    error?: string;
  } {
    const signatures = this.fileSignatures[file.mimetype];

    // Skip signature validation for text files (they don't have magic numbers)
    if (!signatures || signatures.length === 0) {
      return { valid: true };
    }

    const fileHeader = Array.from(file.buffer.slice(0, 16));

    for (const signature of signatures) {
      let matches = true;
      for (let i = 0; i < signature.length; i++) {
        if (fileHeader[i] !== signature[i]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        return { valid: true };
      }
    }

    return {
      valid: false,
      error: `File signature does not match declared type ${file.mimetype}`,
    };
  }

  private async scanFileContent(
    file: UploadedFile
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Convert buffer to string for pattern matching (only for text-based files)
      if (
        file.mimetype.startsWith("text/") ||
        file.mimetype === "application/json"
      ) {
        const content = file.buffer.toString("utf8");

        // Check for suspicious patterns
        for (const pattern of this.suspiciousPatterns) {
          if (pattern.test(content)) {
            this.logger.warn(
              `Suspicious content detected in file: ${file.originalname}`,
              {
                pattern: pattern.source,
                mimetype: file.mimetype,
              }
            );
            return {
              valid: false,
              error: "File contains potentially malicious content",
            };
          }
        }

        // Check for excessive script content
        const scriptMatches = content.match(/<script[\s\S]*?<\/script>/gi);
        if (scriptMatches && scriptMatches.length > 5) {
          return {
            valid: false,
            error: "File contains excessive script content",
          };
        }
      }

      // Check for embedded files/polyglot attacks
      const bufferString = file.buffer.toString("binary");
      if (
        bufferString.includes("PK\x03\x04") &&
        !file.mimetype.includes("zip")
      ) {
        return {
          valid: false,
          error: "File appears to contain embedded archive",
        };
      }

      return { valid: true };
    } catch (error) {
      this.logger.error(
        `Error scanning file content: ${getErrorMessage(error)}`
      );
      return {
        valid: false,
        error: "Unable to scan file content",
      };
    }
  }

  private async validateImageSafety(
    file: UploadedFile
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check for EXIF exploits (basic check)
      const buffer = file.buffer;
      const exifMarker = buffer.indexOf(Buffer.from([0xff, 0xe1]));

      if (exifMarker !== -1) {
        // Check for excessive EXIF data
        const exifLength = buffer.readUInt16BE(exifMarker + 2);
        if (exifLength > 65000) {
          // Reasonable EXIF size limit
          return {
            valid: false,
            error: "Image contains suspicious EXIF data",
          };
        }
      }

      // Check for SVG specific security issues
      if (file.mimetype === "image/svg+xml") {
        const svgContent = buffer.toString("utf8");

        // Check for scripts in SVG
        if (
          svgContent.includes("<script") ||
          svgContent.includes("javascript:")
        ) {
          return {
            valid: false,
            error: "SVG contains potentially malicious scripts",
          };
        }

        // Check for external references
        if (
          svgContent.includes('xlink:href="http') ||
          svgContent.includes('href="http')
        ) {
          return {
            valid: false,
            error: "SVG contains external references",
          };
        }
      }

      return { valid: true };
    } catch (error) {
      this.logger.error(
        `Error validating image safety: ${getErrorMessage(error)}`
      );
      return {
        valid: false,
        error: "Unable to validate image safety",
      };
    }
  }

  private sanitizeFilename(filename: string): string {
    // Remove dangerous characters and normalize
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .replace(/\.+/g, ".")
      .replace(/^\.+/, "")
      .substring(0, 255); // Limit filename length
  }

  private generateFilename(originalName: string): string {
    const sanitized = this.sanitizeFilename(originalName);
    const ext = path.extname(sanitized);
    const name = path.basename(sanitized, ext);
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString("hex");

    return `${name}_${timestamp}_${random}${ext}`;
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await access(dirPath, fs.constants.F_OK);
    } catch {
      await mkdir(dirPath, { recursive: true });
      this.logger.log(`Created upload directory: ${dirPath}`);
    }
  }

  async getFileHash(filePath: string): Promise<string> {
    const buffer = await fs.promises.readFile(filePath);
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  async quarantineFile(filePath: string): Promise<void> {
    const quarantinePath = path.join(this.uploadDir, "quarantine");
    await this.ensureDirectoryExists(quarantinePath);

    const filename = path.basename(filePath);
    const quarantineFilePath = path.join(
      quarantinePath,
      `${Date.now()}_${filename}`
    );

    await fs.promises.rename(filePath, quarantineFilePath);
    this.logger.warn(`File quarantined: ${filename} -> ${quarantineFilePath}`);
  }

  getFileInfo(
    filename: string,
    folder = "general"
  ): {
    exists: boolean;
    path?: string;
    url?: string;
    stats?: fs.Stats;
  } {
    try {
      const filePath = path.join(this.uploadDir, folder, filename);
      const stats = fs.statSync(filePath);
      const url = `/uploads/${folder}/${filename}`;

      return {
        exists: true,
        path: filePath,
        url,
        stats,
      };
    } catch (error) {
      return {
        exists: false,
      };
    }
  }

  getAllowedFileTypes(): string[] {
    return [...this.allowedMimeTypes];
  }

  getMaxFileSize(): number {
    return this.maxFileSize;
  }
}
