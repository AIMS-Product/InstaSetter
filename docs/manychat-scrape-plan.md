# ManyChat Conversation Scraping Plan

## Why

ManyChat's API doesn't expose conversation history — only `last_input_text` (the subscriber's most recent message). To get full DM transcripts for training the Claude setter, we need to scrape the ManyChat web dashboard.

## What We Already Have

- **514 contacts** extracted via ManyChat API and stored in Supabase (`mc_contacts` table)
- Each contact has a `live_chat_url` like `https://app.manychat.com/fb1958608/chat/{subscriber_id}`
- API token stored in `MANYCHAT_API_TOKEN` env var (Mike Hoffmann's account, Pro plan)

## What We Need

ManyChat dashboard login credentials (email + password). Waiting on colleague to provide these.

## How It Works

### Step 1: Login & Save Session

Run this to open a browser window:

```bash
node /tmp/mc_login.mjs
```

- A Chromium browser opens to `https://app.manychat.com/`
- Log into ManyChat manually
- Once you see the dashboard, press **Enter** in the terminal
- Session cookies are saved to `/tmp/mc_auth.json`

The login script is at `/tmp/mc_login.mjs`.

### Step 2: Scrape All Conversations

```bash
node /tmp/mc_scrape.mjs
```

- Uses the saved session cookies (headless — no browser window)
- Loops through all 514 contacts' `live_chat_url`
- Extracts messages from the DOM
- Saves progress every 10 contacts (resumable if interrupted)
- Final output: `/tmp/mc_conversations.json`

The scrape script is at `/tmp/mc_scrape.mjs`.

### Step 3: Store in Supabase

After scraping, we'll:

1. Create an `mc_conversations` table (contact_id, messages JSONB, scraped_at)
2. Parse and load the scraped data
3. Use the transcripts as training data for the Claude setter

## Scripts Location

Both scripts are in `/tmp/` which gets cleared on reboot. When ready to run, Claude can regenerate them — or copy them somewhere permanent:

```bash
cp /tmp/mc_login.mjs /tmp/mc_scrape.mjs ~/InstaSetter/scripts/
```

## Notes

- The scraper tries multiple CSS selectors for message elements — ManyChat's DOM structure may need adjustment when we actually run it
- First contact scraped dumps a debug screenshot (`/tmp/mc_debug_screenshot.png`) and HTML (`/tmp/mc_debug_html.txt`) so we can tune selectors
- Rate limited with 500ms delay between contacts — full run for 514 contacts takes ~5 minutes
- Progress is resumable via `/tmp/mc_scrape_progress.json`
