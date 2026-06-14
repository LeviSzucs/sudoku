const appJson = require("./app.json");

const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || process.env.EXPO_PUBLIC_PROJECT_ID;
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
