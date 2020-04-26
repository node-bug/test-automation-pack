const { By, Key } = require('selenium-webdriver');
const { assert } = require('chai');
const WebElement = require('./WebElement');
const { log } = require('./logger');
const { sleep } = require('./utils');

async function populateCheckbox(selector, value, WebElementObject) {
  if (value.toLowerCase() !== 'check' && value.toLowerCase() !== 'uncheck') {
    assert.fail('Instruction for populate checkbox must be \'check\' or \'uncheck\'. Please validate your test step.');
  }

  const actions = selector.getDriver().actions({ bridge: true });
  let localSpecialInstr = '';
  const WebElementData = WebElementObject.element;
  const isChecked = await selector.isSelected();
  if (WebElementData && WebElementData.specialInstr != null) {
    localSpecialInstr = WebElementData.specialInstr;
  }

  if (localSpecialInstr.toLowerCase().includes('focus')) {
    log.debug(`Special Instruction is : ${localSpecialInstr}. Focussing on element.`);
    await WebElementObject.webElement.focus();
  }

  if (value === 'check') {
    if (isChecked) {
      log.debug('Checkbox is already checked.');
    } else {
      await actions.click(selector).perform();
      log.debug('Post populate Checkbox: Checked the checkbox.');
    }
  } else if (value === 'uncheck') {
    if (isChecked) {
      await actions.click(selector).perform();
      log.debug('Post populate Checkbox: Un-checked the checkbox.');
    } else {
      log.debug('Checkbox is already unchecked.');
    }
  }
}

async function populateSelect(selector, item, WebElementObject) {
  let localSpecialInstr = '';
  const WebElementData = WebElementObject.element;
  // const eleValue = await selector.getAttribute('value');
  if (WebElementData && WebElementData.specialInstr != null) {
    localSpecialInstr = WebElementData.specialInstr;
  }

  if (localSpecialInstr.toLowerCase().includes('focus')) {
    log.debug(`Special Instruction is : ${localSpecialInstr}. Focussing on element.`);
    await WebElementObject.webElement.focus();
  }

  if (localSpecialInstr.toLowerCase().includes('selectbyvisibletext')) {
    await selector.selectByVisibleText(item);
  } else if (localSpecialInstr.toLowerCase().includes('selectbyvalue')) {
    await selector.selectByValue(item);
  } else {
    const options = await selector.findElements(By.tagName('option'));

    for await (const option of options) {
      const optionText = await option.getText();
      if (item === optionText) {
        await option.click();
        break;
      }
    }
  }
  if (localSpecialInstr.toLowerCase().includes('tabafter')) {
    log.debug('Hitting arrow down key');
    await selector.sendKeys(Key.TAB);
  }
  if (localSpecialInstr.toLowerCase().includes('enterafter')) {
    log.debug('Hitting return key');
    await selector.sendKeys(Key.RETURN);
  }
}

async function populateTextField(selector, value, WebElementObject) {
  const actions = selector.getDriver().actions({ bridge: true });

  let localSpecialInstr = '';
  const WebElementData = WebElementObject.element;
  const eleValue = await selector.getAttribute('value');
  if (WebElementData && WebElementData.specialInstr != null) {
    localSpecialInstr = WebElementData.specialInstr;
  }

  if (localSpecialInstr.toLowerCase().includes('focus')) {
    log.debug(`Special Instruction is : ${localSpecialInstr}. Focussing on element.`);
    await WebElementObject.webElement.focus();
  }
  if (!localSpecialInstr.toLowerCase().includes('noclick')) {
    log.debug(`Special Instruction is : ${localSpecialInstr}. Clicking on element.`);
    await selector.click();
  }
  if (!localSpecialInstr.toLowerCase().includes('noclear')) {
    log.debug(`Special Instruction is : ${localSpecialInstr}. Clearing text ${eleValue} in element.`);
    await selector.clear();
  }
  if (localSpecialInstr.toLowerCase().includes('overwrite')) {
    log.debug(`Special Instruction is : ${localSpecialInstr}. Current text is ${eleValue}. Overwriting text.`);
    await actions.click(selector).click(selector).click(selector).sendKeys('')
      .perform();
  }

  if (value !== '') {
    await selector.sendKeys(value);
    log.debug(`Post populate text field value: ${eleValue}`);
  }

  if (localSpecialInstr.toLowerCase().includes('tabafter')) {
    log.debug('Hitting tab key');
    await selector.sendKeys(Key.chord(Key.TAB));
  }
  if (localSpecialInstr.toLowerCase().includes('arrowdownafter')) {
    log.debug('Hitting arrow down key');
    await selector.sendKeys(Key.DOWN);
  }
  if (localSpecialInstr.toLowerCase().includes('enterafter')) {
    log.debug('Hitting return key');
    await selector.sendKeys(Key.RETURN);
  }

  if (localSpecialInstr.toLowerCase().includes('waitafter2secs')) {
    try {
      log.debug(`Sleeping 2 seconds. Special Instruction is : ${localSpecialInstr}`);
      await sleep(3000);
    } catch (e) {
      log.error(e);
    }
  }
}

