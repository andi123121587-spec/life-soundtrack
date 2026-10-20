# Design decisions → implementation map

This map is for a recruiter or reviewer who wants to move from a product claim to a concrete file. “Implemented” means the code path exists; it does not mean the path has passed cloud, device, or user validation.

| Decision | Why it matters | Implementation | Current evidence / limit |
|---|---|---|---|
| AI transforms; it does not decide what the user should feel or keep | Preserves authorship and avoids presenting a speculative emotional companion | `Core/domain/lyric-generator.js`, `Services/ai/`, `cloudfunctions/generateMusic/` | Code and copy reflect the boundary; generation quality is unverified. |
| Demo data has one explicit runtime boundary | Prevents fixtures from being mistaken for production records | `data/demo-catalog.js`, `utils/prototype-data.js`, `config/app-config.js` | Static code path is inspectable; Demo content is not real user data. |
| Long generation is represented as a task | Keeps a long-running provider request from being confused with a page request | `cloudfunctions/startGeneration/`, `getGenerationTask/`, `generateMusic/`; `Services/database/generation-repository.js` | Async engineering path exists; cloud credentials and deployment remain pending. |
| Result is pending until the user confirms it | Gives the user a chance to inspect, save, privatize, or discard | `UI/pages/diary/`, `Core/domain/generation-task.js`, `cloudfunctions/saveGeneratedSong/` | Local state/tests cover the distinction; end-to-end cloud persistence is unverified. |
| Original diary and generated lyrics stay comparable | Makes model/user mismatch visible and supports correction | `UI/pages/music/`, `Core/domain/song-detail.js`, `UI/components/lyric-rewrite-panel/` | Interaction path exists; comprehension and preferred adjustment granularity need testing. |
| Privacy and deletion are first-class actions | A personal diary product needs reversible, visible control boundaries | `Core/models/state.js`, `Services/database/song-actions.js`, `cloudfunctions/deleteSong/`, `updateSongPrivacy/` | Code-level cleanup path and tests exist; cloud permission/storage cleanup needs runtime verification. |
| Playback progress belongs to a song | Avoids progress leaking from one song into another | `utils/audio-player.js`, `Core/models/state.js` (`songProgress`) | Node tests cover state behavior; real audio playback is pending. |
| Regeneration carries a version/source relationship | Makes “another version” different from silently replacing the current song | `UI/pages/music/`, `UI/pages/diary/`, `cloudfunctions/generateMusic/` (`variant`, `sourceSongId`) | Static path and fallback lyric variation exist; real generated audio difference is pending. |
| Platform calls stay behind adapters | Makes domain logic testable without a live WeChat runtime | `Services/api/`, `Services/database/`, `Services/ai/` | `Tests/cloud-api.test.js` and `scripts/check-project.js` cover the separation; no device claim. |
| Credentials are environment-only | Prevents public source from becoming a secret distribution channel | `.env.example`, `cloudfunctions/*/index.js`, `README.md` | `.env.example` is documentation only; runtime variables must be configured in the cloud function environment. |

## Reading order for implementation review

1. Start with `UI/pages/compose/compose.js` to see user inputs.
2. Follow `Features/compose/index.js` into `Core/models/state.js`.
3. Follow `Services/api/cloud-api.js` and `Services/database/generation-repository.js` to see the platform boundary.
4. Open `cloudfunctions/startGeneration/` and `generateMusic/` to see the asynchronous engineering path.
5. Read `Tests/` and `Docs/RUN_AND_VERIFICATION.md` before making claims about what has actually run.
