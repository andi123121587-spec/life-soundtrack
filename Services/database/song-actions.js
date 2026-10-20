async function deleteSongConsistently({ songId, deleteRemote, stopPlayback, removeLocal }) {
  await deleteRemote(songId);
  stopPlayback();
  removeLocal(songId);
}

module.exports = { deleteSongConsistently };
