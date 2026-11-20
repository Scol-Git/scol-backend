import {
  SwaggerDocSet,
  registerSwaggerDocs,
} from '@api/common/swagger/swagger-docs.registry';
import { crmEndpoint } from '../wrapped-response';
import { CrmCourseDetailsResponseDto } from '@shared/dtos/crm/courses/CrmCourseDetailsResponseDto';
import { UpdateCrmCourseResponseDto } from '@shared/dtos/crm/courses/UpdateCrmCourseResponseDto';
import { SuccessResponseDto } from '@shared/dtos/common/SuccessResponseDto';

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
  'crmCourses.deleteDraftCourse': crmEndpoint({
    summary: 'Delete a never-published draft course intake',
    description:
      'courseId is the intake id. Only when isPublished=false and it was never published. Also removes its scholarships, and the parent draft course (with its English requirements) when no intakes remain. ADMIN only.',
    data: SuccessResponseDto,
    successDescription: 'Draft deleted',
    notFound: 'Course not found',
  }),
};

Object.entries(docs).forEach(([key, value]) => registerSwaggerDocs(key, value));
