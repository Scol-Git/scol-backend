-- ======================================================
-- 1) APPLICATION STAGES (UI ORDER)
-- ======================================================
INSERT INTO "sys_ApplicationStage"
("id","stageCode","stageName","stageOrder","isTerminal","stageInformation","createdAt","updatedAt")
VALUES
(gen_random_uuid(),'REVIEW','Review',1,false,'Initial review of applicant documents.',now(),now()),
(gen_random_uuid(),'SUBMITTED','Submitted',2,false,'Application submitted to institution.',now(),now()),
(gen_random_uuid(),'CONDITIONAL','Conditional',3,false,'Conditional offer received.',now(),now()),
(gen_random_uuid(),'UNCONDITIONAL','Unconditional',4,false,'Unconditional offer received.',now(),now()),
(gen_random_uuid(),'INTERVIEW','Interview / GS',5,false,'Interview scheduled or GS/interview-related processing.',now(),now()),
(gen_random_uuid(),'PAYMENT','Payment',6,false,'Tuition/deposit payment processing.',now(),now()),
(gen_random_uuid(),'CAS_COE','CAS / COE',7,false,'CAS or COE document issuance.',now(),now()),
(gen_random_uuid(),'VISA','Visa',8,false,'Visa application and decision.',now(),now()),
(gen_random_uuid(),'ENROLLED','Enrolled',9,true,'Student enrolled at institution.',now(),now())
ON CONFLICT ("stageCode") DO NOTHING;

-- ======================================================
-- 2) APPLICATION STATUSES
-- ======================================================
INSERT INTO "sys_ApplicationStatus"
("id","statusCode","statusName","statusOrder","isTerminal","createdAt","updatedAt")
VALUES
(gen_random_uuid(),'IN_PROGRESS','In Progress',1,false,now(),now()),
(gen_random_uuid(),'PENDING','Pending',2,false,now(),now()),
(gen_random_uuid(),'ON_HOLD','On Hold',3,false,now(),now()),
(gen_random_uuid(),'COMPLETED','Completed',4,true,now(),now()),
(gen_random_uuid(),'REJECTED','Rejected',5,true,now(),now()),
(gen_random_uuid(),'CANCELLED','Cancelled',6,true,now(),now())
ON CONFLICT ("statusCode") DO NOTHING;

-- ======================================================
-- 3) STAGE → STATUS MAPPING
-- ======================================================
WITH s AS (
  SELECT id, "stageCode" FROM "sys_ApplicationStage"
),
st AS (
  SELECT id, "statusCode" FROM "sys_ApplicationStatus"
)
INSERT INTO "sys_ApplicationStage2Status"
("id","sysApplicationStageId","sysApplicationStatusId","createdAt","updatedAt")
SELECT gen_random_uuid(), s.id, st.id, now(), now()
FROM s
JOIN st ON (
     (s."stageCode"='REVIEW'        AND st."statusCode" IN ('IN_PROGRESS','PENDING','ON_HOLD','COMPLETED','REJECTED','CANCELLED'))
  OR (s."stageCode"='SUBMITTED'     AND st."statusCode" IN ('IN_PROGRESS','PENDING','ON_HOLD','COMPLETED','REJECTED','CANCELLED'))
  OR (s."stageCode"='CONDITIONAL'   AND st."statusCode" IN ('IN_PROGRESS','ON_HOLD','COMPLETED','REJECTED','CANCELLED'))
  OR (s."stageCode"='UNCONDITIONAL' AND st."statusCode" IN ('IN_PROGRESS','PENDING','ON_HOLD','COMPLETED','REJECTED','CANCELLED'))
  OR (s."stageCode"='INTERVIEW'     AND st."statusCode" IN ('IN_PROGRESS','PENDING','ON_HOLD','COMPLETED','REJECTED','CANCELLED'))
  OR (s."stageCode"='PAYMENT'       AND st."statusCode" IN ('IN_PROGRESS','PENDING','ON_HOLD','COMPLETED','REJECTED','CANCELLED'))
  OR (s."stageCode"='CAS_COE'       AND st."statusCode" IN ('IN_PROGRESS','PENDING','ON_HOLD','COMPLETED','REJECTED','CANCELLED'))
  OR (s."stageCode"='VISA'          AND st."statusCode" IN ('IN_PROGRESS','PENDING','ON_HOLD','COMPLETED','REJECTED','CANCELLED'))
  OR (s."stageCode"='ENROLLED'      AND st."statusCode" IN ('IN_PROGRESS','PENDING','ON_HOLD','COMPLETED','CANCELLED'))
)
AND NOT EXISTS (
  SELECT 1
  FROM "sys_ApplicationStage2Status" x
  WHERE x."sysApplicationStageId" = s.id
    AND x."sysApplicationStatusId" = st.id
);


