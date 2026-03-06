# Document Upload Feature

## Overall Architecture
- Never let the backend receive file binaries.
- Instead use Direct-to-Storage Upload with `presigned URLs`.

**Upload Flow**
```
Client
  │
  │ 1 Request Upload URL
  ▼
API (NestJS)
  │
  │ 2 Create document + version record
  │
  ▼
Backblaze B2 (presigned URL)
  │
  │ 3 Upload file directly
  ▼
Client
  │
  │ 4 Confirm upload
  ▼
API verifies and marks version uploaded
```

**Download flow**
```
Client
  │
  │ Request download
  ▼
API
  │
  │ Permission check
  │ Generate presigned URL
  ▼
Backblaze B2
```

**Benefits:**
- no large file traffic through API
- scalable
- cheaper bandwidth
- secure


## Storage Abstraction Layer

**APP.Shared/interfaces**
```ts
export interface IStorageService {
  generateUploadUrl(input: GenerateUploadUrlInput): Promise<UploadUrlResult>;
  generateDownloadUrl(key: string): Promise<string>;
  deleteObject(key: string): Promise<void>;
}

export interface GenerateUploadUrlInput {
  key: string;
  mimeType: string;
}

export interface UploadUrlResult {
  uploadUrl: string;
  headers?: Record<string,string>;
}

export class CreateUploadUrlDto {

 documentTypeId: string;

 mimeType: string;

 fileName: string;

 fileSizeBytes: number;
}
```

**App.Infrastructure/storage**
```
storage/
├── backblaze/
|   └── BackblazeStorageService.ts
└── StorageModule.ts
```

**Storage Key Strategy**
- `applications/{applicationId}/documents/{documentType}/{documentId}/v{version}.{ext}`

example : 
```
applications/
├── 123/
|    └──documents/
|        └──passport/
|            └──456/
|                └──v1.pdf
```

## Upload Workflow
**Step 1 — Client asks for upload URL**
```
POST /applications/:id/documents/upload-url

Body:
{
  "documentTypeId": "uuid",
  "mimeType": "application/pdf",
  "fileName": "passport.pdf",
  "fileSize": 523423
}
```

**Step 2 — Backend**
1. Validate document requirement
2. Check stage permission
3. Create document record if needed
4. Create document version record
5. Generate storage key
6. Generate upload URL

Example:
```ts
async createUploadUrl(dto: CreateUploadUrlDto) {

  const document = await this.ensureDocument(dto);

  const version = await this.createVersion(document);

  const key = this.storageKeyBuilder.build(
     document.applicationId,
     document.documentTypeId,
     document.id,
     version.versionNumber
  );

  const upload = await this.storage.generateUploadUrl({
      key,
      mimeType: dto.mimeType
  });

  version.storageKey = key;
  version.uploadStatus = "pending";

  await this.repo.save(version);

  return {
     uploadUrl: upload.uploadUrl,
     headers: upload.headers,
     versionId: version.id
  };
}
```

**Step 3 — Client uploads file**
After upload completes client calls:
```
POST /applications/:id/documents/:documentId/confirm-upload

Body:
{
  "versionId": "uuid"
}
```
Server verifies:
1. Object exists in storage
2. size matches
3. hash matches (optional)

Then update : 
```
uploadStatus = COMPLETED
```

## Download Workflow
**Step 1 — Client requests download**
```
GET /applications/:id/documents/:documentId/download
```

**Step 2 — Backend**
1. Permission check
2. Fetch currentVersion
3. Generate download url

Example:
```ts
async generateDownloadUrl(documentId: string) {

   const doc = await this.repo.findOne(...);

   if (!doc.currentVersionId)
      throw new Error("No uploaded version");

   const url = await this.storage.generateDownloadUrl(
        doc.currentVersion.storageKey
   );

   return { url };
}
```

# Primary Document Implementation