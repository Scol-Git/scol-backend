import { IsNotEmpty, IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class RegistrationRequestDto {
  @IsPhoneNumber('BD', { message: 'phone must be a valid BD phone number' })
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  password!: string;
}

