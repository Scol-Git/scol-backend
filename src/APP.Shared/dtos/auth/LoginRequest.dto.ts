import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class LoginRequestDto {
  @ValidateIf((o) => !o.phone)
  @IsEmail({}, { message: 'email must be a valid email if provided' })
  @IsOptional()
  email?: string;

  @ValidateIf((o) => !o.email)
  @IsPhoneNumber('BD', { message: 'phone must be a valid BD phone number if provided' })
  @IsOptional()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  password!: string;
}

