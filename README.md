# Tender Document Package Builder

A browser-only web app that helps office staff turn a set of tender PDFs into one complete, checked and correctly ordered PDF package, ready to submit. Built for the AI DevFest 2026 vibe-coding contest.

**Name:** Mostafizur Rahman Sani
**Live site (HTTPS):** https://tender-document-package-builder-five.vercel.app/
**Repository:** https://github.com/MostafizurRahmanSani/Tender-Document-Package-Builder

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
npm test         # logic and PDF tests
```

## How to use
1. Click **Open requirements.json** and choose the tender's file.
2. Click **Add PDF files** and select all documents at once.
3. Click **Auto-match by name**, then check each match. Pick a file for anything still missing.
4. Enter the expiry date for documents that have one.
5. When the bottom bar says everything is ready, click **Create package**.

## Main features done
- Load `requirements.json` with full validation and clear error messages; list sorted by `order`
- Upload many PDFs at once; shows name, size and page count; non-PDFs rejected by checking the file's bytes, not just the name; limits of 30 files and 50 MB enforced; any file can be removed
- Match files to documents from either side (document list or file list); one file per document and one document per file; change, remove and **Undo** at any time
- Expiry date entry for documents with `has_expiry`; changing a document's file clears its old date
- Live status for every document: Missing, Expiry date needed, Expired, Not provided, OK. Dates are compared as `YYYY-MM-DD` text, so there are no timezone bugs. Expiring on the deadline day is OK
- Duplicate detection by SHA-256 of the file content, even with different names; a duplicate cannot be matched to a second document
- **Create package** stays disabled while anything blocks it, and the bottom bar lists each problem; click one to jump to it
- Package: English cover page (tender ID, title, procuring entity, bidder, deadline, date created, ordered list of included documents), then every page of each document in `order`, optional documents with no file skipped
- Footer `<tender_id> | Page X of Y` on every page including the cover. Each document page gets a small extra strip at the bottom for the footer, so it never covers the original content. Rotated and blank pages are handled
- Downloads as `<tender_id>_Package.pdf`
- Full Bangla and English interface; the choice is remembered; document names from `title_bn` / `title_en`; dates and numbers in the chosen language

## Bonus features
All eight bonus tasks from the problem statement are done.
- **Index page** (optional checkbox) after the cover, showing the page where each document starts. It also shows each document's **Bangla name**, drawn by the browser so the Bengali letters and vowel signs are shaped correctly
- **Seal or signature**: upload a PNG, choose the pages (last / first / every page of each document, or a custom list like `3, 5-7`), position and size. It is placed above the footer, so it never covers it. Page lists are checked as you type
- **Export checklist** as CSV (document, file name, pages, expiry date, status); opens in Excel with Bangla intact
- **Save and reopen**: your work is saved automatically in this browser and offered again on the start screen ("Continue where you left off"). You can also **Save project file** and open it later, even on another computer. Both keep the PDFs, matches, expiry dates, seal and settings
- **Auto-match** by file name: prefers the newest year (`trade_license_2026` over `2025`) and the original over copies like `file (1).pdf`
- **Damaged and password-protected PDFs** are detected and shown with a clear message; the app never crashes on them
- **AI help** with your own API key (Groq or OpenRouter), fully optional: *AI match* suggests matches for files the name check missed, and *Translate with AI* gives the tender title, entity and bidder in Bangla. Only document titles and file names are sent, never the contents of a PDF. The key stays in the browser tab (session storage) and is never put in a project file, the saved copy or the code
- **Light and dark mode**, light by default

## Deliverables
- `output/T-2026-0417_Package.pdf`: built in the app from the sample pack (16 pages). Matches used: Trade License = `trade_license_2026.pdf` (the 2025 one is expired), Experience Certificate = `experience_cert.pdf` (its `(1)` copy is a duplicate), Signed Declaration = `scan_0042.pdf` (an unnamed scan of the declaration). `company_logo.png` is rejected as not a PDF.
- `screenshots/`: document statuses in English and Bangla, the blocked state, mobile view

## Tech
Vite, React, TypeScript, Tailwind CSS, Motion, pdf-lib, Lucide icons, Inter + Noto Sans Bengali (self-hosted). No backend: everything runs in the browser.

## Known problems
- The PDF cover is English only, as the problem requires. Bangla names appear on the index page instead
- On the index page the Bangla names are images, so that text cannot be selected or searched in the PDF
- AI help was tested against a simulated service, not a live provider account
- The expiry date picker shows dates in the browser's own format

## AI tools used
- Claude Code (VS Code extension) with Claude Opus 5.5 for planning, architecture and the final audit, and Claude Sonnet 5.5 for building features
- Claude Code skills: devfest26-rulebook, devfest26-vibe-builder, ui-ux-pro-max (design system), taste-skill, framer-motion, professional
- Chrome with Playwright for visual and end-to-end checks

## Most useful prompt
> "please read all files in the problem info, fully understand the task"

Why it mattered: before any code was written, the AI read the problem statement, `requirements.json` and every sample PDF, including rendering the image-only `scan_0042.pdf`. That found all the hidden problems in the sample pack: the expired 2025 trade license, the duplicate experience certificate under a different name, the non-PDF logo, and the unnamed scan that is really the Signed Declaration. It also gave the exact expected result (a 16-page package), which became a test. The follow-up prompt, *"start phase 1, please use modern sleek good design for the frontend, with all the logics perfeclty done"*, then turned that into a written spec with every status rule pinned down before building.

## License
MIT. See LICENSE.
