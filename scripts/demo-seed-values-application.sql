-- ======================================================
-- 1) APPLICATION STAGES (UI ORDER)
-- ======================================================
INSERT INTO "sys_ApplicationStage"
("id","stageCode","stageName","stageOrder","isTerminal","stageInformation","createdAt","updatedAt")
VALUES
(gen_random_uuid(),'REVIEW','Review',1,false,'Application is under preparation and document collection.',now(),now()),
(gen_random_uuid(),'SUBMITTED','Submitted',2,false,'Application submitted to university and awaiting response.',now(),now()),
(gen_random_uuid(),'CONDITIONAL','Conditional',3,false,'Conditional offer received. Requirements must be fulfilled.',now(),now()),
(gen_random_uuid(),'UNCONDITIONAL','Unconditional',4,false,'Unconditional offer received.',now(),now()),
(gen_random_uuid(),'INTERVIEW','Interview',5,false,'Interview stage in progress.',now(),now()),
(gen_random_uuid(),'PAYMENT','Payment',6,false,'Payment process ongoing.',now(),now()),
(gen_random_uuid(),'CAS_COE','CAS / COE',7,false,'CAS or COE issued.',now(),now()),
(gen_random_uuid(),'VISA','Visa',8,false,'Visa process ongoing.',now(),now()),
(gen_random_uuid(),'ENROLLED','Enrolled',9,true,'Student successfully enrolled.',now(),now())
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
     (s."stageCode"='REVIEW' AND st."statusCode" IN ('IN_PROGRESS','ON_HOLD','COMPLETED','CANCELLED'))
  OR (s."stageCode"='SUBMITTED' AND st."statusCode" IN ('PENDING','IN_PROGRESS','ON_HOLD','COMPLETED','REJECTED'))
  OR (s."stageCode"='CONDITIONAL' AND st."statusCode" IN ('PENDING','IN_PROGRESS','ON_HOLD','COMPLETED','REJECTED'))
  OR (s."stageCode"='UNCONDITIONAL' AND st."statusCode" IN ('PENDING','IN_PROGRESS','ON_HOLD','COMPLETED','REJECTED'))
  OR (s."stageCode"='INTERVIEW' AND st."statusCode" IN ('PENDING','IN_PROGRESS','ON_HOLD','COMPLETED','REJECTED'))
  OR (s."stageCode"='PAYMENT' AND st."statusCode" IN ('PENDING','IN_PROGRESS','ON_HOLD','COMPLETED','REJECTED'))
  OR (s."stageCode"='CAS_COE' AND st."statusCode" IN ('PENDING','IN_PROGRESS','ON_HOLD','COMPLETED','REJECTED'))
  OR (s."stageCode"='VISA' AND st."statusCode" IN ('PENDING','IN_PROGRESS','ON_HOLD','COMPLETED','REJECTED'))
  OR (s."stageCode"='ENROLLED' AND st."statusCode" IN ('COMPLETED','CANCELLED'))
)
AND NOT EXISTS (
  SELECT 1 FROM "sys_ApplicationStage2Status" x
  WHERE x."sysApplicationStageId" = s.id
  AND x."sysApplicationStatusId" = st.id
);

-- ======================================================
-- 4) DOCUMENT TYPES
-- ======================================================
INSERT INTO "sys_DocumentTypes"
("id","documentTypeCode","documentTypeName","documentScope","isMultipleAllowed","allowedMimeTypes","maxFileSizeBytes","isActive","createdAt","updatedAt")
VALUES
(gen_random_uuid(),'PASSPORT','Passport','LEAD',false,'application/pdf,image/jpeg,image/png',5242880,true,now(),now()),
(gen_random_uuid(),'TRANSCRIPT','Transcript','LEAD',true,'application/pdf,image/jpeg,image/png',5242880,true,now(),now()),
(gen_random_uuid(),'CERTIFICATE','Certificate','LEAD',true,'application/pdf,image/jpeg,image/png',5242880,true,now(),now()),
(gen_random_uuid(),'ENGLISH_TEST','English Test','LEAD',false,'application/pdf,image/jpeg,image/png',5242880,true,now(),now()),
(gen_random_uuid(),'CV','CV','APPLICATION',false,'application/pdf',2097152,true,now(),now()),
(gen_random_uuid(),'SOP','SOP','APPLICATION',false,'application/pdf',2097152,true,now(),now()),
(gen_random_uuid(),'REFERENCE_LETTER','Reference Letter','APPLICATION',true,'application/pdf,image/jpeg,image/png',5242880,true,now(),now()),

-- Post submission
(gen_random_uuid(),'CONDITIONAL_OFFER','Conditional Offer','APPLICATION',false,'application/pdf',5242880,true,now(),now()),
(gen_random_uuid(),'UNCONDITIONAL_OFFER','Unconditional Offer','APPLICATION',false,'application/pdf',5242880,true,now(),now()),
(gen_random_uuid(),'PAYMENT_RECEIPT','Payment Receipt','APPLICATION',false,'application/pdf,image/jpeg,image/png',5242880,true,now(),now()),
(gen_random_uuid(),'CAS_DOCUMENT','CAS Document','APPLICATION',false,'application/pdf',5242880,true,now(),now()),
(gen_random_uuid(),'VISA_DOCUMENT','Visa Document','APPLICATION',false,'application/pdf',5242880,true,now(),now()),
(gen_random_uuid(),'ENROLLMENT_CONFIRMATION','Enrollment Confirmation','APPLICATION',false,'application/pdf',5242880,true,now(),now()),

