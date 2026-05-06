/**
 * Storage (Backblaze B2) configuration loader.
 * Loaded via ConfigModule.forRoot({ load: [storageConfig] }).
 */
export default () => ({
  storage: {
    provider: 'backblaze',
    keyId: process.env.B2_KEY_ID,
    applicationKey: process.env.B2_APPLICATION_KEY,
    bucketName: process.env.B2_BUCKET_NAME,
    endpoint: process.env.B2_ENDPOINT,
    region: process.env.B2_REGION ?? 'us-west-002',
  },
});
