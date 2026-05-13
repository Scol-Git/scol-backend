import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUrl } from 'class-validator';

export class DataEntryImportRequestDto {
  @ApiProperty({
    description: 'URL to the uni CSV file',
    example: 'https://example.com/uni.csv',
  })
  @IsUrl({}, { message: 'uniCsvUrl must be a valid URL' })
  @IsNotEmpty({ message: 'uniCsvUrl is required' })
  uniCsvUrl!: string;
}
