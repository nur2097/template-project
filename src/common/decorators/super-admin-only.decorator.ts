import { createSingleValueDecorator } from "./metadata.decorator";
import { SUPER_ADMIN_ONLY_KEY } from "../guards/unified-auth.guard";

export const SuperAdminOnly = () =>
  createSingleValueDecorator<boolean>(SUPER_ADMIN_ONLY_KEY)(true);
