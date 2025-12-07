import { IsNotEmpty, IsPhoneNumber, IsString } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @IsNotEmpty()
  accessToken!: string;

  @IsPhoneNumber('BD', { message: 'phone must be a valid BD phone number' })
  @IsNotEmpty()
  phone!: string;
}

