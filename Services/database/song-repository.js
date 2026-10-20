const api = require("../api/cloud-api");

async function listSongs() {
  return api.listSongs();
}

async function deleteSong(songId, taskId = "") {
  return api.deleteSong(songId, taskId);
}

async function saveGeneratedSong(taskId, songId = "") {
  return api.saveGeneratedSong(taskId, songId);
}

async function updateSongPrivacy(songId, isPrivate) {
  return api.updateSongPrivacy(songId, isPrivate);
}

module.exports = { listSongs, deleteSong, saveGeneratedSong, updateSongPrivacy };
