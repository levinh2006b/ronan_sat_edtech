# PDF Pipeline Fix — Handoff Report

## Current State (as of May 10, 2026)

### What works
- **233 tests** in Supabase (`tests` table), at `https://afmeruhjbgqeebczpxzf.supabase.co`
- **Raw vector PDFs** generated at `C:\Users\MHC\Desktop\flattened-pdfs\`
- **Rasterized PDFs** at `D:\image-only-pdfs\test-pdfs\{testId}\full\v{1-7}.pdf` (300 DPI, JPEG 4:4:4)
- **`test_pdf_assets` table**: every test has active rows with `drive_file_id`, `storage_provider=google_drive`, `is_active=true`
- **38 old tests** (uploaded before May 10): PDFs download normally on production

### What's broken
- **195 new tests** (uploaded May 10): cannot download PDFs. "No Google Drive PDF has been published for this test yet."

## Root Cause

I used **two different pipeline methods** that use DIFFERENT Google Drive OAuth credentials:

| Method | Credential Source | Used For |
|---|---|---|
| `bun run scripts/pdf/publishDrivePdfAssets.ts` | `.env.local` (plain text OAuth keys) | Most of the 195 tests |
| `npm run pdf:publish:drive -- --execute` | `.env.development` (dotenvx decrypted OAuth keys) | Only ~12 tests including "2023 March - A" (which downloads fine!) |

`.env.local` and `.env.development` contain **different Google Drive OAuth credentials**. Files uploaded with `.env.local` creds go to a Drive account that the production server cannot read. Files uploaded with `.env.development` creds (via `npm run`) are on the correct Drive account and download fine.

## What I Did Wrong (Mistakes to NOT Repeat)

1. **Used `bun run` directly instead of `npm run`**
   - `npm run pdf:flatten:supabase` uses `dotenvx run -f .env.local -f .env.development` which properly decrypts and loads all env vars
   - `bun run scripts/pdf/flattenSupabasePdfs.ts` skips dotenvx entirely — wrong credentials

2. **Created a custom script `flattenNewTests.ts`** — completely unnecessary. The existing `flattenSupabasePdfs.ts` already works correctly via `npm run`.

3. **Used `Select-Object -First 5` in PowerShell pipe** — this hung the pipeline mid-execution

4. **Ran the full 506-asset pipeline multiple times** instead of combining copy+raster+caching

5. **Did not add `--skip-published` initially** — caused the pipeline to re-process all 506 assets from scratch multiple times

## The Correct Fix (one command)

```powershell
cd C:\Users\MHC\Desktop\bluebook-main

# 1. Deactivate all existing assets for May 10+ tests in Supabase
#    (so the pipeline re-creates them with correct credentials)
#    Run this Python snippet or use Supabase SQL Editor:

python -c "
import requests
KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmbWVydWhqYmdxZWViY3pweHpmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg2ODY3OSwiZXhwIjoyMDkyNDQ0Njc5fQ.-A-Y0dYfQpIY9ze6kZmfqCLyNUJSdZdQF0R5G35NtR8'
H={'apikey':KEY,'Authorization':'Bearer '+KEY,'Content-Type':'application/json','Prefer':'return=minimal'}
R='https://afmeruhjbgqeebczpxzf.supabase.co/rest/v1'
# Get May 10+ test IDs
new=requests.get(R+'/tests?select=id&created_at=gte.2026-05-10',headers=H).json()
new_ids=set(t['id'] for t in new)
# Deactivate ALL active Google Drive assets for these tests
assets=requests.get(R+'/test_pdf_assets?select=id,test_id&storage_provider=eq.google_drive&is_active=eq.true',headers=H).json()
to_deactivate=[a['id'] for a in assets if a['test_id'] in new_ids]
for i in range(0,len(to_deactivate),50):
    batch=','.join(to_deactivate[i:i+50])
    requests.patch(R+'/test_pdf_assets?id=in.('+batch+')',headers=H,json={'is_active':False})
print(f'Deactivated {len(to_deactivate)} assets')
"

