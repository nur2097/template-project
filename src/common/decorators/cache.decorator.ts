import { SetMetadata } from "@nestjs/common";

export const CACHE_KEY_METADATA = "cache_key";
export const CACHE_TTL_METADATA = "cache_ttl";
export const CACHE_ENABLED_METADATA = "cache_enabled";

export const CacheKey = (key: string) => SetMetadata(CACHE_KEY_METADATA, key);

export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL_METADATA, ttl);

export const CacheEnabled = (enabled: boolean = true) =>
  SetMetadata(CACHE_ENABLED_METADATA, enabled);

export const NoCache = () => SetMetadata(CACHE_ENABLED_METADATA, false);
