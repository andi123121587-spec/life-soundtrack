const { normalizeSongResult } = require("../../Core/domain/generation-task");

function normalizeGeneratedSong(song, payload = {}) {
  return normalizeSongResult(song, payload);
}

module.exports = { normalizeGeneratedSong };
