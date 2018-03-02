import 'babel-polyfill';

import path from 'path';
import bodyParser from 'body-parser';
import express from 'express';
import log from 'npmlog';
import {equals, is, merge, where} from 'ramda';

import createCall from './lib/call';
import twimlResponse from './lib/twiml';

import {
  TWILIO_ENDPOINT
} from './etc/constants';


/**
 * Creates a new Doorman server. Accepts a config object with the following:
 *
 * @param {object} config - Config object.
 * @param {string} config.port - Port to listen on. If not provided, falls back
 *   to process.env.PORT, and then 8080.
 * @param {string} config.assetPath - Folder to serve static assets from.
 * @param {string} config.primaryPhoneNumber - Primary number for forwarding calls.
 * @param {string} config.twilioAccountSid - Twilio account SID.
 * @param {string} config.twilioApplicationSid - Twilio application SID.
 */
export default function Doorman (userConfig) {
  /**
   * Configuration for the instance.
   *
   * @type {object}
   */
  const config = Object.assign({
    assetPath: './assets',
    logLevel: 'info',
    port: 8080
  }, userConfig);


  /**
   * Reference to the Express server.
   *
   * @type {object}
   */
  const server = express();


  /**
   * Tracks current calls.
   *
   * @type {map}
   */
  const calls = new Map();


  /**
   * Substitutes the Twilio web client's caller ID with the default Twilio
   * number so that call-forwarding from the Twilio web client works.
   *
   * @param {string} callerId - Phone number to parse.
   * @return {string} - Application's default phone number, or original caller ID.
   */
  function parseCallerId (callerId) {
    return callerId === 'client:Anonymous' ? config.twilioPhoneNumber : callerId;
  }


  /**
   * @private
   *
   * Express middleware used to ensure a request originated from Twilio.
   */
  function validateTwilioRequest (req, res, next) {
    if (process.env.NODE_ENV === 'development') {
      log.verbose('validate twilio request', 'Not in production environment, assuming request is valid.');
      next();
      return;
    }

    const inboundCallerId = parseCallerId(req.query.From);
    const isSecure = req.get('X-Forwarded-Proto') === 'https';

    log.verbose('validate twilio request', `Incoming call from "${inboundCallerId}".`);

    const isValid = R.where({
      ApplicationSid: R.equals(config.twilioApplicationSid),
      AccountSid: R.equals(config.twilioAccountSid)
    }, R.merge(req.query, req.body));

    if (isSecure && isValid) {
      log.verbose('validate twilio request', 'Twilio request is valid.');
      next();
    } else {
      log.warn('validate twilio request', 'Twilio request is invalid.');
      res.sendStatus(400);
    }
  }


  /**
   * @private
   *
   * Defers to configured premise data function to fetch data, then validates
   * and returns it.
   *
   * @param  {string} callerId - Caller ID for the premise to get data for.
   * @return {Promise<Object>} - Resolves with premise data, or rejects on error.
   */
  function getCallData (callerId) {
    return new Promise((resolve, reject) => {
      config.callDataFn(callerId, (err, data) => {
        data = is(String, data) ? JSON.parse(data) : data;

        if (err) {
          reject(new Error(err));
          return;
        }

        if (data) {
          resolve(data);
        } else {
          reject(new Error(`No call data found for number "${callerId}".`));
        }
      });
    });
  }


  async function getOrCreateCall (callSid, inboundCallerId) {
    if (calls.has(callSid)) {
      log.verbose('getOrCreateCall', `Call "${callSid}" exists, resuming call.`);
      return calls.get(callSid);
    }

    const callStruct = await getCallData(inboundCallerId);

    const call = createCall({
      callId: callSid,
      fromNumber: inboundCallerId,
      toNumber,
      call: callStruct
    });

    log.verbose('getOrCreateCall', `Call "${callSid}" created.`);

    calls.set(callSid, call);

    return call;
  }


  /**
   * Starts the server.
   */
  function startServer () {
    server.listen(config.port, () => log.log('info', 'server', `Doorman running on port: ${config.port}`));
  }


  // ----- Initialization ------------------------------------------------------

  // Set the log level.
  log.level = config.logLevel;

  // Set up path for serving static assets.
  server.use(express.static(path.resolve(config.assetPath)));

  // Set up body parser middleware.
  server.use(bodyParser.urlencoded({
    extended: true
  }));

  // Endpoint used by Twilio.
  server.get(TWILIO_ENDPOINT, validateTwilioRequest, async (req, res) => {
    res.set('Content-Type', 'application/xml');

    const {CallSid, From, To} = req.query;
    const inboundCallerId = parseCallerId(From);

    try {
      // Get or create the instruction set for the call.
      const call = await getOrCreateCall(CallSid, inboundCallerId, To);

      // Get TwiML to send.
      const twiml = call.advance(req.query);

      // If the call is now completed, remove it from the calls map.
      if (call.isCompleted()) {
        log.verbose('request', 'Call is complete.');
        calls.delete(CallSid);
      }

      // Finally, send the TwiML.
      res.send(twiml);
    } catch (err) {
      log.warn('request', `Request failed: ${err}`);
      log.verbose('request', `Forwarding call to "${config.primaryPhoneNumber}".`);
      // Call data could not be found for the incoming caller, or an unknown
      // error occurred. Forward the call to the primary number.
      const twiml = twimlResponse(inboundCallerId, To);

      twiml.forwardCall({
        value: config.primaryPhoneNumber
      });

      res.send(twiml.render());
    }
  });


  return {
    server,
    startServer
  };
}