-- ALWAYS AVAILABLE
(gen_random_uuid(),'OTHERS','Other Documents','APPLICATION',true,'application/pdf,image/jpeg,image/png',10485760,true,now(),now())
ON CONFLICT ("documentTypeCode") DO NOTHING;

-- ======================================================
-- 5) STAGE REQUIRED DOCUMENTS
-- ======================================================
WITH c AS (
  SELECT id FROM "sys_Countries" WHERE "countryName"='South England'
),
s AS (
  SELECT id, "stageCode" FROM "sys_ApplicationStage"
),
d AS (
  SELECT id, "documentTypeCode" FROM "sys_DocumentTypes"
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
  WHEN s."stageCode"='CONDITIONAL' AND d."documentTypeCode"='CONDITIONAL_OFFER' THEN true
  WHEN s."stageCode"='UNCONDITIONAL' AND d."documentTypeCode"='UNCONDITIONAL_OFFER' THEN true
  WHEN s."stageCode"='PAYMENT' AND d."documentTypeCode"='PAYMENT_RECEIPT' THEN true
  WHEN s."stageCode"='CAS_COE' AND d."documentTypeCode"='CAS_DOCUMENT' THEN true
  WHEN s."stageCode"='VISA' AND d."documentTypeCode"='VISA_DOCUMENT' THEN true
  WHEN s."stageCode"='ENROLLED' AND d."documentTypeCode"='ENROLLMENT_CONFIRMATION' THEN true
  ELSE false
END,

-- MIN COUNT
CASE
  WHEN d."documentTypeCode"='OTHERS' THEN 0
  ELSE 1
END,

-- MAX COUNT
CASE
  WHEN d."documentTypeCode" IN ('TRANSCRIPT','CERTIFICATE','REFERENCE_LETTER') THEN 2
  WHEN d."documentTypeCode"='OTHERS' THEN 10
  ELSE 1
END,

-- DISPLAY ORDER
CASE d."documentTypeCode"
  WHEN 'PASSPORT' THEN 1
  WHEN 'TRANSCRIPT' THEN 2
  WHEN 'CERTIFICATE' THEN 3
  WHEN 'ENGLISH_TEST' THEN 4
  WHEN 'CV' THEN 5
  WHEN 'SOP' THEN 6
  WHEN 'REFERENCE_LETTER' THEN 7
  WHEN 'CONDITIONAL_OFFER' THEN 8
  WHEN 'UNCONDITIONAL_OFFER' THEN 9
  WHEN 'PAYMENT_RECEIPT' THEN 10
  WHEN 'CAS_DOCUMENT' THEN 11
  WHEN 'VISA_DOCUMENT' THEN 12
  WHEN 'ENROLLMENT_CONFIRMATION' THEN 13
  WHEN 'OTHERS' THEN 99
END,

true,
now(),
now()

FROM c, s, d

WHERE
(
  -- REVIEW STAGE DOCUMENTS
  (s."stageCode"='REVIEW' AND d."documentTypeCode" IN
    ('PASSPORT','TRANSCRIPT','CERTIFICATE','ENGLISH_TEST','CV','SOP','REFERENCE_LETTER','OTHERS'))

  -- POST SUBMISSION STAGES
  OR (s."stageCode"='SUBMITTED' AND d."documentTypeCode" IN ('OTHERS'))
  OR (s."stageCode"='CONDITIONAL' AND d."documentTypeCode" IN ('CONDITIONAL_OFFER','OTHERS'))
  OR (s."stageCode"='UNCONDITIONAL' AND d."documentTypeCode" IN ('UNCONDITIONAL_OFFER','OTHERS'))
  OR (s."stageCode"='INTERVIEW' AND d."documentTypeCode" IN ('OTHERS'))
  OR (s."stageCode"='PAYMENT' AND d."documentTypeCode" IN ('PAYMENT_RECEIPT','OTHERS'))
  OR (s."stageCode"='CAS_COE' AND d."documentTypeCode" IN ('CAS_DOCUMENT','OTHERS'))
  OR (s."stageCode"='VISA' AND d."documentTypeCode" IN ('VISA_DOCUMENT','OTHERS'))
  OR (s."stageCode"='ENROLLED' AND d."documentTypeCode" IN ('ENROLLMENT_CONFIRMATION','OTHERS'))
)

AND NOT EXISTS (
  SELECT 1 FROM "sys_StageRequiredDocuments" x
  WHERE x."sysCountryId" = c.id
  AND x."sysApplicationStageId" = s.id
  AND x."sysDocumentTypeId" = d.id
);