/**
 * http://usejsdoc.org/
 */
const { log } = require('debugging-logger');
const { getDriver } = require('./driver');
const { By, until } = require('selenium-webdriver'); 

const that = {};

function WebElement(element) {
  const my = {};

  my.driver = getDriver();
  my.element = element;
  my.byType = element.byType.toLowerCase();
  my.definition = element ? element.definition : null;
  my.specialInstr = null;

  that.getWebElement = async () => {
    const definition = await that.getBy();
    return my.driver.findElement(definition);
  };

  that.getWebElements = async () => {
    const definition = await that.getBy();
    return my.driver.findElements(definition);
  };

  that.elementDisplayed = async () => {
    const definition = await that.getBy();
    return my.driver.findElement(definition).isDisplayed();
  };

  that.focus = async () => {
    const definition = await that.getBy();
    const returnElement = await my.driver.findElement(definition);
    return my.driver.executeScript('arguments[0].focus();', returnElement);
  };

  that.scrollIntoView = async () => {
    const definition = await that.getBy();
    const returnElement = await my.driver.findElement(definition);
    // eslint-disable-next-line max-len
    return my.driver.executeScript(
      'arguments[0].scrollIntoView(); window.scrollBy(0, -window.innerHeight / 4);',
      returnElement,
    );
  };

  that.elementDisabled = async () => {
    const definition = await that.getBy();
    const returnElement = await my.driver.findElement(definition);
    return my.driver.wait(
      until.elementIsDisabled(returnElement),
      3000,
    );
  };

  that.waitForVisibility = async (timeoutInSeconds) => {
    const definition = await that.getBy();
    const { implicit } = await my.driver.manage().getTimeouts();
    await my.driver.manage().setTimeouts({ implicit: 5000 });
    let visibility = false;
    const timer = Date.now();
    while ((Date.now() - timer) / 1000 < timeoutInSeconds) {
      // eslint-disable-next-line no-await-in-loop
      const elements = await my.driver.findElements(definition);
      if (elements.length > 0) {
        visibility = true;
        break;
      }
    }
    await my.driver.manage().setTimeouts({ implicit });
    return visibility;
  };

  that.waitForInvisibility = async (timeoutInSeconds) => {
    const definition = await that.getBy();
    const { implicit } = await my.driver.manage().getTimeouts();
    await my.driver.manage().setTimeouts({ implicit: 5000 });
    let invisibility = false;
    const timer = Date.now();
    while ((Date.now() - timer) / 1000 < timeoutInSeconds) {
      // eslint-disable-next-line no-await-in-loop
      const elements = await my.driver.findElements(definition);
      if (elements.length < 1) {
        invisibility = true;
        break;
      }
    }
    await my.driver.manage().setTimeouts({ implicit });
    return invisibility;
  };

  that.getBy = async () => {
    let byReturn = null;
    const type = my.byType.toLowerCase().trim();
    log.debug(
      `Getting element ${element.name} By: ${type} for ${my.definition}`,
    );
    switch (type) {
      case 'xpath':
        byReturn = By.xpath(my.definition);
        break;
      case 'css':
        byReturn = By.css(my.definition);
        break;
      case 'id':
        byReturn = By.id(my.definition);
        break;
      case 'name':
        byReturn = By.name(my.definition);
        break;
      case 'linktext':
        byReturn = By.linkText(my.definition);
        break;
      case 'classname':
        byReturn = By.className(my.definition);
        break;
      case 'partiallinktext':
        byReturn = By.partialLinkText(my.definition);
        break;
      case 'tagname':
        byReturn = By.tagName(my.definition);
        break;
      default:
        // eslint-disable-next-line max-len
        log.error(
          `The data asked to identify the element ${my.name}  by the type ${my.byType} and that type is not valid.  Please review the data and try again.`,
        );
        log.error(
          'Valid types are [xpath, cssSelector, id, name, linkText, partialLinkText, className, tagName]',
        );
    }
    return byReturn;
  };
  return that;
}

module.exports = WebElement;
