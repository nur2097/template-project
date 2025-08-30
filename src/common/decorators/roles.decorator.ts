import { createMetadataDecorator } from "./metadata.decorator";

export const ROLES_KEY = "roles";
export const Roles = createMetadataDecorator<string>(ROLES_KEY);
