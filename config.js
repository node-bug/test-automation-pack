const argv = require('minimist')(process.argv.slice(2));
// eslint-disable-next-line import/no-unresolved
const { log } = require('debugging-logger');
const rc = require('../../.test-automation-packrc');

function getHub() {
  let hub;
  const grid = argv.grid || rc.selenium.grid;
  if (
    grid !== undefined
    && rc.grids !== undefined
    && rc.grids[grid] !== undefined
  ) {
    hub = `${rc.grids[grid]}/wd/hub`;
  } else {
    log.info('Hub config is not defined. Executing locally...');
  }
  return hub;
}

function getTestRailConfig() {
  const that = {};
  if (rc.testrail !== undefined) {
    that.upload = argv.u || argv.upload || rc.testrail.upload_results;
    that.suite = rc.testrail.suite_name;
    that.user = rc.testrail.user;
  } else {
    log.info('TestRail config is not defined.');
  }
  return that;
}

function getEmailerConfig() {
  const that = {};
  if (rc.emailer !== undefined) {
    that.recepients = argv.recepients || rc.emailer.recepients;
    that.subject = argv.subject || rc.emailer.subject;
    that.branch = argv.branch || rc.emailer.branch;
  } else {
    log.info('Emailer config is not defined.');
  }
  return that;
}

function getSize() {
  const that = {};
  if (rc.visual !== undefined && rc.visual.mode !== undefined) {
    that.height = rc.selenium.height || 800;
    that.width = rc.selenium.width || 1280;
  } else if (
    rc.selenium.width !== undefined
    && rc.selenium.width !== null
    && rc.selenium.height !== undefined
    && rc.selenium.height !== null
  ) {
    that.width = rc.selenium.width;
    that.height = rc.selenium.height;
  }
  return that;
}

function getSeleniumConfig() {
  const that = {};
  if (rc.selenium !== undefined) {
    that.browser = argv.browser || rc.selenium.browser;
    that.timeout = (rc.selenium.timeout || 30) * 1000;
    that.headless = argv.h || argv.headless === 'true' || rc.selenium.headless;
    that.hub = getHub();
    that.grid = argv.grid || rc.selenium.grid || 'local';
    that.size = getSize();
  } else {
    log.error(
      'Selenium config is not defined, please fix. ./.test-automation-packrc.json ...',
    );
  }
  return that;
}

const selenium = getSeleniumConfig();
const testrail = getTestRailConfig();
const emailer = getEmailerConfig();
const datetime = new Date().toISOString();

module.exports = {
  selenium,
  testrail,
  emailer,
  datetime,
};
