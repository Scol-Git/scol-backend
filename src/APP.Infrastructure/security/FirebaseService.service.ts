import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import type { IFirebaseService, FirebaseDecodedToken } from '@shared/interfaces/security/IFirebaseService.interface';
import type { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

/**
 * Firebase Service
 *
 * Provides Firebase Admin SDK operations for token verification.
 *
 * @class FirebaseService
 * @implements {IFirebaseService}
 */
@Injectable()
export class FirebaseService implements IFirebaseService {
  private readonly app: admin.app.App;

  constructor(
    private readonly _config: ConfigService,
    @Inject(ILoggerToken) private readonly _logger: ILogger,
  ) {
    // Initialize Firebase Admin SDK
    const serviceAccountPath = this._config.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
    let firebaseProjectId = this._config.get<string>('FIREBASE_PROJECT_ID');

    try {
      if (serviceAccountPath) {
        // Resolve path relative to project root
        const resolvedPath = path.isAbsolute(serviceAccountPath)
          ? serviceAccountPath
          : path.resolve(process.cwd(), serviceAccountPath);

        // Check if file exists
        if (!fs.existsSync(resolvedPath)) {
          throw new Error(
            `Firebase service account file not found at: ${resolvedPath}`,
          );
        }

        // Initialize with service account file
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const serviceAccount = require(resolvedPath);

        // Extract project_id from service account if not provided in env
        if (!firebaseProjectId && serviceAccount.project_id) {
          firebaseProjectId = serviceAccount.project_id;
          this._logger.LogInfo('Using project_id from service account file', {
            projectId: firebaseProjectId,
          });
        }

        if (!firebaseProjectId) {
          throw new Error(
            'FIREBASE_PROJECT_ID is required. Either set it in environment or ensure service account file contains project_id',
          );
        }

        this.app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: firebaseProjectId,
        });
        this._logger.LogInfo('Firebase initialized with service account file', {
          path: resolvedPath,
          projectId: firebaseProjectId,
        });
      } else {
        // Initialize with environment variables (for cloud deployments)
        // Note: applicationDefault() requires GOOGLE_APPLICATION_CREDENTIALS env var
        if (!firebaseProjectId) {
          throw new Error(
            'FIREBASE_PROJECT_ID is required when not using service account file',
          );
        }
        this.app = admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: firebaseProjectId,
        });
        this._logger.LogInfo('Firebase initialized with application default credentials', {
          projectId: firebaseProjectId,
        });
      }

      this._logger.LogInfo('Firebase Admin SDK initialized successfully');
    } catch (error) {
      this._logger.LogError('Failed to initialize Firebase Admin SDK', error);
      throw new Error(
        `Firebase initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async verifyIdToken(idToken: string): Promise<FirebaseDecodedToken> {
    // Development mode: Skip verification (ONLY for local testing!)
    const skipVerification = this._config.get<boolean>('FIREBASE_SKIP_VERIFICATION', false);
    const nodeEnv = this._config.get<string>('NODE_ENV', 'development');

    if (skipVerification && nodeEnv === 'development') {
      this._logger.LogWarning('⚠️  Firebase verification SKIPPED (development mode only!)', {
        idToken: idToken.substring(0, 20) + '...',
      });

      // Decode token without verification (for testing)
      try {
        // Try to decode as JWT to extract claims
        const parts = idToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(
            Buffer.from(parts[1], 'base64').toString('utf-8'),
          );

          // Create mock Firebase token from your JWT
          return {
            uid: payload.sub || `mock-uid-${Date.now()}`,
            email: payload.email || 'test@example.com',
            name: payload.name || 'Test User',
            picture: payload.picture,
            phone_number: payload.phone_number,
            email_verified: payload.email_verified || true,
            phone_verified: !!payload.phone_number,
          };
        }
      } catch (decodeError) {
        // If decode fails, return mock data
        this._logger.LogWarning('Could not decode token, using mock data', {});
      }

      // Return mock Firebase token
      return {
        uid: `mock-uid-${Date.now()}`,
        email: 'test@example.com',
        name: 'Test User (Mock)',
        picture: undefined,
        phone_number: undefined,
        email_verified: true,
        phone_verified: false,
      };
    }

    // Production mode: Real Firebase verification
    try {
      const decodedToken = await admin.auth(this.app).verifyIdToken(idToken);

      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
        picture: decodedToken.picture,
        phone_number: decodedToken.phone_number,
        email_verified: decodedToken.email_verified || false,
        phone_verified: !!decodedToken.phone_number,
      };
    } catch (error) {
      this._logger.LogError('Firebase ID token verification failed', error);
      
      // Provide helpful error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('kid')) {
        throw new Error(
          `Invalid Firebase ID token: The token provided is not a valid Firebase ID token. ` +
          `Make sure you're using a token from Firebase Auth, not your application's JWT. ` +
          `See HOW_TO_GET_FIREBASE_TOKEN.md for instructions. Original error: ${errorMessage}`,
        );
      }
      
      throw new Error(
        `Invalid Firebase ID token: ${errorMessage}`,
      );
    }
  }
}

