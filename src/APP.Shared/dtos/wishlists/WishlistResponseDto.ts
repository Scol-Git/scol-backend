import { ApiProperty } from '@nestjs/swagger';

export class WishlistResponseDto {
  @ApiProperty()
  courseId!: string;

  @ApiProperty()
  courseName!: string;

  @ApiProperty({
    example: {
      id: 'uuid',
      name: 'Oxford University',
      country: 'United Kingdom',
      state: 'Oxfordshire',
      city: 'Oxford',
      logoUrl: 'https://...',
      imgUrl: 'https://...',
    },
  })
  university!: {
    id: string;
    name: string;
    country: string;
    state: string;
    city: string;
    logoUrl: string;
    imgUrl: string;
  };

  @ApiProperty()
  imgUrl!: string;

  @ApiProperty({
    example: { name: 'September 2026', year: 2026 },
  })
  intake!: {
    name: string;
    year: number;
  };

  @ApiProperty()
  tuitionFee!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  durationMonths!: number;

  @ApiProperty({ nullable: true, type: Number })
  initialDeposit!: number | null;

  @ApiProperty()
  applicationFee!: number;

  @ApiProperty()
  isScholarshipAvailable!: boolean;

  @ApiProperty({
    isArray: true,
    example: [{ testName: 'IELTS', overall: 6.5, section: 6.0 }],
  })
  engRequirements!: {
    testName: string;
    overall: number;
    section: number;
  }[];
}
