# Brynja Árnadóttir — bilingual legacy archive

Next.js (App Router) site. The engineering spec and build phases live in [`docs/SPEC.md`](docs/SPEC.md).

```bash
pnpm install
cp .env.example .env.local   # fill in real values
pnpm dev
```

Quality gate for every phase: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

## Deploying to Vercel

Import the Git repository in Vercel. It detects Next.js, so you don't need a `vercel.json` and the
default build settings work. The build runs `pnpm data:validate` before `next build`, so invalid
data JSON fails the deployment. Under **Settings → Build and Deployment**, set the Node.js version
to **24.x** to match local development.

Set these environment variables under **Settings → Environment Variables**, for Production, Preview
and Development. Example values are in [`.env.example`](.env.example).

| Name                           | Type   | Purpose                                                                                              |
| ------------------------------ | ------ | ---------------------------------------------------------------------------------------------------- |
| `RESEND_API_KEY`               | Secret | Sends reprint inquiries through Resend                                                               |
| `RESEND_FROM_EMAIL`            | Config | Sender, e.g. `Name <inquiries@…>`, on a domain verified in Resend                                    |
| `INQUIRY_TO_EMAIL`             | Config | The estate's inbox that receives inquiries                                                           |
| `NEXT_PUBLIC_SITE_URL`         | Config | Public origin used for canonical URLs, sitemap, robots and Open Graph tags                           |
| `ENABLE_EXPERIMENTAL_COREPACK` | Config | Set to `1`. Makes Vercel use the `packageManager` pnpm version instead of guessing from the lockfile |

- `NEXT_PUBLIC_SITE_URL` is baked in at build time. Set it before the first deploy, and redeploy
  after changing it (for example, when you add a custom domain).
- The Bunny Storage password is **not** an app variable. Never add it to Vercel.
- Under **Analytics**, click **Enable**. The app already renders `<Analytics />`, but until Web
  Analytics is enabled for the project, `/_vercel/insights/*` returns 404 and nothing is recorded.
- Missing Resend values don't break the build. They only make inquiry sends fail at runtime, so
  after deploying, work through [`docs/QA-CHECKLIST.md`](docs/QA-CHECKLIST.md), including the real-send check.

## Adding an artwork

Each step below has to happen before the next one.

1. **Upload the image to Bunny.** In the Bunny dashboard, open Storage Zone `brynja-storage` and upload
   the web master, preferably as `/v1/archive/works/ART-NNNN.jpg`. It is then served from
   `https://brynja.b-cdn.net/v1/archive/works/ART-NNNN.jpg`.
   - Use an sRGB JPEG without a watermark. Never upload a print-resolution scan: everything on the
     pull zone is public.
   - Files are immutable. To replace an image, upload it under a **new** filename (or `/v2/…`) and
     update the JSON. Never overwrite an existing file.
2. **Get the pixel size** of the master (after EXIF rotation):

   ```bash
   node -e "import('sharp').then(({default:s})=>s(process.argv[1]).metadata()).then(m=>console.log(m.autoOrient))" path/to/ART-NNNN.jpg
   ```

3. **Add an entry to [`src/data/artworks.json`](src/data/artworks.json).** Use the next unused `id`
   and never reuse or renumber one. The `slug` is a URL segment: lowercase kebab-case, unique.
   Every text field needs both `is` and `en`.

   ```json
   {
     "id": "ART-0004",
     "slug": "hraun-vid-sjo",
     "title": { "is": "Hraun við sjó", "en": "Lava by the Sea" },
     "image": {
       "src": "https://brynja.b-cdn.net/v1/archive/works/ART-0004.jpg",
       "width": 3000,
       "height": 2121,
       "alt": { "is": "Lýsing á myndinni…", "en": "Description of the image…" }
     },
     "dimensions": { "widthCm": 42, "heightCm": 29.7 },
     "year": 1978,
     "styleCategory": "black-and-white",
     "available-as-reprint": true,
     "medium": { "is": "Tússpenni á pappír", "en": "Ink pen on paper" }
   }
   ```

   - `image.width`/`height`: pixels, from step 2. `dimensions`: the physical original, in cm.
   - `year`: an integer, or `null` if undated. Add `"yearCirca": true` for "c. 1978".
   - `styleCategory`: `"black-and-white"` or `"colorful"`.
   - Optional: `description` (`is`/`en`); `sortOrder` (an integer, lower comes first within a year).
   - Leave out `blurDataURL`. The next step fills it in.

4. **Generate the blur placeholder:** `pnpm images:blur`. This fetches a tiny version from Bunny
   and writes `blurDataURL` into the JSON. It only touches images that don't have one yet.
5. **Validate:** `pnpm data:validate`. It catches schema errors and duplicate IDs or slugs. Run `pnpm build`
   for the full check.
6. **Commit and push.** Vercel redeploys, and the new work appears in the gallery, its own page
   and the sitemap.
