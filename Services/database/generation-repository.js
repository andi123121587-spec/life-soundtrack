const api = require("../api/cloud-api");

async function getGenerationTask(taskId) {
  return api.getGenerationTask(taskId);
}

async function startGeneration(payload) {
  return api.startGeneration(payload);
}

async function deleteGenerationTask(taskId) {
  return api.deleteSong("", taskId);
}

module.exports = { getGenerationTask, startGeneration, deleteGenerationTask };
