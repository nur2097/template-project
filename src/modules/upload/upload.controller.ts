import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from "@nestjs/swagger";
import {
  CanUpload,
  CanReadFiles,
} from "../../common/decorators/casbin.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import {
  UploadService,
  UploadedFile as CustomUploadedFile,
} from "./upload.service";

@ApiTags("Upload")
@Controller("upload")
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post("single")
  @CanUpload()
  @ApiOperation({ summary: "Upload single file" })
  @ApiResponse({ status: 200, description: "File uploaded successfully" })
  @ApiResponse({ status: 400, description: "Invalid file" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  async uploadSingle(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    const uploadedFile: CustomUploadedFile = {
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      buffer: file.buffer,
      size: file.size,
    };

    const result = await this.uploadService.uploadFile(uploadedFile);

    if (!result.success) {
      throw new BadRequestException(result.error);
    }

    return {
      message: "File uploaded successfully",
      ...result,
    };
  }

  @Post("multiple")
  @CanUpload()
  @ApiOperation({ summary: "Upload multiple files" })
  @ApiResponse({ status: 200, description: "Files uploaded successfully" })
  @ApiResponse({ status: 400, description: "Invalid files" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FilesInterceptor("files", 10))
  async uploadMultiple(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException("No files provided");
    }

    const uploadedFiles: CustomUploadedFile[] = files.map((file) => ({
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      buffer: file.buffer,
      size: file.size,
    }));

    const results = await this.uploadService.uploadMultipleFiles(uploadedFiles);

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    return {
      message: `${successful.length} files uploaded successfully, ${failed.length} failed`,
      successful,
      failed,
      total: files.length,
    };
  }

  @Post("avatar")
  @CanUpload()
  @ApiOperation({ summary: "Upload user avatar" })
  @ApiResponse({ status: 200, description: "Avatar uploaded successfully" })
  @ApiResponse({ status: 400, description: "Invalid image file" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("avatar"))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser("id") userId: number
  ) {
    if (!file) {
      throw new BadRequestException("No avatar file provided");
    }

    const uploadedFile: CustomUploadedFile = {
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      buffer: file.buffer,
      size: file.size,
    };

    const result = await this.uploadService.uploadAvatar(
      uploadedFile,
      userId.toString()
    );

    if (!result.success) {
      throw new BadRequestException(result.error);
    }

    return {
      message: "Avatar uploaded successfully",
      ...result,
    };
  }

  @Get("info/:folder/:filename")
  @CanReadFiles()
  @ApiOperation({ summary: "Get file information" })
  @ApiResponse({ status: 200, description: "File information retrieved" })
  @ApiResponse({ status: 404, description: "File not found" })
  async getFileInfo(
    @Param("folder") folder: string,
    @Param("filename") filename: string
  ) {
    const fileInfo = this.uploadService.getFileInfo(filename, folder);

    if (!fileInfo.exists) {
      throw new BadRequestException("File not found");
    }

    return {
      message: "File information retrieved",
      filename,
      folder,
      url: fileInfo.url,
      size: fileInfo.stats?.size,
      createdAt: fileInfo.stats?.birthtime,
      modifiedAt: fileInfo.stats?.mtime,
    };
  }

  @Get("config")
  @CanReadFiles()
  @ApiOperation({ summary: "Get upload configuration" })
  @ApiResponse({ status: 200, description: "Upload configuration retrieved" })
  async getUploadConfig() {
    return {
      maxFileSize: this.uploadService.getMaxFileSize(),
      maxFileSizeMB: Math.round(
        this.uploadService.getMaxFileSize() / 1024 / 1024
      ),
      allowedFileTypes: this.uploadService.getAllowedFileTypes(),
      message: "Upload configuration retrieved successfully",
    };
  }
}
