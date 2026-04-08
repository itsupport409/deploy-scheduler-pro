# Cloud Run Deployment Guide

## Environment Variables Required

When deploying to Google Cloud Run, set the following environment variables:

### Required

- **SESSION_SECRET**: A strong, random string for signing session cookies. Generate with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
  **Important**: Use a different value for production. This prevents session hijacking.

### Optional

- **GEMINI_API_KEY**: API key for Google Gemini (for notification drafting)
- **API_KEY**: Alternative variable for Gemini API key
- **DATA_DIR**: Path for SQLite database (default: `/tmp/data`)
- **PORT**: Server port (default: 3003)

## Deployment Steps

1. **Generate a Session Secret**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Deploy to Cloud Run**:
   ```bash
   gcloud run deploy shop-scheduler-pro \
     --source . \
     --allow-unauthenticated \
     --set-env-vars SESSION_SECRET=<your-generated-secret>
   ```

   Or with Gemini API:
   ```bash
   gcloud run deploy shop-scheduler-pro \
     --source . \
     --allow-unauthenticated \
     --set-env-vars SESSION_SECRET=<your-generated-secret>,GEMINI_API_KEY=<your-api-key>
   ```

## Security Notes

- **Session Cookies**: Signed with `SESSION_SECRET` - change this for production
- **Database**: Stored in `/tmp/data` (Cloud Run ephemeral filesystem)
  - **⚠️ Data will be lost if the service restarts**
  - Consider using Cloud SQL or Firestore for persistent storage
- **HTTPS**: Automatically enforced on Cloud Run
- **Authentication**: Uses server-side sessions with httpOnly cookies

## Database Persistence

Cloud Run's `/tmp` directory is ephemeral. For production, consider:

1. **Cloud Firestore** (recommended): Easy migration from SQLite
2. **Cloud SQL**: PostgreSQL/MySQL option
3. **Google Cloud Storage**: For backups

Current setup stores data in memory until migration is implemented.

## Health Checks

The Dockerfile includes a health check that will be used by Cloud Run to monitor service availability.

## Automatic Deployment

If you've configured Cloud Build, pushes to your repository will automatically trigger deployments.
