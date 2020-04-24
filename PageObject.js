/**
 * http://usejsdoc.org/
 */
const { assert, expect } = require('chai');
const jsonfile = require('jsonfile');
const WebElement = require('./WebElement');
const {
  getDriver, getWebDriver, activateTab, closeTabAndSwitch, getURL, getTitle,
} = require('./driver');
const { log } = require('./logger');
const {
  populateInput, populateClick, populateSelect, populateRichTextField,
} = require('./populate');
const config = require('./config');

function PageObject(pageNameInput, pageNameDirectoryInput) {
  const that = {};
  that.pageName = pageNameInput;
  that.pageDefinitionFileName = pageNameDirectoryInput + pageNameInput;
  that.pageElements = new Map(); // a hash of all of the web elements for this page.

  that.driver = getDriver();
  that.webdriver = getWebDriver();

  const addElement = (elementName, elements) => that.pageElements.set(elementName, elements);

  const getElement = async (elementName) => that.pageElements.get(elementName);

  const hasElement = async (elementName) => that.pageElements.has(elementName);

  const loadPageDefinitionFile = (fullFileName) => {
    const elements = jsonfile.readFileSync(fullFileName);
    Object.values(elements.webElements).forEach((element) => addElement(element.name, element));
  };

  const addDynamicElement = async (elementName, additionalDescription) => {
    if (await hasElement(elementName)) {
      if (typeof additionalDescription !== 'undefined') {
        const newElementName = `${elementName} ${additionalDescription}`;
        if (!(await hasElement(newElementName))) {
          const dynamicElement = { ...await getElement(elementName) };
          dynamicElement.name = newElementName;
          dynamicElement.definition = dynamicElement.definition.replace('<ReplaceText>', additionalDescription);
          addElement(newElementName, dynamicElement);
        }
        return newElementName;
      }
      return elementName;
    }
    assert.fail(`ERROR: WebElement ${elementName} not found in PageElements for adding dynamic element.`);
    return elementName;
  };

  const genericAssertElement = async (elementName, value) => {
    let retval;
    let WebElementObject = '';
    let WebElementData = {};

    if (await hasElement(elementName)) {
      WebElementData = await getElement(elementName);
      // eslint-disable-next-line no-use-before-define
      await switchFrame(WebElementData.frame);
      WebElementObject = await WebElement(WebElementData);

      const { implicit } = await getDriver().manage().getTimeouts();
      switch (value.toLowerCase()) {
        case 'notvisible':
        case 'notdisplayed':
          await getDriver().manage().setTimeouts({
            implicit: 5000,
          });
          retval = await WebElementObject.elementDisplayed();
          await getDriver().manage().setTimeouts({
            implicit,
          });
          break;
        case 'visible':
        case 'displayed':
          retval = await WebElementObject.elementDisplayed();
          break;
        case 'disabled':
          retval = await WebElementObject.elementDisabled();
          break;
        case 'exists':
          await getDriver().manage().setTimeouts({
            implicit: 5000,
          });
          retval = await WebElementObject.getWebElements();
          await getDriver().manage().setTimeouts({
            implicit,
          });
          log.info(`Found ${retval.length} matching elements on page.`);
          retval = retval.length > 0;
          break;
        default:
      }
    } else {
      assert.fail(`ERROR: WebElement ${elementName} not found in PageElements during AssertElement() attempt.`);
    }
    return retval;
  };

  const switchFrame = async (elementName) => {
    await that.driver.switchTo().defaultContent();
    if (elementName === 'default') {
      // if frame name is default then see above
    } else if (typeof elementName === 'number') {
      log.debug(`Switching to frame number ${elementName}`);
      await that.driver.wait(that.webdriver.until.ableToSwitchToFrame(elementName, config.timeout));
    } else {
      log.debug(`Switching to frame ${elementName}`);
      if (await genericAssertElement(elementName, 'displayed')) {
        const WebElementData = await getElement(elementName);
        const WebElementObject = await WebElement(WebElementData);
        const webElement = await WebElementObject.getWebElement();
        await that.driver.wait(that.webdriver.until.ableToSwitchToFrame(webElement, config.timeout));
      }
    }
  };

  const genericPopulateElement = async (elementName, value) => {
    let WebElementObject = '';
    let WebElementData = {};

    if (await hasElement(elementName)) {
      WebElementData = await getElement(elementName);
      const actionElement = {};

      // Setup all underlying required objects to take action on for this action
      actionElement.element = WebElementData;
      // if (WebElementData && WebElementData.waitForElementToBeInvisible) {
      //   if (await hasElement(WebElementData.waitForElementToBeInvisible)) {
      //     const elementToWaitToBeInvisible = await getElement(WebElementData.waitForElementToBeInvisible);
      //     actionElement.elementToWaitToBeInvisible = elementToWaitToBeInvisible;
      //   }
      // }
      // if (WebElementData && WebElementData.waitToBeVisible) {
      //   if (await hasElement(WebElementData.waitToBeVisible)) {
      //     const waitToBeVisible = await getElement(WebElementData.waitToBeVisible);
      //     actionElement.waitToBeVisible = waitToBeVisible;
      //   }
      // }

      // If need to hit a iframe, do it
      await switchFrame(WebElementData.frame);
      WebElementObject = await WebElement(WebElementData);
      actionElement.webElement = WebElementObject;

      const webElement = await WebElementObject.getWebElement();
      const tagName = await webElement.getTagName();
      switch (tagName.toLowerCase()) {
        case 'input':
        case 'textarea':
          if (value === 'click') {
            await populateClick(webElement, value, actionElement);
          } else {
            await populateInput(webElement, value, actionElement);
          }
          break;
        case 'a':
        case 'button':
        case 'div':
        case 'span':
        case 'ul':
        case 'li':
        case 'th':
        case 'h2':
        case 'section':
          if (value === 'click') {
            await populateClick(webElement, value, actionElement);
          } else {
            await populateRichTextField(webElement, value, actionElement);
          }
          break;
        case 'svg':
          if (value === 'click') {
            await populateClick(webElement, value, actionElement);
          } else {
            await populateSelect(webElement, value, actionElement);
          }
          break;
        case 'select':
        case 'p':
          await populateSelect(webElement, value, actionElement);
          break;
        case 'label':
        case 'option':
          await populateClick(webElement, value, actionElement);
          break;
        default:
          assert.fail(`ERROR: We tried to populate an unknown tag(${tagName}) of 
          element(${elementName}) with data in populateGenericElement()\n\tWe failed.`);
      }
    } else {
      assert.fail(`ERROR: WebElement ${elementName} not found in PageElements during PopulateElement() attempt.`);
    }
  };

  const genericPopulateDatable = async (table) => {
    log.debug('I populated table');

    const rows = table.raw();
    const numberOfColumns = rows[0].length;
    const numberOfRows = rows.length - 1;

    for (let rowIndex = 1; rowIndex < numberOfRows; rowIndex += 1) {
      for (let columnIndex = 0; columnIndex < numberOfColumns; columnIndex += 1) {
        log.debug('TABLE: ', rows[0][columnIndex], rows[rowIndex][columnIndex]);
        // eslint-disable-next-line no-await-in-loop
        await genericPopulateElement(rows[0][columnIndex], rows[rowIndex][columnIndex]);
      }
    }
  };

  const getWebElements = async (elementName, replaceText) => {
    let elementList;
    const element = await addDynamicElement(elementName, replaceText);

    if (await hasElement(element)) {
      let WebElementData = {};
      WebElementData = await getElement(element);
      await switchFrame(WebElementData.frame);
      const WebElementObject = await WebElement(WebElementData);
      elementList = await WebElementObject.getWebElements();
      return elementList;
    }
    assert.fail(`Element ${element} not found.`);
    return elementList;
  };

  // const generateDataTable = async (padLength) => {
  //   const localPadLength = padLength || 0;
  //   const _NA = '| NA'.padEnd(localPadLength + 1);
  //   console.log(`\nGenerating data table for ${that.pageName} \n`);
  //   try {
  //     // Return a | delimited list of the field names in the pageDefs file for this PageObject
  //     console.log(`|${that.pageElements.keyList('|', localPadLength)}`);

  //     // Generate a list of NA for the page object.
  //     let NAList = '';
  //     let i;
  //     const elementCount = that.pageElements.length;
  //     for (i = 0; i < elementCount; i++) {
  //       NAList += _NA;
  //     }
  //     console.log(`${NAList}|`);
  //   } catch (err) {
  //     log.error(err.stack);
  //     throw err;
  //   }
  // };

  // to be revisited
  const scrollElementIntoView = async (elementName, replaceText) => {
    let retval;
    let WebElementObject = '';
    let WebElementData = {};
    const element = await addDynamicElement(elementName, replaceText);

    log.debug(`Scrolling element: ${element} into view.`);
    if (await hasElement(element)) {
      WebElementData = await getElement(element);
      const actionElement = {};
      await switchFrame(WebElementData.frame);
      WebElementObject = await WebElement(WebElementData);
      actionElement.webElement = WebElementObject;
      log.info(`Info: Page Element ${element} retrieved from Page Elements collection for exists check.`);
      return WebElementObject.scrollIntoView();
    }
    assert.fail(`ERROR: WebElement ${element} not found in PageElements during scrollElementIntoView() attempt.`);
    return retval;
  };

  const checkElementExists = async (elementName, replaceText) => {
    const element = await addDynamicElement(elementName, replaceText);

    if (await genericAssertElement(element, 'exists')) {
      log.info(`Web Element ${element} is displayed on page.`);
      return true;
    }
    log.info(`Web Element ${element} is not displayed on page.`);
    return false;
  };

  const assertElementExists = async (elementName, replaceText) => {
    const element = await addDynamicElement(elementName, replaceText);

    if (await genericAssertElement(element, 'exists')) {
      log.info(`Web Element ${element} is displayed on page. PASS`);
    } else {
      assert.fail(`Web Element ${element} is not displayed on page.`);
    }
  };

  const assertElementDoesNotExist = async (elementName, replaceText) => {
    const element = await addDynamicElement(elementName, replaceText);

    if (await genericAssertElement(element, 'exists')) {
      assert.fail(`Web Element ${element} is displayed on page.`);
    } else {
      log.info(`Web Element ${element} is not displayed on page. PASS`);
    }
  };

  const assertElementDisabled = async (elementName, replaceText) => {
    const element = await addDynamicElement(elementName, replaceText);
    if (await genericAssertElement(element, 'disabled')) {
      log.info(`Web Element ${element} is disabled. PASS`);
    } else {
      assert.fail(`Web Element ${element} is not disabled.`);
    }
  };

  // to be revisited
  const genericGetAttribute = async (elementName, attributeName) => {
    let returnValue;
    if (await hasElement(elementName)) {
      let WebElementData = {};
      WebElementData = await getElement(elementName);
      await switchFrame(WebElementData.frame);
      const WebElementObject = await WebElement(WebElementData);
      const webElement = await WebElementObject.getWebElement();

      if (attributeName === undefined) {
        // eslint-disable-next-line no-param-reassign
        attributeName = 'textContent';
      }

      if (attributeName.toLowerCase() === 'text') {
        returnValue = await webElement.getText();
      } else if (attributeName === 'selected') {
        returnValue = await webElement.isSelected();
      } else {
        returnValue = await webElement.getAttribute(attributeName);
      }
      log.info(`Attribute "${attributeName}" value for element "${elementName}" is "${returnValue}".`);
      return returnValue;
    }
    assert.fail(`ERROR: WebElement ${elementName} not found in PageElements during GetAttributeValue() attempt.`);
    return returnValue;
  };

  const getAttributeValue = async (elementName, replaceText, attributeName) => {
    if (attributeName === undefined && replaceText !== undefined) {
      // eslint-disable-next-line no-param-reassign
      attributeName = replaceText;
    }
    const element = await addDynamicElement(elementName, replaceText);

    try {
      return await genericGetAttribute(element, attributeName);
    } catch (err) {
      log.error(err.stack);
      throw err;
    }
  };

  const getText = async (elementName, replaceText) => {
    const element = await addDynamicElement(elementName, replaceText);

    try {
      return await genericGetAttribute(element);
    } catch (err) {
      log.error(err.stack);
      throw err;
    }
  };

  const assertText = async (elementName, replaceText, expectedValue) => {
    if (expectedValue === undefined && replaceText !== undefined) {
      // eslint-disable-next-line no-param-reassign
      expectedValue = replaceText;
    }
    const element = await addDynamicElement(elementName, replaceText);

    try {
      const actualValue = await genericGetAttribute(element);
      log.info(`Asserting text for "${element}".`);
      if (await expect(actualValue).to.equal(expectedValue)) {
        log.info(`Actual value "${actualValue}" equals Expected value "${expectedValue}". PASS`);
      }
    } catch (err) {
      log.error(err.stack);
      throw err;
    }
  };

  const assertTextIncludes = async (elementName, replaceText, expectedValue) => {
    if (expectedValue === undefined && replaceText !== undefined) {
      // eslint-disable-next-line no-param-reassign
      expectedValue = replaceText;
    }
    const element = await addDynamicElement(elementName, replaceText);

    try {
      const actualValue = await genericGetAttribute(element);
      log.info(`Asserting text for "${element}".`);
      if (await expect(actualValue).to.include(expectedValue)) {
        log.info(`Actual value "${actualValue}" includes Expected value "${expectedValue}". PASS`);
      }
    } catch (err) {
      log.error(err.stack);
      throw err;
    }
  };

  const assertTextDoesNotInclude = async (elementName, replaceText, expectedValue) => {
    if (expectedValue === undefined && replaceText !== undefined) {
      // eslint-disable-next-line no-param-reassign
      expectedValue = replaceText;
    }
    const element = await addDynamicElement(elementName, replaceText);

    try {
      const actualValue = await genericGetAttribute(element);
      log.info(`Asserting text for "${element}" does not exist`);

      if (await expect(actualValue).to.not.include(expectedValue)) {
        log.info(`Actual value "${actualValue}" includes Expected value "${expectedValue}". PASS`);
      }
    } catch (err) {
      log.error(err.stack);
      throw err;
    }
  };

  const genericWaitForElement = async (elementName, condition, timeout) => {
    let WebElementObject = '';
    let WebElementData = {};
    let retval;
    if (await hasElement(elementName)) {
      WebElementData = await getElement(elementName);
      await switchFrame(WebElementData.frame);
      WebElementObject = await WebElement(WebElementData);

      switch (condition.toLowerCase()) {
        case 'visibility':
          retval = await WebElementObject.waitForVisibility(timeout);
          break;
        case 'invisibility':
          retval = await WebElementObject.waitForInvisibility(timeout);
          break;
        default:
          assert.fail(`Only visibility and invisibility suppoorted.
          ${condition} kind of wait is not defined.`);
      }
    } else {
      assert.fail(`ERROR: WebElement ${elementName} not found in PageElements during WaitForElement() attempt.`);
    }
    return retval;
  };

  const waitForElementVisibility = async (elementName, replaceText, timeoutInSeconds) => {
    const element = await addDynamicElement(elementName, replaceText);

    const timeout = timeoutInSeconds || 120;
    if (await genericWaitForElement(element, 'visibility', timeout)) {
      log.info(`Web Element ${element} is visible on page. PASS`);
    } else {
      assert.fail(`Web Element ${element} is not visible on page after ${timeout} second wait. FAIL`);
    }
  };

  const waitForElementInvisibility = async (elementName, replaceText, timeoutInSeconds) => {
    const element = await addDynamicElement(elementName, replaceText);

    const timeout = timeoutInSeconds || 120;
    if (await genericWaitForElement(element, 'invisibility', timeout)) {
      log.info(`Web Element ${element} is not visible on page. PASS`);
    } else {
      assert.fail(`Web Element ${element} is visible on page after ${timeout} second wait. FAIL`);
    }
  };

  const populateElement = async (elementName, replaceText, strValue) => {
    if (strValue === undefined && replaceText !== undefined) {
      // eslint-disable-next-line no-param-reassign
      strValue = replaceText;
    }
    const element = await addDynamicElement(elementName, replaceText);

    try {
      log.info(`Starting populate the web element: ${element} with value ${strValue}`);
      await genericPopulateElement(element, strValue);
    } catch (err) {
      log.error(err.stack);
      throw err;
    }
  };

  const clickElement = async (elementName, replaceText) => {
    const element = await addDynamicElement(elementName, replaceText);
    try {
      log.info(`Starting click the web element: ${element}`);
      await genericPopulateElement(element, 'click');
    } catch (err) {
      log.error(err.stack);
      throw err;
    }
  };

  const switchToTab = async (tabName) => {
    try {
      log.debug(`Switching to tab : ${tabName}`);
      if (!(await activateTab(tabName))) {
        assert.fail(`${tabName} tab was not found. FAIL`);
      }
    } catch (err) {
      log.error(err.stack);
      throw err;
    }
  };

  const closeTab = async (tabName) => {
    try {
      log.debug(`Closing tab : ${tabName}`);
      await closeTabAndSwitch(tabName);
    } catch (err) {
      log.error(err.stack);
      throw err;
    }
  };

  const getCurrentURL = async () => {
    try {
      log.debug('Getting URL of the current tab.');
      return await getURL();
    } catch (err) {
      log.error(err.stack);
      throw err;
    }
  };

  const getPageTitle = async () => {
    try {
      log.debug('Getting the title of the current tab.');
      return await getTitle();
    } catch (err) {
      log.error(err.stack);
      throw err;
    }
  };

  const assertPageTitle = async (expectedValue) => {
    try {
      const actualValue = await getPageTitle();
      log.info('Asserting page title match for current tab.');
      if (await expect(actualValue).to.equal(expectedValue)) {
        log.info(`Actual value "${actualValue}" equals Expected value "${expectedValue}". PASS`);
      }
    } catch (err) {
      log.error(err.stack);
      throw err;
    }
  };

  const assertPageTitleIncludes = async (expectedValue) => {
    try {
      const actualValue = await getPageTitle();
      log.info('Asserting page title partial match for current tab.');
      if (await expect(actualValue).to.include(expectedValue)) {
        log.info(`Actual value "${actualValue}" includes Expected value "${expectedValue}". PASS`);
      }
    } catch (err) {
      log.error(err.stack);
      throw err;
    }
  };


  const genericAlertOperations = async (operation) => {
    let retval;
    if (await that.driver.wait(that.webdriver.until.alertIsPresent())) {
      const alert = that.driver.switchTo().alert();
      switch (operation.toLowerCase()) {
        case 'accept':
          retval = await alert.accept();
          break;
        case 'dismiss':
          retval = await alert.dismiss();
          break;
        case 'text':
          retval = alert.getText();
          break;
        default:
          assert.fail(`ERROR: ${operation} is not implemented in genericAlertOperations().`);
      }
    } else {
      assert.fail('ERROR: Assert pop up was not displayed.');
    }
    return retval;
  };

  const acceptAlert = async () => {
    await genericAlertOperations('accept');
    log.info('Accepted alert popup.');
  };

  const dismissAlert = async () => {
    await genericAlertOperations('dismiss');
    log.info('Dismissed alert popup.');
  };

  const getAlertText = async () => {
    log.debug('Getting text in alert popup.');
    const actualValue = await genericAlertOperations('text');
    log.info(`${actualValue} is displayed in the alert popup.`);
    return actualValue;
  };

  const assertAlertText = async (expectedValue) => {
    log.debug('Asserting text in alert popup.');
    const actualValue = await genericAlertOperations('text');
    if (actualValue === expectedValue) {
      log.info(`Actual value "${actualValue}" matches Expected value "${expectedValue}". PASS`);
    } else {
      assert.fail(`Actual value "${actualValue}" does not match Expected value "${expectedValue}". FAIL`);
    }
  };

  const assertAlertTextIncludes = async (expectedValue) => {
    log.debug('Asserting text in alert popup.');
    const actualValue = await genericAlertOperations('text');
    if (actualValue.includes(expectedValue)) {
      log.info(`Actual value "${actualValue}" includes Expected value "${expectedValue}". PASS`);
    } else {
      assert.fail(`Actual value "${actualValue}" does not include Expected value "${expectedValue}". FAIL`);
    }
  };


  const dragAndDrop = async (dragElementName, dropElementName, dragReplaceText, dropReplaceText) => {
    let From;
    let To;
    let WebElementObject = '';
    let WebElementData = {};

    const fromElementName = await addDynamicElement(dragElementName, dragReplaceText);
    if (await genericAssertElement(fromElementName, 'displayed')) {
      log.info(`Target Web Element "${fromElementName}" is displayed on page. PASS`);
    } else {
      assert.fail(`Target Web Element "${fromElementName}" is not displayed on page.`);
    }
    if (await hasElement(fromElementName)) {
      WebElementData = await getElement(fromElementName);
      await switchFrame(WebElementData.frame);
      WebElementObject = await WebElement(WebElementData);
      await WebElementObject.scrollIntoView();
      From = await WebElementObject.getWebElement();
    }

    const toElementName = await addDynamicElement(dropElementName, dropReplaceText);
    if (await genericAssertElement(toElementName, 'displayed')) {
      log.info(`Destination Web Element "${toElementName}" is displayed on page. PASS`);
    } else {
      assert.fail(`Destination Web Element "${toElementName}" is not displayed on page.`);
    }
    if (await hasElement(toElementName)) {
      WebElementData = await getElement(toElementName);
      await switchFrame(WebElementData.frame);
      WebElementObject = await WebElement(WebElementData);
      await WebElementObject.scrollIntoView();
      To = await WebElementObject.getWebElement();
    }

    try {
      const actions = getDriver().actions({ bridge: true });
      await actions.dragAndDrop(From, To).perform();
      log.debug(`Dropped element "${fromElementName}" on element "${toElementName}". PASS`);
    } catch (err) {
      assert.fail(`Unable to perform drag and drop operation due to error. FAIL. Error ${err}`);
    }
  };

  const waitClick = async (elementName, replaceText, timeoutInSeconds) => {
    await waitForElementVisibility(elementName, replaceText, timeoutInSeconds);
    await clickElement(elementName, replaceText);
  };

  const waitPopulate = async (elementName, replaceText, timeoutInSeconds) => {
    await waitForElementVisibility(elementName, replaceText, timeoutInSeconds);
    await populateElement(elementName, replaceText);
  };

  that.acceptAlert = acceptAlert;
  that.dismissAlert = dismissAlert;
  that.getAlertText = getAlertText;
  that.assertAlertText = assertAlertText;
  that.assertAlertTextIncludes = assertAlertTextIncludes;
  that.assertText = assertText;
  that.assertTextIncludes = assertTextIncludes;
  that.assertTextDoesNotInclude = assertTextDoesNotInclude;
  that.assertElementDisabled = assertElementDisabled;
  that.getElement = getElement;
  that.hasElement = hasElement;
  that.getDriver = getDriver;
  that.populate = populateElement;
  that.waitPopulate = waitPopulate;
  that.click = clickElement;
  that.waitClick = waitClick;
  that.getAttributeValue = getAttributeValue;
  that.populateFromDataTable = genericPopulateDatable;
  that.populateDatatable = genericPopulateDatable;
  that.checkElementExists = checkElementExists;
  that.assertElementExists = assertElementExists;
  that.assertElementDoesNotExist = assertElementDoesNotExist;
  that.getWebElements = getWebElements;
  // that.generateDataTable = generateDataTable;
  that.scrollElementIntoView = scrollElementIntoView;
  that.getText = getText;
  that.switchToTab = switchToTab;
  that.closeTab = closeTab;
  that.getCurrentURL = getCurrentURL;
  that.getPageTitle = getPageTitle;
  that.assertPageTitle = assertPageTitle;
  that.assertPageTitleIncludes = assertPageTitleIncludes;
  that.addDynamicElement = addDynamicElement;
  that.waitForElementVisibility = waitForElementVisibility;
  that.waitForElementInvisibility = waitForElementInvisibility;
  that.dragAndDrop = dragAndDrop;
  loadPageDefinitionFile(that.pageDefinitionFileName);
  return that;
}

module.exports = {
  PageObject,
};
