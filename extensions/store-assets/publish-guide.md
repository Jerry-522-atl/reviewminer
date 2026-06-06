# Chrome Web Store Publishing Guide

## Step 1: Register Developer Account

1. Open https://chrome.google.com/webstore/devregister
2. Pay $5 one-time registration fee (accepts credit card / Alipay)
3. Wait for email confirmation

## Step 2: Publish ImageGrab

1. Go to https://chrome.google.com/webstore/devconsole
2. Click "New Item"
3. Upload `image-grabber.zip`
4. Fill in store listing (use text from `image-grabber-listing.md`)
5. Upload screenshots (1280x800 or 640x400 PNG):
   - Screenshot 1: Popup with images loaded on a product page
   - Screenshot 2: Filtered view with format selector
   - Screenshot 3: Selected images ready for download
6. Category: Productivity
7. Price: Free
8. Submit for review

## Step 3: Publish ReviewExporter

1. Click "New Item"
2. Upload `review-exporter.zip`
3. Fill in store listing (use text from `review-exporter-listing.md`)
4. Upload screenshots:
   - Screenshot 1: Popup showing detected reviews on Amazon
   - Screenshot 2: CSV export in action
   - Screenshot 3: AI analysis button linking to ReviewMiner
5. Category: Productivity
6. Price: Free
7. Submit for review

## Review Timeline

- Usually 1-3 business days
- Make sure no minified/obfuscated code (our code is clean)
- Permissions must match what's actually used

## After Approval

- Both extensions appear in Chrome Web Store search
- Users can install with one click
- ImageGrab free tier limits downloads -> some users upgrade to PRO
- ReviewExporter funnels users to ReviewMiner for AI analysis
