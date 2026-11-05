# AutoApply

A local web app that reads your resume, imports the jobs you want, tailors your resume to each one with Claude, and then drives a real browser to fill in and submit the applications for you.

## How it works

1. **Profile** – upload a PDF/DOCX/TXT resume. Claude parses it into a structured, editable profile. Add your screening answers (work authorization, salary, EEO choices, special instructions).
2. **Jobs** – paste job URLs (LinkedIn, Indeed, Greenhouse, Lever, Workday, company sites…) or a job description. Each is imported in the shared browser profile and summarised into requirements and ATS keywords.
3. **Tailor** – for any job, generate a tailored resume (targeted summary, reordered skills, reworded bullets, nothing invented), a cover letter, and a PDF. Edit anything before using it.
4. **Apply** – the agent opens the posting, finds the application form, uploads the tailored PDF, fills every field, answers screening questions from your profile, and submits. Watch it live with per-step screenshots. Uncheck *Submit automatically* to have it stop right before the final submit.

If a site needs a login, CAPTCHA or 2FA, the agent stops with status *needs review* and leaves the tab open for you.

## Accounts

Each person creates their own account (email + password) and gets a private profile, job list, applications, settings and browser profile. Sessions are cookie-based and stored in the database; passwords are hashed with scrypt. Set `AUTOAPPLY_ALLOW_SIGNUP=false` in `.env` to close registration once everyone has an account.

## Setup

```bash
npm install
npm run setup          # prisma generate + create SQLite db + download Chromium
cp .env.example .env   # then put your ANTHROPIC_API_KEY in .env
npm run dev            # http://localhost:3000
```

Sign in to the job sites you use once via **Settings → Browser & sign-ins**; sessions persist in `.data/browser-profile`.

## Settings

- **Model** – defaults to `claude-opus-5-5`. Switch to Sonnet 5.5 to cut cost; applications typically use a few hundred thousand input tokens each (mostly cached).
- **Submit automatically** – default on. Off = fill everything, pause before submit.
- **Headless** – keep off so you can see the browser and intervene.

## Notes

- Everything (database, uploads, PDFs, screenshots, per-user browser profiles) lives in `.data/`, which is git-ignored.
- One Anthropic API key on the server pays for every user's runs.
- Automated applications violate some job boards' terms of service (notably LinkedIn's). Use your own judgement and keep volume reasonable.
- The agent only ever uses facts from your profile; it is instructed never to fabricate experience, authorization or credentials.
