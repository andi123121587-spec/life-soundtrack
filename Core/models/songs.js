function getAllSongs(state, options = {}) {
  const generated = Array.isArray(state.generatedSongs) ? state.generatedSongs : [];
  const demoSongs = Array.isArray(options.demoSongs) ? options.demoSongs : [];
  return generated.concat(demoSongs.filter((preset) => !generated.some((song) => song.id === preset.id)));
}

function findSong(state, id, options = {}) {
  const songs = getAllSongs(state, options);
  const fallback = Array.isArray(options.demoSongs) ? options.demoSongs[0] : null;
  return songs.find((song) => song.id === id) || fallback;
}

function toLibrarySong(song) {
  return {
    id: `library-${song.id}`,
    entryId: song.id,
    title: song.title,
    mood: song.mood,
    moodKey: song.moodKey,
    duration: song.duration || "AI 创作",
    durationSeconds: song.durationSeconds || 0,
    coverImage: song.coverImage || "/assets/illustrations/night-desk.png",
    quote: `“${(song.diary || song.lyrics?.[0] || "一段写成歌的心情").slice(0, 34)}”`,
    audioSrc: song.audioSrc || "",
    cloudFileId: song.cloudFileId || "",
  };
}

function getLibraryIdForSong(songId, librarySongs = []) {
  const preset = librarySongs.find((song) => song.entryId === songId);
  return preset ? preset.id : `library-${songId}`;
}

module.exports = { getAllSongs, findSong, toLibrarySong, getLibraryIdForSong };
