// Resolves Playwright from the project, or from the cloud sandbox's global install.
try {
  module.exports = require('playwright');
} catch {
  module.exports = require('/opt/node-tools/node_modules/playwright');
}
