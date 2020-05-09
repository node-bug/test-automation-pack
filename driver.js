/**
 * http://usejsdoc.org/
 */
const webdriver = require('selenium-webdriver');
const remote = require('selenium-webdriver/remote');
const chrome = require('selenium-webdriver/chrome');
// const firefox = require("selenium-webdriver/firefox");
const chromedriver = require('chromedriver');
require('geckodriver');
const imagemin = require('imagemin');
const imageminPngquant = require('imagemin-pngquant');
const { log } = require('debugging-logger');
const { selenium } = require('./config');
const { sleep } = require('./utils');

function buildDriver() {
  let firefoxOptions;
  let firefoxCapabilities;
  let safariOptions;
  let safariCapabilities;
  let chromeOptions;
  let chromeCapabilities;
  const browser = new webdriver.Builder();
  log.info(`Launching ${selenium.browser}`);
  switch (selenium.browser.toLowerCase()) {
    case 'firefox':
      firefoxOptions = {
        args: ['start-maximized', 'disable-infobars', 'private'],
        prefs: {
          'profile.content_settings.exceptions.automatic_downloads.*.setting': 1,
          'download.prompt_for_download': false,
          'download.default_directory': `${process.cwd()}/reports/downloads`,
        },
      };
      if (selenium.headless === true) {
        firefoxOptions.args.push('-headless');
      }
      firefoxCapabilities = webdriver.Capabilities.firefox();
      firefoxCapabilities.set('moz:firefoxOptions', firefoxOptions);
      browser.withCapabilities(firefoxCapabilities);
      break;
    case 'safari':
      safariOptions = {
        args: ['--start-maximized', '--disable-infobars'],
        prefs: {
          'profile.content_settings.exceptions.automatic_downloads.*.setting': 1,
          'download.prompt_for_download': false,
          'download.default_directory': `${process.cwd()}/reports/downloads`,
        },
      };
      safariCapabilities = webdriver.Capabilities.safari();
      safariCapabilities.set('safariOptions', safariOptions);
      browser.withCapabilities(safariCapabilities);
      break;
    case 'ie':
      log.info('IE not implement yet.');
      break;
    case 'chrome':
    default:
      chrome.setDefaultService(
        new chrome.ServiceBuilder(chromedriver.path).build(),
      );
      chromeOptions = {
        args: ['start-maximized', 'disable-extensions', 'incognito'],
        prefs: {
          'profile.content_settings.exceptions.automatic_downloads.*.setting': 1,
          'download.prompt_for_download': false,
          'download.default_directory': `${process.cwd()}/reports/downloads`,
        },
        excludeSwitches: ['enable-automation'],
      };
      if (selenium.headless === true) {
        chromeOptions.args.push('headless');
      }
      chromeCapabilities = webdriver.Capabilities.chrome();
      chromeCapabilities.set('goog:chromeOptions', chromeOptions);
      browser.withCapabilities(chromeCapabilities);
  }

  if (selenium.hub !== undefined) {
    browser.usingServer(selenium.hub);
  }
  return browser.build();
}

const driver = buildDriver();

const getDriver = () => driver;

const getWebDriver = () => webdriver;

// eslint-disable-next-line no-underscore-dangle
const getCapabilities = async () => (await driver.getCapabilities()).map_;

const closeCurrentTab = async () => driver.close();

const getTitle = async () => driver.getTitle();

const getURL = async () => driver.getCurrentUrl();

const switchToTab = async (tab) => driver.switchTo().window(tab);

const setSize = async (size) => {
  if (size !== undefined && (size.hasOwnProperty('width') || size.hasOwnProperty('height'))) {
    return driver.manage().window().setRect(size);
  }
  return driver.manage().window().maximize();
};

const visitURL = async (url) => {
  log.info(`Loading the url ${url} in the browser.`);
  await setSize(selenium.size);
  await driver.manage().setTimeouts({
    implicit: selenium.timeout,
    pageLoad: selenium.timeout,
    script: selenium.timeout,
  });
  await driver.setFileDetector(new remote.FileDetector());
  await driver.get(url);
  await sleep(2000);
};

const closeBrowser = async () => {
  log.info(
    `Closing the browser. Current URL is ${await driver.getCurrentUrl()}.`,
  );
  selenium.capabilities = await getCapabilities();
  return driver.quit();
};

const resetBrowser = async () => {
  const tabs = await driver.getAllWindowHandles();
  if (tabs.length > 1) {
    for (let index = 1; index < tabs.length; index += 1) {
      /* eslint-disable no-await-in-loop */
      await switchToTab(tabs[index]);
      log.info(`Closing tab ${await getTitle()}.`);
      await driver.close();
      /* eslint-enable no-await-in-loop */
    }
  }
  await switchToTab(tabs[0]);
  log.info(
    `Clearing cache and cookies. Current URL is ${await driver.getCurrentUrl()}.`,
  );
  await driver.manage().deleteAllCookies();
  return driver.executeScript(
    'window.sessionStorage.clear();window.localStorage.clear();',
  );
};

