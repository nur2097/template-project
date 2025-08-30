import { createMetadataDecorator } from "./metadata.decorator";

export const PERMISSIONS_KEY = "permissions";
export const RequirePermissions =
  createMetadataDecorator<string>(PERMISSIONS_KEY);
