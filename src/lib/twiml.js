// ----- TwiML Responses -------------------------------------------------------

import R from 'ramda';
import twilio from 'twilio';

import {
  DEFAULT_TIMEOUT,
  TWILIO_ENDPOINT
} from '../etc/constants';


/**
 * Used by the call parser to generate TwiML chunks.
 *
 * See: https://www.twilio.com/docs/api/twiml
 *
 * @param {string} inboundCallerId - Inbound number for the current call.
 * @param {string} toNumber - Twilio number that was dialed, as reported in the
 *   incoming Twilio request.
 *
 * @return {object}
 */
export default function twimlResponse (inboundCallerId, toNumber) {
  /**
   * Reference to the current TwiML document.
   *
   * @type {TwiMlResponse}
   */
  let twiml = new twilio.TwimlResponse();


  /**
   * @private
   *
   * Returns the length of the longest key in the provided object.
   *
   * @param  {object} obj
   * @return {number}
   */
  function longestKey (obj) {
    return Object.keys(obj).reduce((longest, cur) => {
      if (cur.length > longest) {
        return cur.length;
      }

      return longest;
    }, 0);
  }


  /**
   * Generates TwiML instructing Twilio to forward a call.
   *
   * @param  {object} params
   * @param  {string} params.value - Number to forward the call to.
   * @return {object} - TwiML and related metadata.
   */
  function forwardCall ({value} = {}) {
    if (!value) {
      throw new Error(`[TwiML - Forward Call] Did not receive a value.`);
    }

    twiml.dial({
      action: TWILIO_ENDPOINT,
      callerId: inboundCallerId,
      method: 'GET',
      timeout: DEFAULT_TIMEOUT
    }, value);

    return {
      // By providing "terminal: true" here without an onResume handler, the
      // call parser will hang up the call when the third party disconnects.
      // This is the desired behavior, at least for the scope of this
      // application.
      terminal: true
    };
  }


  /**
   * Generates TwiML instructing Twilio to send an SMS to the provided number.
   *
   * @param {object} params
   * @param {string} params.to - Number to send the SMS to.
   * @param {string} params.value - Body of the message.
   * @return {object} - TwiML and related metadata.
   */
  function sendSms ({value, to} = {}) {
    if (!to) {
      throw new Error(`[TwiML - Send SMS] Did not receive a "to" number.`);
    }

    if (!value) {
      throw new Error(`[TwiML - Send SMS] Did not receive a value.`);
    }

    twiml.sms({
      from: toNumber,
      to
    }, value);

    return {
      terminal: false
    };
  }


  /**
   * Generates TwiML instructing Twilio to Sspeak the provided text.
   *
   * @param {object} params
   * @param {string} params.value - Text to speak.
   * @param {string} [params.language] - Language to use.
   * @param {string} [params.voice] - Voice to use.
   * @return {object} - TwiML and related metadata.
   */
  function say (params) {
    const {
      value,
      voice,
      language
    } = Object.assign({
      voice: 'woman',
      language: 'en-GB'
    }, params);

    if (!value) {
      throw new Error('[TwiML - Say] Did not receive a value.');
    }

    twiml.say({
      language,
      voice
    }, value);

    return {
      terminal: false
    };
  }


  /**
   * Generates TwiML instructing Twilio to play DTMF tones corresponding to the
   * provided sequence of digits.
   *
   * @param {object} params
   * @param {string|number} params.value - Digits to send.
   * @return {object} - TwiML and related metadata.
   */
  function sendDigits ({value} = {}) {
    if (!value) {
      throw new Error(`[TwiML - Send Digits] Did not receive a value.`);
    }

    twiml.play({
      digits: value
    });

    return {
      terminal: false
    };
  }


  /**
   * Generates TwiML instructing Twilio to wait for the user to enter a sequence
   * of digits.
   *
   * @param {object} branches - Object containing digit sequences and
   *   corresponding call structures that will be taken. Should contain a branch
   *   named "default" that will be used if no other branches match.
   * @return {object} - TwiML and related metadata.
   */
  function gatherDigits (branches) {
    if (!branches.default) {
      throw new Error('[TwiML - Gather Digits] No default branch provided.');
    }

    // Compute the number of digits to tell Twilio to wait for. This should be
    // equal to the longest "branch", but we don't want to consider "default" in
    // this calculation.
    const numDigits = longestKey(R.omit(['default'], branches));

    twiml.gather({
      action: TWILIO_ENDPOINT,
      method: 'GET',
      numDigits,
      timeout: DEFAULT_TIMEOUT
    });

    return {
      terminal: true,
      onResume ({Digits} = {}) {
        return branches[Digits] || branches.default;
      }
    };
  }


  /**
   * Generates TwiML instructing Twilio play the provided audio file.
   *
   * @return {object} - TwiML and related metadata.
   */
  function play ({value} = {}) {
    if (!value) {
      throw new Error('[Twiml - Play] No value provided.');
    }

    twiml.play(value);

    return {
      terminal: false
    };
  }


  /**
   * Generates TwiML instructing Twilio to end the current call.
   *
   * @return {object} - TwiML and related metadata.
   */
  function hangUp () {
    twiml.pause({
      length: 1
    });

    twiml.hangup();

    return {
      terminal: true
    };
  }


  /**
   * Clears any generated TwiML.
   */
  function reset () {
    twiml = new twilio.TwimlResponse();
  }


  /**
   * Returns an XML representation of the TwiML instance.
   *
   * @return {string}
   */
  function render () {
    return twiml.toString();
  }


  return {
    forwardCall,
    sendSms,
    say,
    sendDigits,
    gatherDigits,
    play,
    hangUp,
    reset,
    render
  };
}
