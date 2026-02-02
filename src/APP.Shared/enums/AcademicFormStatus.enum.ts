/**
 * Academic form completion status
 */
export enum AcademicFormStatus {
  /** No academic data has been submitted */
  INCOMPLETE = 'INCOMPLETE',

  /** Some fields are filled but not all required fields */
  PARTIALLY_COMPLETED = 'PARTIALLY_COMPLETED',

  /** All required academic form fields are completed */
  COMPLETED = 'COMPLETED',
}
