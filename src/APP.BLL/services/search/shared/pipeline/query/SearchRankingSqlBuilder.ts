import { Injectable } from '@nestjs/common';
import { CommissionType } from '@shared/enums/CommissionType.enum';

export const COUNTRY_PREFERENCE_WEIGHT = 1500;
export const PROGRAMME_PREFERENCE_WEIGHT = 1500;

@Injectable()
export class SearchRankingSqlBuilder {
  private readonly COMMISSION_MULTIPLIER = 100;
  private readonly COMMISSION_MAX_WEIGHT = 5000;

  commissionScoreExpr(uniAlias = 'uni'): string {
    return `(CASE
      WHEN COALESCE(${uniAlias}."commissionType", '${CommissionType.AMOUNT}') = '${CommissionType.AMOUNT}'
      THEN LEAST(COALESCE(CAST(${uniAlias}."commission" AS DECIMAL), 0), ${this.COMMISSION_MAX_WEIGHT})
      ELSE LEAST(
        COALESCE(CAST(${uniAlias}."commission" AS DECIMAL), 0) * ${this.COMMISSION_MULTIPLIER},
        ${this.COMMISSION_MAX_WEIGHT}
      )
    END)`;
  }

  /** Requires LEFT JOIN aliases lpc, lpp (LeadPreferredCountries / LeadPreferredPrograms). */
  preferenceScoreExpr(): string {
    return `(
      (CASE WHEN lpc.lead_id IS NOT NULL
        THEN ${COUNTRY_PREFERENCE_WEIGHT} ELSE 0 END)
      +
      (CASE WHEN lpp.lead_id IS NOT NULL
        THEN ${PROGRAMME_PREFERENCE_WEIGHT} ELSE 0 END)
    )`;
  }

  personalizedRankScoreExpr(
    preferenceExpr: string,
    commissionExpr: string,
  ): string {
    return `CAST((${preferenceExpr}) + (${commissionExpr}) AS BIGINT)`;
  }
}
