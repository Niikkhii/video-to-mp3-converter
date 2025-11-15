#!/bin/bash

# Deployment Test Script
# Usage: ./test-deployment.sh <VERCEL_URL>

VERCEL_URL=$1

if [ -z "$VERCEL_URL" ]; then
  echo "❌ Error: Please provide your Vercel deployment URL"
  echo "Usage: ./test-deployment.sh https://your-project.vercel.app"
  exit 1
fi

echo "🧪 Testing Deployment: $VERCEL_URL"
echo ""

# Test 1: Frontend Load
echo "1️⃣ Testing Frontend Load..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$VERCEL_URL")
if [ "$HTTP_CODE" == "200" ]; then
  echo "   ✅ Frontend loads successfully (HTTP $HTTP_CODE)"
else
  echo "   ❌ Frontend failed to load (HTTP $HTTP_CODE)"
fi
echo ""

# Test 2: API Route Exists
echo "2️⃣ Testing API Route..."
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$VERCEL_URL/api/upload")
if [ "$API_CODE" == "405" ] || [ "$API_CODE" == "400" ]; then
  echo "   ✅ API route exists (HTTP $API_CODE - expected for GET request)"
elif [ "$API_CODE" == "404" ]; then
  echo "   ❌ API route not found (HTTP 404)"
else
  echo "   ⚠️  API route returned HTTP $API_CODE"
fi
echo ""

# Test 3: Check for common errors
echo "3️⃣ Checking for common issues..."
RESPONSE=$(curl -s "$VERCEL_URL")

if echo "$RESPONSE" | grep -q "FFmpeg"; then
  echo "   ✅ FFmpeg integration detected"
else
  echo "   ⚠️  FFmpeg integration not found in page"
fi

if echo "$RESPONSE" | grep -q "Convert"; then
  echo "   ✅ Convert button found"
else
  echo "   ⚠️  Convert button not found"
fi
echo ""

# Test 4: Environment Variables (indirect check)
echo "4️⃣ Testing Environment Variables (via API)..."
# Create a small test file
echo "test" > /tmp/test.txt

UPLOAD_RESPONSE=$(curl -s -X POST "$VERCEL_URL/api/upload" \
  -F "file=@/tmp/test.txt" \
  -F "filename=test.txt" 2>&1)

if echo "$UPLOAD_RESPONSE" | grep -q "Missing Google OAuth"; then
  echo "   ❌ Environment variables not set correctly"
  echo "   Response: $UPLOAD_RESPONSE"
elif echo "$UPLOAD_RESPONSE" | grep -q "error"; then
  echo "   ⚠️  API returned an error (may be expected for test file)"
  echo "   Response: $UPLOAD_RESPONSE"
else
  echo "   ✅ API responded (environment variables may be set)"
fi

rm -f /tmp/test.txt
echo ""

echo "📋 Manual Tests Required:"
echo "   1. Open $VERCEL_URL in browser"
echo "   2. Upload a small video file"
echo "   3. Enter a filename"
echo "   4. Click 'Convert & Upload to Drive'"
echo "   5. Verify success message and check Google Drive folder"
echo ""
echo "✅ Basic checks complete!"

