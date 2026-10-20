const { loadState, updateState, removeSongFromState } = require("../../utils/state");
const songDetail = require("../../Core/domain/song-detail");
const { diaryEntries, topSongs } = require("../../data/demo-catalog");
const { usesDemoCatalog } = require("../../config/app-config");

function withCatalogOptions(options = {}) {
  return {
    ...options,
    demoSongs: usesDemoCatalog() ? diaryEntries : [],
    librarySongs: topSongs,
  };
}

const playbackDomain = {
  ...songDetail,
  selectAdjacentSong: (state, currentSongId, offset, shuffle = false, options = {}) =>
    songDetail.selectAdjacentSong(state, currentSongId, offset, shuffle, withCatalogOptions(options)),
  prepareRegeneration: (state, song, isPrivate, options = {}) =>
    songDetail.prepareRegeneration(state, song, isPrivate, withCatalogOptions(options)),
};

function removeSong(songId, options = {}) {
  return updateState((state) => removeSongFromState(state, songId, options));
}

function getSongDetail(song, options = {}) {
  return songDetail.buildSongDetail(loadState(), song, withCatalogOptions(options));
}

module.exports = { removeSong, getSongDetail, songDetail: playbackDomain };
