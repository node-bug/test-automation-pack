const argv = require('minimist')(process.argv.slice(2));
const rc = require('../../.test-automation-packrc.json');

function getHub() {
  let hub;
  const grid = (argv.grid || rc.selenium.grid);
  if (grid !== undefined && rc.grids[grid] !== undefined) {
    hub = `${rc.grids[grid]}/wd/hub`;
  }
  return hub;
}

function getTestRailConfig() {
  let that = {};
  that.upload = (argv.u || argv.upload || rc.testrail.upload_results);
  that.suite = rc.testrail.suite_name;
  that.user = rc.testrail.user;
  return that;
}

const browser = (argv.browser || rc.selenium.browser);
const headless = (argv.h || argv.headless === 'true' || rc.selenium.headless);
const timeout = rc.selenium.timeout * 1000;
const hub = getHub();
const grid = (argv.grid || rc.selenium.grid || 'local');
const datetime = new Date().toISOString();
const testrail = getTestRailConfig();

module.exports = {
  browser, headless, timeout, hub, grid, datetime, testrail
};
