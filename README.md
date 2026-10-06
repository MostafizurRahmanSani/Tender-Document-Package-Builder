# Tender Document Package Builder

A browser-only web app that helps office staff turn a set of tender PDFs into one complete, checked and correctly ordered PDF package, ready to submit. Built for the AI DevFest 2026 vibe-coding contest.

**Name:** Mostafizur Rahman Sani
**Live site (HTTPS):** _coming soon_

## What it does
- Loads the tender's `requirements.json` and lists the required documents in order
- Uploads PDF files (rejects anything that is not a PDF) and shows each file's page count
- Lets you match each file to one required document, with change and undo
- Asks for expiry dates where needed and checks them against the submission deadline
- Shows a live status for every document: Missing, Expiry date needed, Expired, Not provided, OK
- Flags duplicate files with the same content, even under different names
- Builds one combined PDF with a cover page and a `<tender_id> | Page X of Y` footer on every page
- Works fully in Bangla and English

All processing happens in your browser. No documents are uploaded anywhere.

## How to run
```bash
npm install
npm run dev      # local
npm run build    # production build
```

## Main features done
- _in progress_

## Bonus features
- _in progress_

## Known problems
- _none yet_

## AI tools used
- Claude Code

## Most useful prompt
> _to be added_

## License
MIT. See LICENSE.