async function populateClick(selector, value, WebElementObject) {
  const WebElementData = WebElementObject.element;
  let localSpecialInstr = '';
  if (WebElementData && WebElementData.specialInstr != null) {
    localSpecialInstr = WebElementData.specialInstr;
  }

  if (localSpecialInstr.toLowerCase().includes('focus')) {
    log.debug(
      `Special Instruction is : ${localSpecialInstr}. Focussing on element.`,
    );
    await WebElementObject.webElement.focus();
  }

  if (value.toLowerCase() === 'click') {
    if (WebElementData && WebElementData.waitForElementToBeEnabled) {
      log.debug('Waiting until element to be enabled');
      const webElementTarget = await WebElement(WebElementData);
      const webElement = await webElementTarget.getWebElement();
      await selector.onWaitForWebElementToBeEnabled(webElement);
      await sleep(500);
    }

    try {
      await selector.click();
    } catch (ex) {
      if (ex.name === 'ElementNotInteractableError') {
        log.info(`Error name ${ex.name}.`);
        log.info('Trying again using mouse actions to perform click.');
        const actions = selector.getDriver().actions({ bridge: true });
        try {
          await actions.click(selector).perform();
        } catch (e) {
          log.info(`Error name ${e.name} while clicking using actions.`);
        }
      } else if (ex.name === 'ElementClickInterceptedError') {
        log.info(`Error name ${ex.name}.`);
        log.info('Trying again using page script actions to perform click.');
        try {
          await selector
            .getDriver()
            .executeScript('arguments[0].click();', selector);
        } catch (e) {
          log.info(`Error name ${e.name} while clicking using executeScript.`);
        }
      } else {
        assert.fail(`Exception occurred and caught. ${ex}`);
      }
    }
    await sleep(500);

    if (WebElementData && WebElementData.waitIdToBeVisibleonNextPage) {
      log.debug('Waiting until page loads after click');
      await selector.onPageLoadedWaitById(WebElementData.waitIdToBeVisibleonNextPage);
      // await sleep(500);
    }

    if (WebElementData && WebElementData.waitToBeVisible) {
      log.debug(
        `Waiting until WebElementData (${WebElementData}) to be visible`,
      );
      const webElementTarget = await WebElement(
        WebElementObject.waitToBeVisible,
      );
      const webElement = await webElementTarget.getBy();
      await selector.onWaitForElementToBeVisible(webElement);
      // await sleep(500);
    }

    log.debug('Clicked web element');
  }

  if (WebElementObject && WebElementObject.elementToWaitToBeInvisible) {
    log.debug(
      `Waiting until WebElementObject (${WebElementObject}) to be invisible`,
    );
    const webElementTarget = await WebElement(
      WebElementObject.elementToWaitToBeInvisible,
    );
    const webElement = await webElementTarget.getBy();
    await selector.onWaitForElementToBeInvisible(webElement);
    log.debug('Sleeping 1000ms');
    // await sleep(500);
  }

  if (
    localSpecialInstr
    && localSpecialInstr.toLowerCase().indexOf('waitAfter2secs') > -1
  ) {
    try {
      // eslint-disable-next-line max-len
      log.debug(
        `Sleeping 2 seconds: Click - waitAfter2secs ${localSpecialInstr
          .toLowerCase()
          .indexOf('waitAfter2secs')}`,
      );
      await sleep(2000);
      log.debug('Waking up.');
    } catch (e) {
      log.error(e);
    }
  }
}

