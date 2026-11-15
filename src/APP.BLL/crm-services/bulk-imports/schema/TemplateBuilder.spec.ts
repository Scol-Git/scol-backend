import { COURSE_SCHEMA } from '../course/course.schema';
import { UNIVERSITY_SCHEMA } from '../university/university.schema';
import { buildTemplate } from './TemplateBuilder';

// Header changes must update these snapshots in the same PR.
describe('TemplateBuilder', () => {
  it('university template', () => {
    expect(buildTemplate(UNIVERSITY_SCHEMA).toString('utf8')).toMatchSnapshot();
  });

  it('course template', () => {
    expect(buildTemplate(COURSE_SCHEMA).toString('utf8')).toMatchSnapshot();
  });
});
