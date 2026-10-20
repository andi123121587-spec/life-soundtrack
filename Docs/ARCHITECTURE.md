# Public architecture snapshot

Related reading: [`PRODUCT_AND_FLOW.md`](PRODUCT_AND_FLOW.md) · [`IMPLEMENTATION_MAP.md`](IMPLEMENTATION_MAP.md) · [`RUN_AND_VERIFICATION.md`](RUN_AND_VERIFICATION.md)

## Product boundary

Life Soundtrack turns a user-provided mood/event note into lyrics and music that the user can judge, adjust, save privately, or discard. Replaying old content and weekly recap are secondary lifecycle ideas, not prerequisites for the core creation task.

## Dependency direction

```text
UI → Features → Core
              ↘ Services → cloud functions / cloud storage / AI API
Demo data → explicit data boundary → Core
```

- `UI/` owns page lifecycle, event binding, and presentation state.
- `Features/` coordinates user tasks such as composing, browsing, and playback.
- `Core/` contains platform-light state, migrations, song models, and generation rules.
- `Services/` adapts cloud calls, demo generation, song repositories, and task repositories.
- `cloudfunctions/` is the server-side boundary for user-scoped reads/writes, generation, storage, and privacy operations.
- `data/demo-catalog.js` is the only entry point for prototype fixtures.

## Core flow

1. The compose page collects a diary note, mood, privacy choice, and optional variation seed.
2. A generation task is created and polled separately from the long-running music request.
3. The generation function calls the external music provider, uploads audio, and writes a pending result.
4. The client normalizes the result and lets the user inspect or adjust it.
5. Saving writes the confirmed song/diary records; discard removes the pending state. Detail and library views use the same song model.

## Privacy and credentials

Cloud reads and writes are scoped to the current user identity. API keys, Tencent Cloud credentials, temporary tokens, cookies, and user data must stay outside the repository. The public copy uses placeholders for AppID and cloud environment identifiers.
