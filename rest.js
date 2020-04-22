const jsonfile = require('jsonfile');
const rp = require('request-promise-native');
const jsonwebtoken = require('jsonwebtoken');
const { log } = require('./logger');
const cookieMap = new Map();

function RestObject(fullFileName) {
  this.spec = { ...jsonfile.readFileSync(fullFileName) };
  this.request = {};
  this.cookie = null;
  this.response = null;
  this.error = null;
  log.debug(`Reading rest specs from file ${fullFileName}`);
}

RestObject.prototype.send = async function () {
  log.debug(`Sending request :\n${JSON.stringify(this.request)}\n\n`);
  try {
    const fullresponse = await rp(this.request);
    this.response = fullresponse.body;
    log.info(`Request returned response. Status code ${this.response.statusCode || this.response.status}`);
    return true;
  } catch (err) {
    this.error = err;
    log.info(`Request failed. Status code ${this.error.statusCode}`);
    return false;
  }
};

RestObject.prototype.setRequestBody = async function (body) {
  log.info(`Adding body ${JSON.stringify(body)} to request\n\n`);
  Object.assign(this.request.body, body);
};

RestObject.prototype.setRequestOptions = async function (requestType, url) {
  log.info(`Constructing request options for request type ${requestType}`);
  this.request.method = requestType;
  this.request.uri = `${url}${this.spec.endpoint}`;
  this.request.body = this.spec.request;
  this.request.json = this.spec.json;
  this.request.resolveWithFullResponse = true;
};

RestObject.prototype.setRequestCookie = async function () {
  if (this.cookie !== null) {
    const cookieJar = rp.jar();
    cookieJar.setCookie(this.cookie, `https://${this.cookie.domain}`);
    this.request.jar = cookieJar;
  }
};

RestObject.prototype.setCookie = async function (payload) {
  if (cookieMap.has(payload)) {
    log.debug(`\nCookie exists for payload. Using existing.\n\n`);
    this.cookie = cookieMap.get(payload);
  } else {
    log.debug(`\nCookie does not exist for payload ${JSON.stringify(payload)}\nCreating new cookie.\n\n`);
    const tough = require('tough-cookie');
    this.cookie = new tough.Cookie({
      key: 'id_token',
      value: jsonwebtoken.sign(payload, 'secret', {
        expiresIn: '1d',
      }),
      domain: 'mldev.cloud',
    });
    cookieMap.set(payload, this.cookie);
  }
};

RestObject.prototype.DELETE = async function (url, body) {
  await this.setRequestOptions('DELETE', url);
  await this.setRequestBody(body);
  await this.setRequestCookie();
  const result = await this.send();

  if (result) {
    log.debug(`Response\n${this.response}\n\n`);
    return this.response.status;
  }
  log.error(`Error response\n${this.error}\n\n`);
  return this.error.statusCode;
};

RestObject.prototype.PUT = async function (url, body) {
  await this.setRequestOptions('PUT', url);
  await this.setRequestBody(body);
  await this.setRequestCookie();
  const result = await this.send();

  if (result) {
    log.debug(`Response\n${this.response}\n\n`);
    return this.response.status;
  }
  log.error(`Error response\n${this.error}\n\n`);
  return this.error.statusCode;
};

RestObject.prototype.POST = async function (url, body) {
  await this.setRequestOptions('POST', url);
  await this.setRequestBody(body);
  await this.setRequestCookie();
  const result = await this.send();

  if (result) {
    log.debug(`Response\n${this.response}\n\n`);
    return this.response.status;
  }
  log.error(`Error response\n${this.error}\n\n`);
  return this.error.statusCode;
};

RestObject.prototype.response = async function () {return this.response.body;} 

RestObject.prototype.error = async function () {return this.error};

module.exports = {
  RestObject,
};


// const response = function () {
//     const statusCode = function () {

//     };

//     const body = function () {

//     };

//     const headers = function () {

//     };

//     const responseTime = function () {

//     };
// };

// const assertions = function () {
//     const responseType = function () {

//     };

//     const condition = function () {

//     };

//     const value = function () {

//     };
// };

// const variables = function () {

// };

