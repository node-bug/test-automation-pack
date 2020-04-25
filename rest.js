const jsonfile = require('jsonfile');
const rp = require('request-promise-native');
const jsonwebtoken = require('jsonwebtoken');
const tough = require('tough-cookie');
const { log } = require('./logger');

const cookieMap = new Map();
const that = {};

function RestObject(fullFileName) {
  const me = {};
  me.spec = { ...jsonfile.readFileSync(fullFileName) };
  me.resource = null;
  me.request = {};
  me.cookie = null;
  me.response = null;

  me.setRequestOptions = async (requestType, url, jwt, body) => {
    log.info(`Constructing request options for request type ${requestType}`);
    me.request.method = requestType;
    me.request.uri = `${url}${(me.resource || me.spec.endpoint)}`;
    me.request.jar = await me.cookieJar(jwt);
    me.request.json = me.spec.json;
    me.request.body = { ...body };
    me.request.resolveWithFullResponse = true;
  };

  me.cookieJar = async (payload) => {
    const cookie = await me.getCookie(payload);
    if (cookie !== null && cookie !== undefined) {
      const cookieJar = rp.jar();
      cookieJar.setCookie(cookie.toString(), `https://${cookie.domain}`);
      return cookieJar;
    }
    log.error('Cookie is null or undefined. Please validate payload.');
    return null;
  };

  me.getCookie = async (payload) => {
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

  me.send = async () => {
    let status = false;
    log.debug(`Sending request :\n${JSON.stringify(me.request)}`);

    try {
      const fullresponse = await rp(me.request);
      me.response = fullresponse.body;
      log.info('Request returned response.');
      status = true;
    } catch (err) {
      me.response = err;
      log.info('Request failed.');
    }

    log.info(`Status code ${(me.response.statusCode || me.response.status)}`);
    return status;
  };

  that.post = async (url, payload, body) => {
    await me.setRequestOptions('POST', url, payload, body);
    await me.send();
    return me.response;
  };

  that.put = async (url, payload, body) => {
    await me.setRequestOptions('PUT', url, payload, body);
    await me.send();
    return me.response;
  };

  that.delete = async (url, payload, body) => {
    await me.setRequestOptions('DELETE', url, payload, body);
    await me.send();
    return me.response;
  };

  that.getResource = async () => me.spec.endpoint;

  that.setResource = async (resource) => {
    me.resource = resource;
  };

  that.delete = async () => me.response;

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
