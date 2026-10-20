const { loadState } = require("../../utils/state");
const { getAllSongs, toLibrarySong } = require("../../utils/songs");

function getLibrarySongs(state = loadState()) {
  return getAllSongs(state)
    .filter((song) => (state.savedSongIds || []).includes(song.id) && !(state.deletedSongIds || []).includes(song.id))
    .map(toLibrarySong);
}

module.exports = { getLibrarySongs };
