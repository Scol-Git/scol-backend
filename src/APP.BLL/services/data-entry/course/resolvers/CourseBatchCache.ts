import { UniCourses } from '@entity/entities/UniCourses.entity';
import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import { CourseEngReq } from '@entity/entities/CourseEngReq.entity';
import { CourseIntakeScholarships } from '@entity/entities/CourseIntakeScholarships.entity';

export interface CourseBatchCache {
  // key: `${uniId}::${sysProgrammeId}::${sysDegreeId}::${courseName.toLowerCase()}`
  courseByKey: Map<string, UniCourses>;
  // key: `${uniCourseId}::${intakeMonth}::${intakeYear}`
  intakeByKey: Map<string, UniCourseIntakes>;
  // key: uniCourseId -> all CourseEngReq rows for that course
  engReqByCourseId: Map<string, CourseEngReq[]>;
  // key: `${courseIntakeId}::${name.toLowerCase()}`
  scholarshipByKey: Map<string, CourseIntakeScholarships>;
}
