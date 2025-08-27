import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

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
  private readonly uploadDir = process.env.UPLOAD_DIR || "./uploads";
  private readonly maxFileSize =
    parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB
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

  async uploadFile(
    file: UploadedFile,
    folder = "general",
  ): Promise<FileUploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
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
      this.logger.error(`File upload failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async uploadMultipleFiles(
    files: UploadedFile[],
    folder = "general",
  ): Promise<FileUploadResult[]> {
    const results = await Promise.all(
      files.map((file) => this.uploadFile(file, folder)),
    );

    return results;
  }

  async uploadAvatar(
    file: UploadedFile,
    userId: string,
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
      this.logger.error(`Failed to delete file: ${error.message}`);
      return false;
    }
  }

  private validateFile(file: UploadedFile): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`,
      };
    }

    // Check mime type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `File type ${file.mimetype} is not allowed`,
      };
    }

    // Check if file has content
    if (!file.buffer || file.buffer.length === 0) {
      return {
        valid: false,
        error: "File is empty",
      };
    }

    return { valid: true };
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await access(dirPath);
    } catch (error) {
      await mkdir(dirPath, { recursive: true });
    }
  }

  private generateFilename(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const extension = path.extname(originalName);
    const baseName = path
      .basename(originalName, extension)
      .replace(/[^a-zA-Z0-9]/g, "_")
      .substring(0, 50);

    return `${timestamp}_${random}_${baseName}${extension}`;
  }

  getFileInfo(
    filename: string,
    folder = "general",
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
