// Platform/data adapter: demo catalog remains outside the Core model.
const model = require("../Core/models/songs");
const { diaryEntries, topSongs } = require("../data/demo-catalog");
const { usesDemoCatalog } = require("../config/app-config");

const catalogOptions = () => ({ demoSongs: usesDemoCatalog() ? diaryEntries : [] });

module.exports = {
  ...model,
  getAllSongs: (state) => model.getAllSongs(state, catalogOptions()),
  findSong: (state, id) => model.findSong(state, id, catalogOptions()),
  getLibraryIdForSong: (songId) => model.getLibraryIdForSong(songId, topSongs),
};
