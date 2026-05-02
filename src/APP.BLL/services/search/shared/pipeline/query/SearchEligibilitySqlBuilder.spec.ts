import { SearchEligibilitySqlBuilder } from './SearchEligibilitySqlBuilder';

describe('SearchEligibilitySqlBuilder', () => {
  const builder = new SearchEligibilitySqlBuilder();

  it('englishEligibleExpr requires catalog sections to meet minSectionReq (missing section fails)', () => {
    const sql = builder.englishEligibleExpr();
    expect(sql).toContain('sys_EnglishTestSections');
    expect(sql).toContain('minSectionReq');
    expect(sql).toContain('LeadEnglishTestSectionResults');
    expect(sql).toContain('NOT EXISTS');
  });
});
