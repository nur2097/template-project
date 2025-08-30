import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseInterceptors,
} from "@nestjs/common";
import { CacheInterceptor } from "@nestjs/cache-manager";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { RequireAuth } from "../../common/decorators/require-auth.decorator";
import {
  CacheKey,
  CacheTTL,
  NoCache,
} from "../../common/decorators/cache.decorator";
import { CacheService } from "../../shared/cache/cache.service";

@ApiTags("Cache")
@Controller("cache")
@ApiBearerAuth()
@RequireAuth("SUPERADMIN")
export class CacheController {
  constructor(private readonly cacheService: CacheService) {}

  @Get("test")
  @UseInterceptors(CacheInterceptor)
  @CacheKey("cache:test:data")
  @CacheTTL(60) // 1 minute
  @ApiOperation({ summary: "Test cache functionality" })
  @ApiResponse({ status: 200, description: "Cache test successful" })
  async testCache() {
    // Simulate slow operation
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      message: "This response is cached for 60 seconds",
      timestamp: new Date().toISOString(),
      randomValue: Math.random(),
    };
  }

  @Get("test-no-cache")
  @NoCache()
  @ApiOperation({ summary: "Test non-cached endpoint" })
  @ApiResponse({ status: 200, description: "Non-cached response" })
  async testNoCache() {
    return {
      message: "This response is never cached",
      timestamp: new Date().toISOString(),
      randomValue: Math.random(),
    };
  }

  @Post("invalidate/:pattern")
  @ApiOperation({ summary: "Invalidate cache by pattern" })
  @ApiResponse({ status: 200, description: "Cache invalidated successfully" })
  async invalidatePattern(@Param("pattern") pattern: string) {
    await this.cacheService.invalidatePattern(pattern);
    return { message: `Cache pattern '${pattern}' invalidated successfully` };
  }

  @Delete("clear")
  @ApiOperation({ summary: "Clear all cache" })
  @ApiResponse({ status: 200, description: "Cache cleared successfully" })
  async clearCache() {
    await this.cacheService.reset();
    return { message: "All cache cleared successfully" };
  }

  @Get("stats")
  @NoCache()
  @ApiOperation({ summary: "Get cache statistics" })
  @ApiResponse({ status: 200, description: "Cache statistics retrieved" })
  async getCacheStats() {
    // Since we're using Redis, we can get some basic stats
    return {
      message: "Cache statistics",
      timestamp: new Date().toISOString(),
      note: "Detailed Redis stats available via Redis CLI",
    };
  }
}
