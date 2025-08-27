import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsJWT } from "class-validator";

export class RefreshTokenDto {
  @ApiProperty({
    description: "JWT refresh token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  @IsNotEmpty({ message: "Refresh token is required" })
  @IsJWT({ message: "Invalid refresh token format" })
  refreshToken: string;
}
