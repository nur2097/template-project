import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class RefreshTokenDto {
  @ApiProperty({
    description: "Refresh token (hex string)",
    example: "422ad3ad5d15b6e9473ef63ec58fa3405e8716fc19451b32c9f6cfec3c6d8520",
  })
  @IsString()
  @IsNotEmpty({ message: "Refresh token is required" })
  @MinLength(64, { message: "Invalid refresh token format" })
  refreshToken: string;
}