async function populateFile(selector, value, WebElementObject) {
  let localSpecialInstr = '';
  const WebElementData = WebElementObject.element;
  if (WebElementData && WebElementData.specialInstr != null) {
    localSpecialInstr = WebElementData.specialInstr;
  }

  if (localSpecialInstr.toLowerCase().includes('focus')) {
    log.debug(`Special Instruction is : ${localSpecialInstr}. Focussing on element.`);
    await WebElementObject.webElement.focus();
  }

  if (localSpecialInstr.toLowerCase().includes('makevisible')) {
    // eslint-disable-next-line max-len
    log.debug(`Special Instruction is : ${localSpecialInstr}. Running javascript on page.`);
    // eslint-disable-next-line max-len
    await selector.getDriver().executeScript("arguments[0].style.height='auto'; arguments[0].style.visibility='visible';", selector);
  }

  if (!localSpecialInstr.toLowerCase().includes('noclick')) {
    log.debug(`Special Instruction is : ${localSpecialInstr}. Clicking on element.`);
    await selector.click();
  }

  if (localSpecialInstr.toLowerCase().includes('overwrite')) {
    // no use case yet
  } else if (!localSpecialInstr.toLowerCase().includes('noclear')) {
    // no use case yet
  }

  await selector.sendKeys(value);
  log.debug(`File at path '${value}' uploaded.`);

  if (localSpecialInstr.toLowerCase().includes('tabafter')) {
    log.debug('Hitting tab key');
    await selector.sendKeys(Key.chord(Key.TAB));
  }
  if (localSpecialInstr.toLowerCase().includes('arrowdownafter')) {
    log.debug('Hitting arrow down key');
    await selector.sendKeys(Key.DOWN);
  }
  if (localSpecialInstr.toLowerCase().includes('enterafter')) {
    log.debug('Hitting return key');
    await selector.sendKeys(Key.RETURN);
  }

  if (localSpecialInstr.toLowerCase().includes('waitafter2secs')) {
    try {
      log.debug(`Sleeping 2 seconds. Special Instruction is : ${localSpecialInstr}`);
      await sleep(3000);
    } catch (e) {
      log.error(e);
    }
  }
}

async function populateRichTextField(selector, value, WebElementObject) {
  const actions = selector.getDriver().actions({ bridge: true });

  let localSpecialInstr = '';
  const WebElementData = WebElementObject.element;
  const eleValue = await selector.getAttribute('textContent');
  if (WebElementData && WebElementData.specialInstr != null) {
    localSpecialInstr = WebElementData.specialInstr;
  }

  if (localSpecialInstr.toLowerCase().includes('focus')) {
    log.debug(`Special Instruction is : ${localSpecialInstr}. Focussing on element.`);
    await WebElementObject.webElement.focus();
  }
  if (!localSpecialInstr.toLowerCase().includes('noclick')) {
    log.debug(`Special Instruction is : ${localSpecialInstr}. Clicking on element.`);
    await actions.click(selector);
  }

  if (localSpecialInstr.toLowerCase().includes('overwrite')) {
    log.debug(`Special Instruction is : ${localSpecialInstr}. Current text is ${eleValue}. Overwriting text.`);
    await actions.doubleClick(selector).sendKeys(value).perform();
  } else {
    await actions.sendKeys(value).perform();
  }
  log.debug(`Post populate text field value: ${value}`);
}

async function populateInput(selector, value, WebElementObject) {
  const type = await selector.getAttribute('type');
  switch (type) {
    case 'radio':
      if (value.toLowerCase() === 'click') {
        await populateClick(selector, value, WebElementObject);
      } else {
        log.debug('By passing radio button click');
      }
      break;

    case 'file':
      await populateFile(selector, value, WebElementObject);
      break;

    case 'email':
    case 'text':
    case 'textarea':
    case 'password':
    case 'number':
      await populateTextField(selector, value, WebElementObject);
      break;

    case 'checkbox':
      if (value.toLowerCase() === 'click') {
        await populateClick(selector, value, WebElementObject);
      } else {
        await populateCheckbox(selector, value, WebElementObject);
      }
      break;

    case 'button':
    case 'submit':
      if (value.toLowerCase() === 'click') {
        await populateClick(selector, value, WebElementObject);
      } else {
        log.debug('Bypassing the button click');
      }
      break;


    default:
      assert.fail(`ERROR: populateInput() failed because the input type ${type} has not been coded for.`);
  }
}

module.exports = {
  populateInput,
  populateClick,
  populateSelect,
  populateRichTextField,
};
