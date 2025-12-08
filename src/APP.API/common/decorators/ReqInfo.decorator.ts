import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface ReqInfoPayload {
  ip: string;
  userAgent?: string;
}

export const ReqInfo = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ReqInfoPayload => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const userAgentHeader = req.headers['user-agent'];

    const userAgent =
      typeof userAgentHeader === 'string'
        ? userAgentHeader
        : userAgentHeader?.[0];

    return {
      ip: req.ip || '',
      userAgent,
    };
  },
);
