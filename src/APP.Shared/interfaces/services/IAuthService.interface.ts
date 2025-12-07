export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  isPhoneVerified?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginInput {
  phone: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SetPasswordInput {
  phone: string;
  password: string;
}

export interface VerifyOtpInput {
  phone: string;
  otp: string;
}

export interface SendOtpInput {
  phone: string;
  ipAddress?: string;
}

export interface IAuthService {
  sendOtp(input: SendOtpInput): Promise<void>;
  verifyOtp(input: VerifyOtpInput): Promise<TokenPair>;
  setPassword(input: SetPasswordInput): Promise<TokenPair>;
  register(input: RegisterInput): Promise<TokenPair>;
  login(input: LoginInput): Promise<TokenPair>;
  refresh(refreshToken: string): Promise<TokenPair>;
}

