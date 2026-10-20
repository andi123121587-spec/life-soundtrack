const { updateState } = require("../../utils/state");

function startGeneration({ diary, mood, privateMode, variant = 0, sourceSongId = "" }) {
  const draft = String(diary || "").trim();
  if (!draft) throw new Error("先写下一点此刻的心情");
  return updateState((state) => {
    state.currentSongId = "";
    state.currentLibrarySongId = "";
    state.generationStage = "loading";
    state.progress = 26;
    state.pendingGeneration = { diary: draft, mood, privateMode: Boolean(privateMode), variant, sourceSongId };
    return state;
  });
}

module.exports = { startGeneration };
