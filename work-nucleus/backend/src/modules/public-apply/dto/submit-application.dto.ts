import { IsString, IsEmail, IsOptional, MaxLength } from 'class-validator';

export class SubmitApplicationDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  coverLetter?: string;
}
