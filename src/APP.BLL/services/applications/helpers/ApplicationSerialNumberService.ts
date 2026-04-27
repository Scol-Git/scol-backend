import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, Like } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { Applications } from '@entity/entities/Applications.entity';
import { SysCountries } from '@entity/entities/SysCountries.entity';
import { ValidationException } from '@shared/exceptions/ValidationException';

@Injectable()
export class ApplicationSerialNumberService {
  constructor(private readonly db: AppDbContext) {}

  async generateNextSerialNumber(
    intakeMonth: number,
    intakeYear: number,
    countryId: string,
    manager?: EntityManager,
  ): Promise<string> {
    const monthCode = this.getMonthCode(intakeMonth);
    const countryCode = await this.getCountryCodeOrThrow(countryId, manager);

    const sequence = await this.getNextSequence(
      intakeYear,
      monthCode,
      countryCode,
      manager,
    );

    return this.formatSerialNumber(
      intakeYear,
      monthCode,
      countryCode,
      sequence,
    );
  }

  private async getNextSequence(
    intakeYear: number,
    intakeMonthCode: string,
    countryCode: string,
    manager?: EntityManager,
  ): Promise<number> {
    const applicationRepository = manager
      ? manager.getRepository(Applications)
      : this.db.applications;

    // Serial number format: APP-2025-JAN-UK-0001
    const prefix = `APP-${intakeYear}-${intakeMonthCode}-${countryCode}-`;

    const latest = await applicationRepository.findOne({
      where: {
        serialNumber: Like(`${prefix}%`),
      },
      order: {
        serialNumber: 'DESC',
      },
      select: {
        id: true,
        serialNumber: true,
      },
    });

    if (!latest?.serialNumber) {
      return 1;
    }

    const parts = latest.serialNumber.split('-');
    const sequenceText = parts[parts.length - 1];
    const sequence = Number.parseInt(sequenceText, 10);

    if (!Number.isFinite(sequence) || sequence < 1) {
      return 1;
    }

    return sequence + 1;
  }

  private async getCountryCodeOrThrow(
    countryId: string,
    manager?: EntityManager,
  ): Promise<string> {
    const countryRepository = manager
      ? manager.getRepository(SysCountries)
      : this.db.countries;

    const country = await countryRepository.findOne({
      where: { id: countryId },
      select: {
        id: true,
        countryCode: true,
      },
    });

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    if (!country.countryCode || country.countryCode.trim() === '') {
      throw new ValidationException(
        'Country code is missing for serial number generation',
      );
    }

    return country.countryCode.trim().toUpperCase();
  }

  private formatSerialNumber(
    year: number,
    monthCode: string,
    countryCode: string,
    sequence: number,
  ): string {
    // Serial number format: APP-2025-JAN-UK-0001
    return `APP-${year}-${monthCode}-${countryCode}-${sequence
      .toString()
      .padStart(4, '0')}`;
  }

  private getMonthCode(month: number): string {
    const map = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ];
    const monthCode = map[month - 1];
    if (!monthCode) {
      throw new ValidationException(
        'Invalid intake month for serial generation',
      );
    }
    return monthCode;
  }
}