const activateTab = async (tabName) => {
  const startTimer = Date.now();
  while (Date.now() - startTimer < selenium.timeout) {
    /* eslint-disable no-await-in-loop */
    const tabs = await driver.getAllWindowHandles();
    for (let index = 0; index < tabs.length; index += 1) {
      await switchToTab(tabs[index]);
      const currentTabName = await getTitle();
      if (currentTabName.includes(tabName)) {
        log.info(`${currentTabName} tab activated.`);
        return true;
      }
    }
    await sleep(5000);
    /* eslint-enable no-await-in-loop */
  }
  return false;
};

const closeTabAndSwitch = async (tabName) => {
  const startTimer = Date.now();
  while (Date.now() - startTimer < selenium.timeout) {
    /* eslint-disable no-await-in-loop */
    const tabs = await driver.getAllWindowHandles();
    if (tabs.length < 2) {
      log.error(`There is only 1 tab existing. Script will not closing the ${tabName} 
      tab to avoid issues. Please check your test.`);
      return false;
    }
    for (let index = 0; index < tabs.length; index += 1) {
      await switchToTab(tabs[index]);
      const currentTabName = await getTitle();
      if (currentTabName.includes(tabName)) {
        await closeCurrentTab();
        log.info(`${currentTabName} tab closed.`);
        await switchToTab(tabs[0]);
        log.info(`${await getTitle()} tab activated.`);
        return true;
      }
    }
    await sleep(5000);
    /* eslint-enable no-await-in-loop */
  }
  return false;
};

const takeScreenshot = async () => {
  try {
    return (
      await imagemin.buffer(
        Buffer.from(await driver.takeScreenshot(), 'base64'),
        {
          plugins: [
            imageminPngquant({
              quality: [0.1, 0.4],
            }),
          ],
        },
      )
    ).toString('base64');
  } catch (err) {
    log.error(err.stack);
    return false;
  }
};

const onWaitForElementToBeVisible = async (element) => {
  log.debug(`Waiting for element (${element}) to appear...`);
  try {
    await driver.wait(webdriver.until.elementLocated(element, 10000));
    await driver.wait(
      webdriver.until.elementIsVisible(driver.findElement(element)),
      10000,
    );
  } catch (err) {
    log.error(err.stack);
  }
};

const onPageLoadedWaitById = async (elementIdOnNextPage) => {
  const by = webdriver.By.id(elementIdOnNextPage);
  log.debug(`Page Loaded - waited on id: ${elementIdOnNextPage}`);
  onWaitForElementToBeVisible(by);
};

const onWaitForElementToBeInvisible = async (element) => {
  log.debug('Waiting for element to disappear...');
  try {
    await driver.wait(webdriver.until.elementLocated(element, 10000));
    await driver.wait(
      webdriver.until.elementIsNotVisible(driver.findElement(element)),
      15000,
    );
  } catch (err) {
    log.error(err.stack);
  }
};

const onWaitForWebElementToBeEnabled = async (webElement) => {
  log.debug('Waiting for webElement to become enabled...');
  try {
    await driver.wait(webdriver.until.elementIsEnabled(webElement, 10000));
  } catch (err) {
    log.error(err.stack);
  }
};

const onWaitForWebElementToBeDisabled = async (webElement) => {
  log.debug('Waiting for webElement to become disabled...');
  try {
    await driver.wait(webdriver.until.elementIsDisabled(webElement), 3000);
  } catch (err) {
    log.error(err.stack);
  }
};

const onWaitForElementToBeLocated = async (element) => {
  log.debug('Waiting for element to become located...');
  try {
    await driver.wait(webdriver.until.elementLocated(element, 10000));
  } catch (err) {
    log.error(err.stack);
  }
};

// Show Process config files
process.argv.forEach((val, index) => {
  log.debug(`${index}: ${val}`);
});

module.exports = {
  closeBrowser,
  resetBrowser,
  visitURL,
  getURL,
  getTitle,
  activateTab,
  closeTabAndSwitch,
  takeScreenshot,
  getDriver,
  getWebDriver,
  getCapabilities,
  onPageLoadedWaitById,
  onWaitForElementToBeLocated,
  onWaitForWebElementToBeEnabled,
  onWaitForWebElementToBeDisabled,
  onWaitForElementToBeVisible,
  onWaitForElementToBeInvisible,
};
