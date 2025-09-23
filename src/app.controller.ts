import { Controller, Get } from "@nestjs/common";
import { Public } from "./common/decorators/public.decorator";

@Controller()
export class AppController {
  @Public()
  @Get()
  getRoot() {
    console.log("🚀 AppController.getRoot() called!");
    return {
      message: "Enterprise NestJS API is running",
      version: "1.0.0",
      health: "/api/health",
      docs: "/api/docs",
    };
  }

  @Public()
  @Get("status")
  getStatus() {
    console.log("🚀 AppController.getStatus() called!");
    return {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get("test")
  getTest() {
    console.log("🚀 AppController.getTest() called!");
    return {
      message: "Test endpoint works!",
      timestamp: new Date().toISOString(),
    };
  }
}
