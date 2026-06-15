const appJson = require("./app.json");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uuidProjectId(value) {
  return typeof value === "string" && UUID_RE.test(value) ? value : undefined;
}

const projectId =
  uuidProjectId(process.env.EXPO_PUBLIC_EAS_PROJECT_ID) ||
  uuidProjectId(process.env.EXPO_PUBLIC_PROJECT_ID);
const existingExtra = appJson.expo.extra || {};
const existingEas = existingExtra.eas || {};

module.exports = () => ({
  ...appJson.expo,
  extra: {
    ...existingExtra,
    eas: {
      ...existingEas,
      ...(projectId ? { projectId } : {}),
    },
  },
});