-- ======================================================
-- 4) DOCUMENT TYPES
-- ======================================================
INSERT INTO "sys_DocumentTypes"
("id","documentTypeCode","documentTypeName","documentScope","isMultipleAllowed","allowedMimeTypes","maxFileSizeBytes","isActive","createdAt","updatedAt")
VALUES
-- Common / Early-stage
(gen_random_uuid(),'PASSPORT','Passport','LEAD',true,'application/pdf,image/jpeg,image/png',5242880,true,now(),now()),
(gen_random_uuid(),'TRANSCRIPT','Transcript','LEAD',true,'application/pdf,image/jpeg,image/png',5242880,true,now(),now()),
(gen_random_uuid(),'CERTIFICATE','Certificate','LEAD',true,'application/pdf,image/jpeg,image/png',5242880,true,now(),now()),
(gen_random_uuid(),'ENGLISH_TEST','English Test','LEAD',true,'application/pdf,image/jpeg,image/png',5242880,true,now(),now()),
(gen_random_uuid(),'CV','CV','APPLICATION',true,'application/pdf',2097152,true,now(),now()),
(gen_random_uuid(),'SOP','SOP','APPLICATION',true,'application/pdf',2097152,true,now(),now()),
(gen_random_uuid(),'REFERENCE_LETTER','Reference Letter','APPLICATION',true,'application/pdf,image/jpeg,image/png',5242880,true,now(),now()),

-- Post-submission / later-stage
(gen_random_uuid(),'CONDITIONAL_OFFER_LETTER','Conditional Offer Letter','APPLICATION',true,'application/pdf',5242880,true,now(),now()),
(gen_random_uuid(),'UNCONDITIONAL_OFFER_LETTER','Unconditional Offer Letter','APPLICATION',true,'application/pdf',5242880,true,now(),now()),
(gen_random_uuid(),'PAYMENT_RECEIPT','Payment Receipt','APPLICATION',true,'application/pdf,image/jpeg,image/png',5242880,true,now(),now()),
(gen_random_uuid(),'GS_DOCUMENTS','GS Documents','APPLICATION',true,'application/pdf,image/jpeg,image/png',5242880,true,now(),now()),
(gen_random_uuid(),'CAS_DOCUMENTS','CAS Documents','APPLICATION',true,'application/pdf,image/jpeg,image/png',5242880,true,now(),now()),
(gen_random_uuid(),'CAS_LETTER','CAS Letter','APPLICATION',true,'application/pdf',5242880,true,now(),now()),
(gen_random_uuid(),'COE_LETTER','COE Letter','APPLICATION',true,'application/pdf',5242880,true,now(),now()),
(gen_random_uuid(),'VISA_APPLICATION','Visa Application','APPLICATION',true,'application/pdf,image/jpeg,image/png',5242880,true,now(),now()),
(gen_random_uuid(),'VISA_DECISION','Visa Decision','APPLICATION',true,'application/pdf,image/jpeg,image/png',5242880,true,now(),now()),
(gen_random_uuid(),'ENROLLMENT_CONFIRMATION','Enrollment Confirmation','APPLICATION',true,'application/pdf',5242880,true,now(),now()),

-- Always available
(gen_random_uuid(),'OTHERS','Other Documents','APPLICATION',true,'application/pdf,image/jpeg,image/png',10485760,true,now(),now())
ON CONFLICT ("documentTypeCode") DO NOTHING;

-- ======================================================
-- 5) STAGE REQUIRED DOCUMENTS
-- ======================================================
WITH c AS (
  SELECT id
  FROM "sys_Countries"
  WHERE "countryName" = 'South England'
),
s AS (
  SELECT id, "stageCode"
  FROM "sys_ApplicationStage"
),
d AS (
  SELECT id, "documentTypeCode"
  FROM "sys_DocumentTypes"
  WHERE "isActive" = true
)
INSERT INTO "sys_StageRequiredDocuments"
("id","sysCountryId","sysApplicationStageId","sysDocumentTypeId",
 "isRequired","minCount","maxCount","displayOrder","isActive","createdAt","updatedAt")
