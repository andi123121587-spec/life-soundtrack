const { updateState } = require("./utils/state");
const { listSongs } = require("./utils/cloud-service");
const { appConfig } = require("./config/app-config");

App({
  onLaunch() {
    if (!wx.cloud) {
      console.error("当前微信基础库不支持云开发，请升级至 2.2.3 或以上");
    } else {
      wx.cloud.init({
        env: appConfig.cloudEnv,
        traceUser: true,
      });
      listSongs().then((songs) => {
        updateState((state) => {
          const local = state.generatedSongs || [];
          state.generatedSongs = songs.map((cloudSong) => {
            const cached = local.find((song) => song.id === cloudSong.id);
            return { ...cloudSong, audioSrc: cached?.audioSrc || cloudSong.audioSrc || "" };
          });
          state.savedSongIds = Array.from(new Set([...(state.savedSongIds || []), ...songs.map((song) => song.id)]));
          state.privateSongIds = Array.from(new Set([
            ...(state.privateSongIds || []).filter((id) => !songs.some((song) => song.id === id)),
            ...songs.filter((song) => Boolean(song.private)).map((song) => song.id),
          ]));
          return state;
        });
      }).catch((error) => console.warn("云端歌单同步暂不可用", error));
    }
    updateState((state) => ({ ...state, isPlaying: false }));
  },
  globalData: {
    ...appConfig,
  },
});
