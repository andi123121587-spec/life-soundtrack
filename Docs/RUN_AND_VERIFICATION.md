# Run and verification guide

This guide describes three separate levels: local code checks, Demo exploration in WeChat Developer Tools, and cloud/device validation. Completing the first level does not imply the other two.

## 1. Local code checks

Prerequisite: Node.js. The repository has no runtime dependency at the package root.

```bash
npm test
npm run check
```

Equivalent direct commands are:

```bash
node --test Tests/*.test.js
node scripts/check-project.js
```

Expected results for the frozen candidate:

- 14 tests pass.
- `scripts/check-project.js` reports JavaScript syntax and JSON parsing success.
- The check script validates local CommonJS module references and the Core/Services separation rules.

If `npm` is unavailable, run the equivalent commands with an installed Node binary. Do not install dependencies or copy the source project’s dependency caches into this repository.

## 2. Demo exploration in WeChat Developer Tools

1. Import the repository root in WeChat Developer Tools.
2. Fill in a development AppID; `project.config.json` contains `YOUR_WECHAT_APPID` only.
3. Keep `config/app-config.js` in `dataMode: "demo"` for a local fixture-only walkthrough.
4. Use the pages declared in `app.json`: home, library, compose, generation result, and music detail.
5. Walk the core path: write a note → choose mood/privacy → inspect the generated Demo result → adjust or save/discard → open detail.

The fixture catalog is loaded through `data/demo-catalog.js`. The visible songs are example data, not real user records or proof of an AI provider response.

## 3. Cloud-enabled setup (optional, not verified by this package)

The `.env.example` file is a variable reference only. There is no dotenv loader and no code path that copies or reads `.env.example`. Configure values in the cloud-function environment or the platform’s secret manager.

Before deployment:

1. Set `cloudEnv` in `config/app-config.js` and `envId` in `cloudbaserc.json` to an environment you own.
2. Use your own AppID in Developer Tools.
3. Create `diaries`, `songs`, and `generation_tasks` collections. Keep user access scoped to the creator and use cloud functions for business reads/writes.
4. Deploy the seven function directories with cloud dependencies installed: `generateMusic`, `listSongs`, `deleteSong`, `startGeneration`, `getGenerationTask`, `saveGeneratedSong`, and `updateSongPrivacy`.
5. Configure environment variables in the cloud function console/deployment environment:

   - `MINIMAX_API_KEY`: provider credential for `generateMusic`.
   - `MINIMAX_MUSIC_MODEL`: optional provider model override.
   - `TENCENTCLOUD_SECRETID`, `TENCENTCLOUD_SECRETKEY`: async SCF invocation credentials for `startGeneration`.
   - `TENCENTCLOUD_SESSIONTOKEN`: only when using temporary credentials.
   - `TENCENTCLOUD_SCF_NAMESPACE`: fallback namespace when the cloud context does not expose `ENV`.
   - `TENCENTCLOUD_REGION`: optional region override; code defaults to `ap-shanghai`.

6. Confirm `generateMusic` is configured for 300 seconds in both `cloudfunctions/generateMusic/config.json` and `cloudbaserc.json`.
7. Only then run a controlled end-to-end generation test using non-sensitive sample text.

No real credential, endpoint secret, or user record is included here.

## Verification matrix

| Check | Status in this candidate | What it proves | What it does not prove |
|---|---|---|---|
| `node --test Tests/*.test.js` | PASS: 14 tests | Core state, song operations, generation task, and cloud transport contracts run locally | WeChat UI, cloud access, or real audio |
| `node scripts/check-project.js` | PASS | JS syntax, JSON, module references, and architecture guardrails | Visual fidelity or device behavior |
| Markdown/local link review | PASS | Recruiter docs point to files in this package | GitHub rendering under every theme/browser |
| Demo data path review | PASS | Fixtures enter through the explicit catalog boundary | Fixture realism or user value |
| WeChat Developer Tools walkthrough | NOT RUN for this freeze | Would check page wiring and platform behavior | — |
| Cloud deployment and generation | NOT RUN for this freeze | Would check credentials, collections, provider, storage, and async task flow | — |
| Target-user exploration | NOT RUN | Would produce participant-level evidence | Cannot be inferred from code or Demo screenshots |

When reporting the project, use “code path implemented”, “Demo walkthrough”, “cloud path pending environment validation”, or “target-user testing pending” precisely; do not collapse them into “launched” or “validated”.
