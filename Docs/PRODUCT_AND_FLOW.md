# Product overview · task, state, and CREATE proof

## One-sentence product definition

Life Soundtrack is a WeChat Mini Program prototype that turns a user-provided mood/event note into a lyric-and-music draft the user can inspect, adjust, save privately, or discard.

The product is not framed as an AI that “understands” a person’s emotions. AI is a transformation service; the user remains the judge of whether the result represents the original note.

## The problem being explored

Text diaries can preserve an event, but they do not always offer a memorable way to revisit its emotional texture. The product explores an alternate medium—music—while keeping the user’s original note and control over the generated result visible.

This is a product hypothesis, not a measured outcome. The public package does not claim better retention, higher emotional accuracy, or improved generation quality.

## Core task

```text
record an event and mood
  → choose privacy boundary and optional prompt
  → generate a lyric/music draft
  → inspect the result
  → adjust, save, keep private, or discard
```

| Stage | User-facing question | Code path | State / evidence boundary |
|---|---|---|---|
| Record | “What happened and how do I feel?” | `UI/pages/compose/`, `Features/compose/` | Draft is local prototype state; no user study is implied. |
| Generate | “Can the system turn this note into a draft?” | `UI/pages/diary/`, `Services/api/`, `Core/domain/generation-task.js` | Demo adapter and cloud path are separate; real cloud generation is pending environment validation. |
| Judge | “Does this result feel like my note?” | `UI/pages/diary/`, `UI/pages/music/`, `Core/domain/song-detail.js` | Showing diary/lyrics together is a control decision, not proof of comprehension. |
| Adjust | “What should change?” | `UI/components/song-adjust-panel/`, `UI/components/lyric-rewrite-panel/` | Local adjustment logic is tested; real audio/lyric quality is not validated. |
| Control | “Should I keep, privatize, or remove it?” | `Services/database/`, `cloudfunctions/saveGeneratedSong/`, `deleteSong/`, `updateSongPrivacy/` | Code paths exist; cloud permissions and end-to-end cleanup still require runtime checks. |

## State model that protects user control

The state model keeps a generated result distinguishable from a confirmed library item:

- `pendingGeneration` and `generationTaskId` represent work that is not yet saved.
- `generatedSongs` and `savedSongIds` represent local library state.
- `privateSongIds` and `deletedSongIds` preserve explicit privacy/removal decisions.
- `customLyrics` and `savedTweaks` record user adjustments separately from the source result.
- `songProgress` stores playback progress per song instead of using one global cursor.

The relevant implementation is in `Core/models/state.js`, `Core/models/songs.js`, `Core/domain/generation-task.js`, `Core/domain/song-detail.js`, and `utils/audio-player.js`. The tests exercise state migration, song removal, privacy changes, generation completion, and service transport contracts.

## What demonstrates CREATE

The project demonstrates the ability to carry one product through several layers:

1. define a narrow user task and its control boundaries;
2. turn the task into page states and interaction branches;
3. separate UI, use-case orchestration, domain rules, and platform adapters;
4. provide a Demo data boundary and a cloud-function engineering path;
5. document what is implemented versus what still needs device, cloud, or user validation.

The source basis is the project’s `PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `TASKS.md`, mini-program README, and current code. Research originals and personal records are intentionally not part of this public repository.
