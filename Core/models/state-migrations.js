const CURRENT_SCHEMA_VERSION = 2;

function migrateState(saved) {
  if (!saved || typeof saved !== "object") return {};
  const migrated = { ...saved };
  const version = Number(saved.schemaVersion || 0);
  if (version < 2) {
    migrated.schemaVersion = CURRENT_SCHEMA_VERSION;
    migrated.isPlaying = false;
    if (saved.progress === 42) migrated.progress = 31;
  }
  return migrated;
}

module.exports = { CURRENT_SCHEMA_VERSION, migrateState };