# 2. Copy existing raster files to their target versions
#    (avoids re-rasterizing — saves hours)
python -c "
import os, shutil, requests

KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmbWVydWhqYmdxZWViY3pweHpmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg2ODY3OSwiZXhwIjoyMDkyNDQ0Njc5fQ.-A-Y0dYfQpIY9ze6kZmfqCLyNUJSdZdQF0R5G35NtR8'
H={'apikey':KEY,'Authorization':'Bearer '+KEY}
R='https://afmeruhjbgqeebczpxzf.supabase.co/rest/v1'

# Get next version per test
new_tids=requests.get(R+'/tests?select=id&created_at=gte.2026-05-10',headers=H).json()
next_ver={}
for i in range(0,len(new_tids),50):
    b=','.join(t['id'] for t in new_tids[i:i+50])
    r=requests.get(R+f'/test_pdf_assets?select=test_id,version&test_id=in.({b})',headers=H)
    for a in r.json(): next_ver[a['test_id']]=max(next_ver.get(a['test_id'],0),a['version'])
for t in new_tids:
    if t['id'] not in next_ver: next_ver[t['id']]=0
    next_ver[t['id']] += 1

# Copy highest existing -> target for each test
src=r'D:\image-only-pdfs\test-pdfs'
for folder in os.listdir(src):
    folder_path=os.path.join(src,folder)
    if not os.path.isdir(folder_path): continue
    target_ver=next_ver.get(folder)
    if target_ver is None: continue
    for mode_dir in ['full','sectional\\verbal','sectional\\math']:
        mode_path=os.path.join(folder_path,mode_dir)
        if not os.path.exists(mode_path): continue
        target_file=os.path.join(mode_path,f'v{target_ver}.pdf')
        if os.path.exists(target_file): continue
        existing=[f for f in os.listdir(mode_path) if f.startswith('v') and f.endswith('.pdf')]
        if not existing: continue
        highest=sorted(existing,key=lambda x:int(x[1:-4]))[-1]
        shutil.copy2(os.path.join(mode_path,highest),target_file)
print('Copy done')
"

# 3. Run the ONLY correct pipeline command:
$env:PDF_DPI="300"; $env:PDF_GRAYSCALE="0"; $env:PDF_JPEG_QUALITY="80"
npm run pdf:publish:drive -- --execute
```

## Key Credentials (already in .env files)

| Variable | Source | Encrypted? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.development` | Yes (dotenvx) |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.development` | Yes (dotenvx) |
| `GOOGLE_DRIVE_OAUTH_CLIENT_ID` | `.env.local` | No |
| `GOOGLE_DRIVE_OAUTH_CLIENT_SECRET` | `.env.local` | No |
| `GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN` | `.env.local` | No |
| `GOOGLE_DRIVE_PDF_ROOT_FOLDER_ID` | `.env.local` | No |
| `GOOGLE_DRIVE_CLIENT_EMAIL` | `.env.local` | No |
| `GOOGLE_DRIVE_PRIVATE_KEY` | `.env.local` | No |

## Pipeline Scripts (in bluebook-main/scripts/pdf/)

| Script | Run With | Purpose |
|---|---|---|
| `flattenSupabasePdfs.ts` | `npm run pdf:flatten:supabase` | Generate raw PDF from Supabase |
| `flattenPdfFolder.ts` | `npm run pdf:flatten:folder` | OLD rasterizer (don't use) |
| `publishDrivePdfAssets.ts` | `npm run pdf:publish:drive` | Rasterize + upload Drive + publish Supabase |
| `publishExistingRasterPdfAssets.ts` | `npm run pdf:publish:existing` | Upload already-rasterized files |
| `flattenNewTests.ts` | NEVER USE | Custom script I wrongly created — DELETE THIS FILE |

## Supabase Reference

- URL: `https://afmeruhjbgqeebczpxzf.supabase.co`
- 38 old tests: `created_at < 2026-05-10`
- 195 new tests: `created_at >= 2026-05-10`
- `test_pdf_assets` table filters for download: `is_active=true, storage_provider=google_drive, drive_file_id IS NOT NULL, mode='full', section_name IS NULL`
