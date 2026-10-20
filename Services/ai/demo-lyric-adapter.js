// Demo-only adapter. Real music generation remains in cloudfunctions/generateMusic.
const { lyricizeDiary, titleFromDiary } = require("../../Core/domain/lyric-generator");

module.exports = { lyricizeDiary, titleFromDiary };
