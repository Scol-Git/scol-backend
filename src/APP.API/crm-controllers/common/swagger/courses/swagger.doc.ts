import {
  SwaggerDocSet,
  registerSwaggerDocs,
} from '@api/common/swagger/swagger-docs.registry';
import { crmEndpoint } from '../wrapped-response';
import { CrmCourseDetailsResponseDto } from '@shared/dtos/crm/courses/CrmCourseDetailsResponseDto';
import { UpdateCrmCourseResponseDto } from '@shared/dtos/crm/courses/UpdateCrmCourseResponseDto';

const docs: Record<string, SwaggerDocSet> = {
  'crmCourses.getCourseDetails': crmEndpoint({
    summary: 'Get CRM course details by course ID',
    description:
      'Returns course details for CRM. The courseId parameter is the same identifier returned by search/list endpoints.',
    data: CrmCourseDetailsResponseDto,
    successDescription: 'Course details retrieved successfully',
    notFound: 'Course not found',
  }),
  'crmCourses.updateCourse': crmEndpoint({
    summary: 'Update CRM course details',
    description:
      'Partially updates course and intake fields for the given course ID. ADMIN only.',
    data: UpdateCrmCourseResponseDto,
    successDescription: 'Course updated successfully',
    notFound: 'Course not found',
  }),
};

Object.entries(docs).forEach(([key, value]) => registerSwaggerDocs(key, value));
