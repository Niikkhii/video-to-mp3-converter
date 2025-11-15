# Vercel Deployment Checks Setup

## Recommended Checks to Add in Vercel

### 1. Health Check Endpoint ✅

**Purpose**: Verify the deployment is healthy and environment variables are set correctly.

**How to Add**:
1. Go to Vercel Dashboard → Your Project → Settings → **Deployment Checks**
2. Click **"Add Check"**
3. Configure:
   - **Name**: `Health Check`
   - **URL**: `https://your-project.vercel.app/api/health`
   - **Method**: `GET`
   - **Expected Status Code**: `200`
   - **Expected Response Body** (optional): `"status":"healthy"`
   - **Run After**: `Deployment`
   - **Timeout**: `10 seconds`

**What it checks**:
- ✅ API route is accessible
- ✅ All required environment variables are set
- ✅ Google OAuth client can be initialized
- ✅ Returns healthy status

---

### 2. API Route Availability Check ✅

**Purpose**: Verify the upload API endpoint exists and responds correctly.

**How to Add**:
1. Go to Vercel Dashboard → Settings → **Deployment Checks**
2. Click **"Add Check"**
3. Configure:
   - **Name**: `Upload API Check`
   - **URL**: `https://your-project.vercel.app/api/upload`
   - **Method**: `POST`
   - **Expected Status Code**: `400` or `405` (expected for empty/invalid request)
   - **Run After**: `Deployment`
   - **Timeout**: `10 seconds`

**What it checks**:
- ✅ `/api/upload` endpoint exists
- ✅ Endpoint responds (even if with error for invalid request)

---

### 3. Frontend Load Check ✅

**Purpose**: Verify the main page loads successfully.

**How to Add**:
1. Go to Vercel Dashboard → Settings → **Deployment Checks**
2. Click **"Add Check"**
3. Configure:
   - **Name**: `Frontend Load Check`
   - **URL**: `https://your-project.vercel.app/`
   - **Method**: `GET`
   - **Expected Status Code**: `200`
   - **Expected Response Body** (optional): `"Convert"` (to verify UI text is present)
   - **Run After**: `Deployment`
   - **Timeout**: `30 seconds`

**What it checks**:
- ✅ Main page loads
- ✅ Frontend is accessible

---

## Step-by-Step Setup Instructions

### Step 1: Add Health Check Endpoint
The health check endpoint is already created at `pages/api/health.js`. It will:
- Check all required environment variables
- Verify OAuth client can be initialized
- Return healthy/unhealthy status

### Step 2: Configure Checks in Vercel

1. **Go to Vercel Dashboard**
   - Navigate to your project
   - Click **Settings** → **Deployment Checks**

2. **Add Health Check**
   ```
   Name: Health Check
   URL: /api/health
   Method: GET
   Expected Status: 200
   Run After: Deployment
   ```

3. **Add Frontend Check** (Optional)
   ```
   Name: Frontend Check
   URL: /
   Method: GET
   Expected Status: 200
   Run After: Deployment
   ```

4. **Save Settings**

### Step 3: Test the Checks

After adding checks:
1. Make a small change and redeploy
2. Go to **Deployments** tab
3. Watch the deployment - you should see check statuses
4. Green checkmark = pass, Red X = fail

---

## What Each Check Does

### Health Check (`/api/health`)
- ✅ Verifies environment variables are set
- ✅ Tests OAuth client initialization
- ✅ Returns JSON with status and details
- ✅ Fails if any required env var is missing

### Upload API Check
- ✅ Verifies API route exists
- ✅ Tests endpoint accessibility
- ✅ Should return 400/405 for invalid requests (expected)

### Frontend Check
- ✅ Verifies main page loads
- ✅ Tests basic frontend functionality

---

## Expected Results

### ✅ Healthy Deployment
```json
{
  "status": "healthy",
  "timestamp": "2025-11-15T...",
  "environment": {
    "hasClientId": true,
    "hasClientSecret": true,
    "hasRefreshToken": true,
    "hasFolderId": true,
    "folderId": "118DIvY1YnjJ7kYat8ZsFGND4yme-cxKF"
  },
  "checks": {
    "envVars": "pass",
    "oauthClient": "pass"
  }
}
```

### ❌ Unhealthy Deployment
```json
{
  "status": "unhealthy",
  "error": "Missing environment variables",
  "missing": ["GOOGLE_CLIENT_ID", "GOOGLE_REFRESH_TOKEN"]
}
```

---

## Benefits of Adding Checks

1. **Automatic Verification**: Vercel runs checks after each deployment
2. **Early Detection**: Catch issues before users do
3. **Deployment Status**: See check results in deployment history
4. **Rollback Trigger**: Can configure to rollback on check failure
5. **Monitoring**: Track deployment health over time

---

## Optional: Advanced Checks

If you want more comprehensive checks, you can also add:

### Environment Variable Validation Check
- Custom script that validates all env vars are set
- Can be added as a build-time check

### Integration Test Check
- Actually upload a test file
- Verify it appears in Drive
- More complex but comprehensive

---

## Quick Setup Summary

**Minimum Recommended**:
1. ✅ Health Check (`/api/health`) - **MOST IMPORTANT**
2. ✅ Frontend Check (`/`) - Optional but useful

**After Setup**:
- Checks run automatically after each deployment
- View results in Deployments tab
- Get notified if checks fail

---

**Note**: The health check endpoint is already created in your codebase. Just add it as a check in Vercel Dashboard!

