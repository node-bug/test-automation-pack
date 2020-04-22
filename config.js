const argv = require("minimist")(process.argv.slice(2));
const rc = require("../../.test-automation-packrc.json");

function getHub() {
  const grid = (argv.grid || rc.selenium.grid);
  if (grid !== undefined && rc.grids[grid] !== undefined) {
    return `${rc.grids[grid]}/wd/hub`;
  }
}

const browser = (argv.browser || rc.selenium.browser);
const headless = (argv.h || argv.headless === "true" || rc.selenium.headless);
const timeout = rc.selenium.timeout * 1000;
const hub = getHub();

module.exports = { browser, headless, timeout, hub };
