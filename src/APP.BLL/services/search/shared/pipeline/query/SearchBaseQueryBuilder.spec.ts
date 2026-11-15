import { SearchBaseQueryBuilder } from './SearchBaseQueryBuilder';
import {
  SearchExecutionSource,
  type PipelineParams,
} from '../SearchPipelineTypes';
import { PublishStatus } from '@shared/enums/crm/PublishStatus.enum';

describe('SearchBaseQueryBuilder.applyPublishFilter', () => {
  const builder = new SearchBaseQueryBuilder({} as never);
  const run = (params: Partial<PipelineParams>) => {
    const qb = { andWhere: jest.fn().mockReturnThis() };
    builder.applyPublishFilter(qb as never, params as PipelineParams);
    return qb.andWhere.mock.calls.map((c) => c[0]);
  };

  it('Lead source cannot request drafts', () => {
    expect(
      run({ source: SearchExecutionSource.HOME, publishStatus: PublishStatus.DRAFT }),
    ).toEqual(['ci.isPublished = true']);
  });

  it('CRM defaults to PUBLISHED', () => {
    expect(run({ source: SearchExecutionSource.CRM })).toEqual(['ci.isPublished = true']);
  });

  it('CRM DRAFT shows drafts only', () => {
    expect(
      run({ source: SearchExecutionSource.CRM, publishStatus: PublishStatus.DRAFT }),
    ).toEqual(['ci.isPublished = false']);
  });

  it('CRM ALL adds no publish condition', () => {
    expect(
      run({ source: SearchExecutionSource.CRM, publishStatus: PublishStatus.ALL }),
    ).toEqual([]);
  });

  it('CRM batch / university filters apply only for CRM', () => {
    expect(
      run({ source: SearchExecutionSource.CRM, importBatchId: 'b', uniId: 'u' }),
    ).toEqual([
      'ci.isPublished = true',
      'ci.importBatchId = :importBatchId',
      'course.uniId = :uniId',
    ]);
    expect(run({ source: SearchExecutionSource.HOME, importBatchId: 'b' })).toEqual([
      'ci.isPublished = true',
    ]);
  });
});
