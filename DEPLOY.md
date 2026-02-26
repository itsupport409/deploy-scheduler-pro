# Deploy Shop Scheduler Pro to Google Cloud Run

Yes — you can push this app to GitHub and have **Google Cloud Run** build and deploy it automatically on every push. Here’s how.

---

## 1. Push the app to GitHub

1. **Create a new repo** on [GitHub](https://github.com/new) (e.g. `shop-scheduler-pro`). Don’t add a README if the project already has files.

2. **From your project folder**, run:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

   Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your GitHub username and repo name.

---

## 2. One-time Google Cloud setup

1. **Create or select a project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/).
   - Create a new project or select an existing one.
   - Ensure [billing](https://console.cloud.google.com/billing) is enabled (Cloud Run needs it).

2. **Enable APIs**
   - Open [APIs & Services → Enable APIs](https://console.cloud.google.com/apis/library).
   - Enable:
     - **Cloud Run API**
     - **Cloud Build API**
     - **Artifact Registry API** (used by Cloud Build to store images)

3. **Install gcloud (optional, for CLI)**
   - [Install the Google Cloud CLI](https://cloud.google.com/sdk/docs/install) if you want to deploy or manage things from the command line.

---

## 3. Deploy from GitHub (continuous deployment)

1. **Open Cloud Run**
   - In the Cloud Console, go to [Cloud Run](https://console.cloud.google.com/run).

2. **Create a new service**
   - Click **Create Service**.

3. **Use “Deploy from repository”**
   - Choose **“Continuously deploy from a repository”** (or “Second generation” and then repository-based deploy).
   - Click **Set up with Cloud Build** (or **Connect repository**).

4. **Connect GitHub**
   - Select **GitHub** as the source.
   - Authenticate with GitHub and grant access if asked.
   - Pick the **repository** and **branch** (e.g. `main`).

5. **Build and deploy**
   - **Build type:** **Dockerfile**.
   - Cloud Build will use the **Dockerfile** in the repo root.
   - **Service name:** e.g. `shop-scheduler-pro`.
   - **Region:** choose one close to you.
   - Click **Create** (or **Deploy**).

6. **First build**
   - The first deployment will run automatically. You can watch progress in [Cloud Build → History](https://console.cloud.google.com/cloud-build/builds).

7. **Get the URL**
   - When the build finishes, Cloud Run will show the service URL (e.g. `https://shop-scheduler-pro-xxxxx-uc.a.run.app`). Open it to use the app.

After this, **every push to the connected branch** will trigger a new build and deploy.

---

## 4. Optional: deploy from your machine with gcloud

If you prefer to deploy from your PC (without GitHub):

```bash
# Set project
gcloud config set project YOUR_PROJECT_ID

# Build and deploy in one step (uses the Dockerfile)
gcloud run deploy shop-scheduler-pro --source . --region REGION --allow-unauthenticated
```

Replace `YOUR_PROJECT_ID` and `REGION` (e.g. `us-central1`).

---

## 5. Environment variables (e.g. API keys)

If your app needs env vars (e.g. `API_KEY`):

1. In Cloud Console go to **Cloud Run** → your service.
2. Click **Edit & deploy new revision**.
3. Open the **Variables & secrets** tab.
4. Add variables (e.g. `API_KEY`).
5. Deploy the new revision.

The build already injects `process.env.API_KEY` at build time; for runtime secrets use the Variables & secrets tab so they aren’t baked into the image.

---

## Summary

| Step | Action |
|------|--------|
| 1 | Push code to a GitHub repo |
| 2 | Create/select a GCP project and enable billing + Cloud Run, Cloud Build, Artifact Registry |
| 3 | In Cloud Run, create a service with “Continuously deploy from a repository” and connect the GitHub repo |
| 4 | Use the Dockerfile in the repo; Cloud Build builds and deploys on each push |

Once this is set up, pushing to the connected branch is enough to get a new deployment on Cloud Run.