SELECT
  gen_random_uuid(),
  c.id,
  s.id,
  d.id,

  -- REQUIRED LOGIC
  CASE
    WHEN s."stageCode"='REVIEW' AND d."documentTypeCode" IN
      ('PASSPORT','TRANSCRIPT','CERTIFICATE','ENGLISH_TEST','CV','SOP','REFERENCE_LETTER') THEN true
    WHEN s."stageCode"='CONDITIONAL'   AND d."documentTypeCode"='CONDITIONAL_OFFER_LETTER' THEN true
    WHEN s."stageCode"='UNCONDITIONAL' AND d."documentTypeCode"='UNCONDITIONAL_OFFER_LETTER' THEN true
    WHEN s."stageCode"='PAYMENT'       AND d."documentTypeCode"='PAYMENT_RECEIPT' THEN true
    WHEN s."stageCode"='INTERVIEW'     AND d."documentTypeCode" IN ('GS_DOCUMENTS','CAS_DOCUMENTS') THEN false
    WHEN s."stageCode"='CAS_COE'       AND d."documentTypeCode" IN ('CAS_LETTER','COE_LETTER') THEN true
    WHEN s."stageCode"='VISA'          AND d."documentTypeCode" IN ('VISA_APPLICATION','VISA_DECISION') THEN true
    WHEN s."stageCode"='ENROLLED'      AND d."documentTypeCode"='ENROLLMENT_CONFIRMATION' THEN true
    ELSE false
  END,

  -- MIN COUNT (all 0)
  0,
  -- MAX COUNT (all 10)
  10,

  -- DISPLAY ORDER
  CASE d."documentTypeCode"
    WHEN 'PASSPORT' THEN 1
    WHEN 'TRANSCRIPT' THEN 2
    WHEN 'CERTIFICATE' THEN 3
    WHEN 'ENGLISH_TEST' THEN 4
    WHEN 'CV' THEN 5
    WHEN 'SOP' THEN 6
    WHEN 'REFERENCE_LETTER' THEN 7
    WHEN 'CONDITIONAL_OFFER_LETTER' THEN 8
    WHEN 'UNCONDITIONAL_OFFER_LETTER' THEN 9
    WHEN 'GS_DOCUMENTS' THEN 10
    WHEN 'CAS_DOCUMENTS' THEN 11
    WHEN 'PAYMENT_RECEIPT' THEN 12
    WHEN 'CAS_LETTER' THEN 13
    WHEN 'COE_LETTER' THEN 14
    WHEN 'VISA_APPLICATION' THEN 15
    WHEN 'VISA_DECISION' THEN 16
    WHEN 'ENROLLMENT_CONFIRMATION' THEN 17
    WHEN 'OTHERS' THEN 99
  END,

  true,
  now(),
  now()
FROM c, s, d
WHERE
(
  (s."stageCode"='REVIEW' AND d."documentTypeCode" IN
    ('PASSPORT','TRANSCRIPT','CERTIFICATE','ENGLISH_TEST','CV','SOP','REFERENCE_LETTER','OTHERS'))

  OR (s."stageCode"='SUBMITTED' AND d."documentTypeCode" IN ('OTHERS'))

  OR (s."stageCode"='CONDITIONAL' AND d."documentTypeCode" IN
    ('CONDITIONAL_OFFER_LETTER','OTHERS'))

  OR (s."stageCode"='UNCONDITIONAL' AND d."documentTypeCode" IN
    ('UNCONDITIONAL_OFFER_LETTER','OTHERS'))

  OR (s."stageCode"='INTERVIEW' AND d."documentTypeCode" IN
    ('GS_DOCUMENTS','CAS_DOCUMENTS','OTHERS'))

  OR (s."stageCode"='PAYMENT' AND d."documentTypeCode" IN
    ('PAYMENT_RECEIPT','OTHERS'))

  OR (s."stageCode"='CAS_COE' AND d."documentTypeCode" IN
    ('CAS_LETTER','COE_LETTER','OTHERS'))

  OR (s."stageCode"='VISA' AND d."documentTypeCode" IN
    ('VISA_APPLICATION','VISA_DECISION','OTHERS'))

  OR (s."stageCode"='ENROLLED' AND d."documentTypeCode" IN
    ('ENROLLMENT_CONFIRMATION','OTHERS'))
)
AND NOT EXISTS (
  SELECT 1
  FROM "sys_StageRequiredDocuments" x
  WHERE x."sysCountryId" = c.id
    AND x."sysApplicationStageId" = s.id
    AND x."sysDocumentTypeId" = d.id
);
