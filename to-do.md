# Document Upload System – Architecture Overview (Backblaze B2) 

**🎯 Goal**

Allow users to:

- Upload required documents (Offer Letter, Visa, CAS, etc.)
- View documents securely
- Download documents securely
- Maintain document status (Not Uploaded, In Progress, Verified, etc.)
- Keep storage cost very low

**We are using:**

- PostgreSQL → stores document metadata
- Backblaze B2 (S3-compatible) → stores actual file bytes
- Signed URLs → secure upload & download

**Core Design Principle**

We never store file bytes in our database.

Instead:

- Database stores metadata only
- Cloud storage stores actual files
- Backend generates temporary secure URLs
 
This is the same pattern used by Dropbox, Google Drive, etc.

## System Components
### 1️⃣ PostgreSQL (Metadata)
Stores:
- Document ID
- Owner
- Document type (Visa, CAS, etc.)
- File name
- Size
- Status (UPLOADING, UPLOADED, VERIFIED)
- Storage key (path in B2)
It does NOT store file content.

### 2️⃣ Backblaze B2 (Blob Storage)
Stores:
- Actual file bytes (PDF, image, etc.)
- Bucket is:
  - Private
  - Not publicly accessible
  - Accessible only via signed URLs

### 3️⃣ Backend (NestJS)
Responsible for:
- Creating document records
- Generating signed upload URLs
- Generating signed download URLs
- Validating permissions
- Updating document status


## Complete Flow (Step-by-Step)

### Upload Flow
**User clicks upload button:**

**Frontend sends:**

```
POST /documents/init-upload

{
  "fileName": "offer_letter.pdf",
  "mimeType": "application/pdf",
  "size": 1024,
  "documentType": "offer_letter",
  "context": "lead"
}
```

**Backend checks:**

- Is file size allowed?
- Is mime type allowed?
- Is user allowed to upload?
- Is document type valid?


**If valid:**

- Create DB record with status = UPLOADING
- Generate storage key
- Generate presigned PUT URL from B2

**Backend returns:**

```json
{
  "documentId": "...",
  "uploadUrl": "https://b2-presigned-url",
  "expiresAt": "..."
}
```

**Frontend uploads directly to B2:**

**Browser uploads file directly to Backblaze.**

**Important:**
File does NOT pass through your backend.

**Frontend calls complete upload:**

After successful upload:

```
POST /documents/{id}/complete-upload
```

**Backend:**

- Calls headObject() to confirm file exists
- Updates status = UPLOADED
- Saves size + metadata

Now document is officially stored.


### Download / View Flow
**User clicks download button:**

**Frontend sends:**

```
GET /documents/{id}/view-link
```

**Backend checks:**

- User owns the document
- Document status is valid
- Not deleted

Then generates presigned GET URL.

**Backend returns:**

```json
{
  "url": "https://b2-presigned-get-url",
  "expiresAt": "..."
}
```

**Browser opens file:**

- If PDF/image → open in new tab
- If other file → download
- File is streamed directly from B2.
- Backend is not involved.

### Document Status Lifecycle
```
NOT_UPLOADED (no DB record)
        ↓
UPLOADING (init-upload called)
        ↓
UPLOADED (complete-upload called)
        ↓
VERIFIED (optional admin action)
        ↓
REJECTED (optional admin action)
        ↓
DELETED (soft delete)
```

### Security Model
**1️⃣ Bucket is Private**
Nobody can access files without signed URL.

**2️⃣ Signed URLs Expire**
Upload/download links:
- Valid only 10–15 minutes
- After that → unusable

**3️⃣ Backend Permission Checks**

Only:

- Owner
- Admin
- Authorized roles

Can request view links.



# ERD

```
UniCourses
   ↓
UniCourseDocumentRequirements (Template)
   ↓ (copied at creation)
ApplicationDocumentRequirements (Frozen per application)
```

- ApplicationDocumentRequirement : What SHOULD exist? - It represents the checklist definition for this specific application.
- ApplicationDocument : What files has the student uploaded?

Q : Why to copy from UniCourseDocumentRequirements to ApplicationDocumentRequirements?
Today:
Course requires:
- Passport
- Transcript

Tomorrow:
University updates requirement:
- Passport
- Transcript
- Financial Proof

If you derive checklist dynamically from UniCourseDocumentRequirements:

- Application A created yesterday suddenly appears incomplete.
- That is wrong.
- Applications must be evaluated against the rules at creation time.