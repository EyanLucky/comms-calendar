# Kickoff Championship Calendar — Vercel setup

This is the shared, multi-user version of the comms calendar. The page is hosted on Vercel and all edits live in one shared database (Upstash Redis, provisioned from inside Vercel). When anyone edits, everyone else sees it within a few seconds.

```
index.html        the calendar (frontend)
api/data.js        serverless API: reads/writes the shared data
package.json       declares the database client
```

## What you need
- A Vercel account (free Hobby plan is fine)
- About 10 minutes

---

## Step 1 — Get the project onto Vercel

Pick whichever is easier for you.

### Option A: Vercel CLI (fastest)
1. Unzip this folder.
2. Install the CLI once: `npm i -g vercel`
3. From inside the folder, run: `vercel`
4. Answer the prompts (accept the defaults). It deploys a preview URL.
5. Run `vercel --prod` to publish the production URL.

### Option B: GitHub
1. Create a new GitHub repo and push these files to it.
2. Go to vercel.com, "Add New Project", import the repo, and click Deploy.

At this point the page loads, but the status pill will read "Local only" because there is no database yet.

---

## Step 2 — Add the shared database (Upstash Redis)

1. In your Vercel dashboard, open the project.
2. Go to the **Storage** tab, click **Create / Connect Database**.
3. Choose **Upstash** (Redis / KV) from the Marketplace and follow the prompts. Vercel provisions it and connects it to this project, injecting the credentials as environment variables automatically.
4. Go to **Deployments** and **Redeploy** the latest one so the new credentials are picked up (or run `vercel --prod` again).

Reload the page. The status pill should now read **"● Live · shared."** That's it. Edits are now shared for everyone on the URL.

---

## Step 3 (optional but recommended) — Protect saving with an edit key

By default, anyone with the URL can edit. To require a shared password before saving:

1. In Vercel, go to **Settings → Environment Variables**.
2. Add a variable named `EDIT_SECRET` with a value of your choosing (your team's shared edit key). Apply it to Production (and Preview if you use preview URLs).
3. Redeploy.

Now the first time someone tries to save, the page asks for the edit key. It is remembered in their browser afterward. Reading the calendar stays open to everyone; only saving is gated.

---

## How it behaves
- **Shared + near-realtime:** the page checks for updates every ~6 seconds. A small toast shows "Updated by [name]" when a teammate's change comes in.
- **Editor name:** set your name in the toolbar (in Edit mode) so teammates see who changed what.
- **Mid-edit safety:** if a teammate's update arrives while you're actively editing, it waits and applies once you finish, so it won't overwrite your form.
- **Conflict handling:** saves are last-write-wins on the whole document. With a small team editing occasionally this is fine. If two people save within the same few seconds, the later save wins. For heavy simultaneous editing, tell me and I'll add per-field locking.
- **Backup:** Export downloads a dated JSON of everything; Import loads one back. Reset returns to the original built-in copy. These still work and are a good periodic backup.
- **Offline / opened directly:** if you open index.html as a plain file (no server), it falls back to browser-only storage and the pill reads "Local only."

## Free tier note
Upstash's free tier covers a small internal tool like this comfortably (the whole calendar is a single key, read on a light poll). No cost expected at this usage.
