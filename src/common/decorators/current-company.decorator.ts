import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface CurrentCompanyPayload {
  id: number;
  name: string;
  slug: string;
  domain?: string;
  status: string;
}

export const CurrentCompany = createParamDecorator(
  (
    data: keyof CurrentCompanyPayload | undefined,
    ctx: ExecutionContext
  ): CurrentCompanyPayload => {
    const request = ctx.switchToHttp().getRequest();
    const company = request.company;

    if (!company) {
      return null;
    }

    if (data) {
      return company[data];
    }

    return company;
  }
);
