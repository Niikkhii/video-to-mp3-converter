# Deployment Verification Checklist

## Pre-Deployment Checks ✅

- [x] Dependencies installed (`@ffmpeg/ffmpeg`, `googleapis`, `formidable`)
- [x] API route implemented (`pages/api/upload.js`)
- [x] OAuth2 refresh token handler in place
- [x] Environment variables configured in Vercel
- [x] Code pushed to GitHub
- [x] Build succeeds locally (`npm run build`)

---

## Post-Deployment Checks

### 1. Vercel Build Status ✅
- [ ] Go to Vercel Dashboard → Your Project → Deployments
- [ ] Verify latest deployment shows **"Ready"** status (green checkmark)
- [ ] Check build logs for any errors
- [ ] Note your deployment URL: `https://your-project.vercel.app`

**Expected**: Build should complete successfully with no errors.

---

### 2. Environment Variables Verification ✅
- [ ] Go to Vercel Dashboard → Settings → Environment Variables
- [ ] Verify all 4 variables are present:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REFRESH_TOKEN`
  - `DRIVE_FOLDER_ID`
- [ ] Ensure they're set for **Production**, **Preview**, and **Development** environments

**Expected**: All 4 variables should be visible (values are hidden for security).

---

### 3. Frontend Load Test ✅
- [ ] Open your Vercel deployment URL in a browser
- [ ] Verify the page loads without errors
- [ ] Check browser console (F12) for any JavaScript errors
- [ ] Verify UI elements are visible:
  - File input field
  - Filename input field
  - "Convert & Upload to Drive" button

**Expected**: Page loads cleanly, no console errors.

---

### 4. FFmpeg Loading Test ✅
- [ ] Select a small video file (10-30 seconds, < 50MB)
- [ ] Enter a test filename (e.g., "test_audio")
- [ ] Click "Convert & Upload to Drive"
- [ ] Watch the status messages:
  - Should show "Loading FFmpeg (this runs once, may take 30-60 seconds)..."
  - Progress should increase from 0% to 100%
  - Should eventually show "FFmpeg loaded successfully"

**Expected**: FFmpeg loads successfully (first time takes 30-60 seconds).

**If FFmpeg fails to load:**
- Check browser console for errors
- Verify internet connection (FFmpeg downloads WASM files)
- Try a different browser (Chrome/Firefox recommended)

---

### 5. Video Conversion Test ✅
- [ ] After FFmpeg loads, status should show "Reading file..."
- [ ] Then "Converting to MP3..."
- [ ] Progress bar should show conversion progress
- [ ] Should eventually show "Extraction done — preparing upload"

**Expected**: Video converts to MP3 successfully.

**If conversion fails:**
- Check browser console for errors
- Verify video file format is supported
- Try a smaller video file

---

### 6. Google Drive Upload Test ✅
- [ ] After conversion, status should show "Uploading to Google Drive..."
- [ ] Wait for upload to complete
- [ ] Check for success message: `✅ Uploaded successfully! File ID: [id]. Link: [link]`
- [ ] Verify the response includes:
  - File ID (e.g., `1a2b3c4d5e6f7g8h9i0j`)
  - Link (e.g., `https://drive.google.com/file/d/.../view`)

**Expected**: Upload succeeds and returns file ID and link.

**If upload fails:**
- Check Vercel function logs (Dashboard → Functions → `/api/upload`)
- Verify environment variables are set correctly
- Check for OAuth errors in logs

---

### 7. Google Drive Verification ✅
- [ ] Open Google Drive folder: `118DIvY1YnjJ7kYat8ZsFGND4yme-cxKF`
- [ ] Verify the MP3 file is present
- [ ] Check filename matches what you entered (with `.mp3` extension)
- [ ] Click the file to play it
- [ ] Verify audio plays correctly

**Expected**: MP3 file is in the folder, playable, with correct filename.

---

### 8. API Response Verification ✅
- [ ] Open browser DevTools → Network tab
- [ ] Perform a conversion and upload
- [ ] Find the `/api/upload` request
- [ ] Check the response:
  ```json
  {
    "id": "1a2b3c4d5e6f7g8h9i0j",
    "name": "your_filename.mp3",
    "link": "https://drive.google.com/file/d/.../view"
  }
  ```
- [ ] Verify status code is `200`

**Expected**: API returns 200 with file details.

---

### 9. Error Handling Test ✅
- [ ] Try uploading without selecting a file → Should show error
- [ ] Try uploading without entering filename → Should show error
- [ ] Check error messages are user-friendly

**Expected**: Proper error messages for invalid inputs.

---

### 10. Vercel Function Logs Check ✅
- [ ] Go to Vercel Dashboard → Your Project → Functions
- [ ] Click on `/api/upload`
- [ ] Check recent invocations
- [ ] Verify no errors in logs
- [ ] Check execution time (should be < 10 seconds for small files)

**Expected**: Function executes successfully with no errors.

---

## Common Issues & Solutions

### Issue: "FFmpeg not loading"
**Solution**: 
- Clear browser cache
- Try different browser
- Check internet connection
- Wait longer (first load takes 30-60 seconds)

### Issue: "Upload failed: Missing Google OAuth env variables"
**Solution**:
- Verify all 4 environment variables are set in Vercel
- Ensure they're set for the correct environment (Production/Preview)
- Redeploy after adding variables

### Issue: "Upload failed: Invalid refresh token"
**Solution**:
- Verify refresh token is correct
- Check if token has expired (regenerate if needed)
- Ensure OAuth app has Drive API enabled

### Issue: "File not found in Drive folder"
**Solution**:
- Verify `DRIVE_FOLDER_ID` is correct
- Check folder permissions (should be accessible)
- Verify OAuth app has access to the folder

---

## Test Report Template

After completing all checks, fill this out:

```
Deployment URL: https://________________.vercel.app
Deployment Date: ________________

✅ Build Status: [PASS/FAIL]
✅ Environment Variables: [PASS/FAIL]
✅ Frontend Load: [PASS/FAIL]
✅ FFmpeg Loading: [PASS/FAIL]
✅ Video Conversion: [PASS/FAIL]
✅ Drive Upload: [PASS/FAIL]
✅ Drive Verification: [PASS/FAIL]
✅ API Response: [PASS/FAIL]
✅ Error Handling: [PASS/FAIL]
✅ Function Logs: [PASS/FAIL]

Test File Used: ________________
Uploaded File ID: ________________
Drive Link: ________________

Issues Found: ________________
```

---

## Quick Test Command

You can also test the API directly using curl (after deployment):

```bash
# Replace YOUR_VERCEL_URL with your actual deployment URL
curl -X POST https://YOUR_VERCEL_URL/api/upload \
  -F "file=@test.mp3" \
  -F "filename=test_audio.mp3"
```

---

**Last Updated**: After deployment setup
**Status**: Ready for testing

