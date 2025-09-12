import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface CurrentUserPayload {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  systemRole: string;
  companyId: number;
  roles?: string[];
  permissions?: string[];
}

export const CurrentUser = createParamDecorator(
  (
    data: keyof CurrentUserPayload | undefined,
    ctx: ExecutionContext
  ): CurrentUserPayload | null => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    if (data) {
      return user[data];
    }

    return user;
  }
);
