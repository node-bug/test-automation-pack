const { log } = require("debugging-logger");
const { Builder, Capabilities } = require("selenium-webdriver");
// const firefox = require("selenium-webdriver/firefox");
const chrome = require("selenium-webdriver/chrome");
const chromedriver = require("chromedriver");
const { selenium } = require("./config");
require("geckodriver");

function initializeBrowser() {
  let caps, opts;
  const builder = new Builder();
  log.info(`Launching ${selenium.browser}`);
  switch (selenium.browser.toLowerCase()) {
    case "firefox":
      opts = {
        // args: ['-private'],
        args: [],
        prefs: {
          "profile.content_settings.exceptions.automatic_downloads.*.setting": 1,
          "download.prompt_for_download": false,
          "download.default_directory": `${process.cwd()}/reports/downloads`,
        },
      };
      if (selenium.headless === true) {
        opts.args.push("-headless");
      }
      caps = Capabilities.firefox();
      caps.set("moz:firefoxOptions", opts);
      break;
    case "safari":
      opts = {
        args: ["--start-maximized", "--disable-infobars"],
        prefs: {
          "profile.content_settings.exceptions.automatic_downloads.*.setting": 1,
          "download.prompt_for_download": false,
          "download.default_directory": `${process.cwd()}/reports/downloads`,
        },
      };
      caps = Capabilities.safari();
      caps.set("safariOptions", opts);
      break;
    case "ie":
      log.info("IE not implement yet.");
      break;
    case "chrome":
    default:
      chrome.setDefaultService(
        new chrome.ServiceBuilder(chromedriver.path).build()
      );
      opts = {
        args: [
          "incognito",
          "force-device-scale-factor=1",
          "disable-extensions",
        ],
        prefs: {
          "profile.content_settings.exceptions.automatic_downloads.*.setting": 1,
          "download.prompt_for_download": false,
          "download.default_directory": `${process.cwd()}/reports/downloads`,
        },
        excludeSwitches: ["enable-automation"],
      };
      if (selenium.headless === true) {
        opts.args.push("headless");
      }
      caps = Capabilities.chrome();
      caps.set("goog:chromeOptions", opts);
  }

  caps.set("pageLoadStrategy", "normal");
  builder.withCapabilities(caps);
  if (selenium.hub !== undefined) {
    builder.usingServer(selenium.hub);
  }
  return builder.build();
}

module.exports = {
  initializeBrowser,
};
