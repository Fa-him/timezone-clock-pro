# TimeSphere — World Clock & Smart Time Converter

A professional, publishable React + Vite website where users can search any city/country/time zone and see a full-screen live clock. It also includes an **AI Convert** style smart converter that understands natural language prompts like:

- `Monday June 8 7:00 PM Eastern`
- `tomorrow 10am Tokyo`
- `2026-06-08 19:00 UTC+6`
- `Friday 9 PM America/New_York`

## Files

This project uses 12 files:

```txt
package.json
index.html
vite.config.js
.gitignore
README.md
src/main.jsx
src/App.jsx
src/styles.css
src/components/ClockFace.jsx
src/components/AiConvertPanel.jsx
src/data/timezoneAliases.js
src/lib/time.js
```

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL shown in your terminal.

## Build for publishing

```bash
npm run build
```

The production-ready website will be inside the `dist` folder.

## Deploy

You can publish this on Vercel, Netlify, Cloudflare Pages, GitHub Pages, or any static host.

## Notes

- No secret API key is needed.
- Time zones come from `@vvo/tzdb`.
- Natural language date parsing uses `chrono-node`.
- The user's own local time zone is detected with the browser's `Intl.DateTimeFormat().resolvedOptions().timeZone`.
