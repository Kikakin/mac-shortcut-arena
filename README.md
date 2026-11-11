# Mac Shortcut Arena

Mac Shortcut Arena is a bilingual, 60-second Mac keyboard shortcut challenge by **AI & Mac Lab**. The browser never receives answer keys. A Cloudflare Worker creates and scores each challenge, and Cloudflare D1 stores verified scores for the UTC daily and all-time leaderboards.

## Local development on Mac

Requires Node.js 20+ and npm.

```bash
npm install
npm run db:migrate:local
npm run dev:worker
```

In another Terminal:

```bash
cp .env.example .env.local
npm run dev
```

Open the Local URL printed by Vite, normally `http://127.0.0.1:5173/mac-shortcut-arena/`. The frontend calls the local Worker at `http://127.0.0.1:8787`. The D1 local database is stored under `.wrangler/state` and is ignored by Git. `npm test` runs scoring and ranking unit tests. With the Worker running, `npm run test:api:local` runs a real D1 API integration test and creates local-only test scores. `npm run build` produces `dist/` for GitHub Pages. `npm run preview` serves that build at `http://127.0.0.1:4173/mac-shortcut-arena/`.

## API

- `POST /api/challenges`: accepts `{nickname, playerId}`; creates a challenge and returns ten localized questions and four choices per question, without the answer key.
- `POST /api/submit`: accepts `{challengeId, answers}`; scores once on the server. Answers are ten choice indices (`0`–`3`) or `null` for unanswered questions.
- `GET /api/leaderboard`: returns the current UTC date and top 100 daily and all-time rows. Each board uses the best score per anonymous player in that period.
- `GET /api/me?playerId=...`: returns that anonymous player's best score.
- `GET /api/health`: health check.

Ranking is by number correct descending, then completion time ascending, then submission time. The Worker measures completion time from its own challenge start and submission timestamps. Challenge submissions have a five-second network grace period beyond the 60-second timer; duration is capped at 60 seconds.

## Deployment status and GitHub Pages

The Cloudflare D1 database `mac-shortcut-arena-db` has been migrated, and the production Worker is deployed at `https://mac-shortcut-arena-api-production.kikakin.workers.dev`. `RATE_LIMIT_SALT` is configured as a Cloudflare Secret. The D1 database is bound only in Wrangler's `production` environment. The default top-level `arena-db` binding and all local scripts remain unchanged. Do not run a bare `wrangler deploy`: it selects the default environment, not the production binding.

To publish the frontend when ready:

1. Create the `Kikakin/mac-shortcut-arena` GitHub repository and add this project at the repository root.
2. In repository Settings → Pages, choose **GitHub Actions** as the build and deployment source.
3. Push to `main` when ready. The workflow runs tests, builds with the public API URL from the tracked `.env.production` file, and deploys `dist/`. No GitHub API secret or `VITE_API_URL` repository variable is needed.

The production Worker permits browser requests from `https://kikakin.github.io`. If updating the backend later, use `npx wrangler deploy --env production` so the production D1 binding is selected.

The Vite base path is `/mac-shortcut-arena/`, matching the planned GitHub repository name. Change `vite.config.ts` if the eventual repository name differs. Use HTTPS for the production Worker URL.

## Security and privacy scope

The Worker owns question selection, answer keys, timing, one-time submissions and ranking. Queries are parameterized. Nicknames are validated on both sides and React renders them as text. Request bodies are capped at 4 KB. D1 buckets provide basic per-minute rate limiting using a hash of IP, route, minute and a deployment secret; raw IP addresses are not stored. The site stores only language, nickname and a random anonymous player ID in localStorage; D1 stores that ID and public scores. Pending challenge records and temporary rate buckets are cleaned opportunistically.

This is first-version abuse resistance, not proof of a human player. A determined attacker can script multiple anonymous IDs, inspect timing or automate answers. Without an account, personal records may be lost when changing browsers or clearing site data. If submission fails, no score or rank is claimed as verified.

Shortcut content is based on Apple's [Mac keyboard shortcuts](https://support.apple.com/en-us/102650) guide; some shortcuts can be overridden by user preferences or third-party apps.
