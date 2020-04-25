const jsonfile = require('jsonfile');
const rp = require('request-promise-native');
const jsonwebtoken = require('jsonwebtoken');
const tough = require('tough-cookie');
const { log } = require('./logger');

const cookieMap = new Map();
const that = {};

function RestObject(fullFileName) {
  const my = {};
  my.spec = { ...jsonfile.readFileSync(fullFileName) };
  my.resource = null;
  my.request = {};
  my.cookie = null;
  my.response = null;

  my.getDomainFromURL = async (url) => url.replace('http://', '').replace('https://', '').split('/')[0];

  my.setRequestOptions = async (requestType, url, jwt, body) => {
    log.info(`Constructing request options for request type ${requestType}`);
    my.request.method = requestType;
    my.request.uri = `${url}${(my.resource || my.spec.endpoint)}`;
    my.request.jar = await my.cookieJar(jwt, await my.getDomainFromURL(url));
    my.request.json = my.spec.json;
    my.request.body = { ...body };
    my.request.resolveWithFullResponse = true;
  };

  my.cookieJar = async (payload) => {
    const cookie = await my.getCookie(payload);
    if (cookie !== null && cookie !== undefined) {
      const cookieJar = rp.jar();
      cookieJar.setCookie(cookie.toString(), `https://${cookie.domain}`);
      return cookieJar;
    }
    log.error('Cookie is null or undefined. Please validate payload.');
    return null;
  };

  my.getCookie = async (payload) => {
    if (cookieMap.has(payload)) {
      log.debug(`Cookie exists payload ${JSON.stringify(payload)}. Using existing.`);
      return cookieMap.get(payload);
    }
    log.debug(`Cookie does not exist for payload ${JSON.stringify(payload)}. Creating new cookie.`);
    const cookie = new tough.Cookie({
      key: 'id_token',
      value: jsonwebtoken.sign(payload, 'secret', {
        expiresIn: '1d',
      }),
      domain: 'mldev.cloud', // get back here
    });
    cookieMap.set(payload, cookie);
    return cookie;
  };

  my.send = async () => {
    let status = false;
    log.debug(`Sending request :\n${JSON.stringify(my.request)}`);

    try {
      const fullresponse = await rp(my.request);
      my.response = fullresponse.body;
      log.info('Request returned response.');
      status = true;
    } catch (err) {
      my.response = err;
      log.info('Request failed.');
    }

    log.info(`Status code ${(my.response.statusCode || my.response.status)}`);
    return status;
  };

  that.post = async (url, payload, body) => {
    await my.setRequestOptions('POST', url, payload, body);
    await my.send();
    return my.response;
  };

  that.put = async (url, payload, body) => {
    await my.setRequestOptions('PUT', url, payload, body);
    await my.send();
    return my.response;
  };

  that.delete = async (url, payload, body) => {
    await my.setRequestOptions('DELETE', url, payload, body);
    await my.send();
    return my.response;
  };

  that.getResource = async () => my.spec.endpoint;

  that.setResource = async (resource) => {
    my.resource = resource;
  };

  that.delete = async () => my.response;

  return that;
}

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
