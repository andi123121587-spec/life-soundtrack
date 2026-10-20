const appConfig = Object.freeze({
  appName: "情绪音乐日记",
  version: "1.0.0-public-snapshot",
  // Replace with the environment ID owned by the person running this copy.
  cloudEnv: "YOUR_CLOUD_ENV_ID",
  // Use "demo" for local prototype work; "demo-with-cloud" requires a configured cloud environment.
  dataMode: "demo",
});

function usesDemoCatalog() {
  return appConfig.dataMode === "demo" || appConfig.dataMode === "demo-with-cloud";
}

module.exports = { appConfig, usesDemoCatalog };
