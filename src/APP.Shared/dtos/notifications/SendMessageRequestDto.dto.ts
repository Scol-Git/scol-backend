/**
 * DTO for sending message to RabbitMQ
 *
 * @class SendMessageRequestDto
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class SendMessageRequestDto {
  @ApiProperty({
    description: 'Queue or exchange name',
    example: 'scol.events',
  })
  @IsString()
  queueOrExchange!: string;

  @ApiProperty({
    description: 'Routing key for message routing',
    example: 'organization.created',
    required: false,
  })
  @IsOptional()
  @IsString()
  routingKey?: string;

  @ApiProperty({
    description: 'Message payload (any JSON object)',
    example: {
      type: 'OrganizationCreated',
      data: { id: 1, name: 'Acme Corp' },
    },
  })
  @IsObject()
  message!: any;
}

