// ----- Call Parser -----------------------------------------------------------

import R from 'ramda';

import {
  DEFAULT_ACTION
} from '../etc/constants';

import twimlResponse from './twiml';


/**
 * Creates a new call instance based on the provided call structure. Provides
 * methods to advance through the call based on user input.
 *
 * @param {object} params
 * @param {string} params.callId - Twilio Call SID.
 * @param {string} params.fromNumber - Inbound caller ID.
 * @param {array}  params.call - Call sequence.
 *
 * @return {object}
 */
export default function createCall ({call, callId, fromNumber, toNumber} = {}) {
  if (!call || !is(Array, call)) {
    throw new Error('createCall requires params.call be of type "Array".');
  }

  if (!callId) {
    throw new Error('createCall requires params.callId be set.');
  }

  if (!fromNumber) {
    throw new Error('createCall requires params.fromNumber be set.');
  }

  if (!toNumber) {
    throw new Error('createCall requires params.toNumber be set.');
  }


  /**
   * Index pointing to the current segment in the call structure.
   *
   * @type {number}
   */
  let curSegment = 0;


  /**
   * Whether the call is "paused" (waiting for user input) or not.
   *
   * @type {boolean}
   */
  let paused = false;


  /**
   * Whether the call is completed or not.
   *
   * @type {array}
   */
  let completed = false;


  /**
   * Reference to a callback that can be invoked to resume the call and set the
   * new call structure.
   *
   * @type {function}
   */
  let resumeCallback = null;


  /**
   * Reference to the current TwiML response instance.
   *
   * @type {object}
   */
  const twiml = twimlResponse(fromNumber, toNumber);


  /**
   * @private
   *
   * Advances the call until a terminal TwiML segment is reached. Returns the
   * compiled chunk of TwiML.
   *
   * @return {array} - List of TwiML chunks.
   */
  function getNextSegment () {
    // If the call is completed, it cannot be advanced.
    if (completed) {
      throw new Error('Trying to advance a completed call.');
    }

    let result;
    let terminal;
    const segment = call[curSegment];

    if (segment) {
      // Use the segment to generate TwiML.
      const [command, params] = segment;

      result = twiml[command](params);
      terminal = result.terminal;
    } else {
      // Otherwise, we have reached the end of the call or an invalid function
      // was provided in the call structure. Use the default action to generate
      // TwiML and set terminal and completed to true.
      result = twiml[DEFAULT_ACTION]();
      terminal = true;
      completed = true;
    }

    if (terminal) {
      // If we have a terminal chunk that has also provided a resume handler,
      // pause the call and set the resume callback.
      if (result.onResume) {
        paused = true;
        resumeCallback = result.onResume;
      } else {
        // If we have a terminal chunk without a resume handler, increment the
        // index.
        curSegment++;
      }

      // Because we have reached a terminal segment (ie: user input is required
      // to continue) render the current TwiML.
      const twimlDocument = twiml.render();

      // Clear all generated TwiML.
      twiml.reset();

      // Then, return the full TwiML document.
      return twimlDocument;
    }

    // Otherwise, if we have not reached a terminal segment, increment the
    // segment index and recurse to get the next TwiML chunk.
    curSegment++;

    return getNextSegment();
  }


  /**
   * @private
   *
   * Resumes the call by passing the provided arguments to the resume callback,
   * which will return a new call structure to parse.
   *
   * @param {object} resumeArgs - Argument to pass to resume callback.
   */
  function resume (resumeArgs) {
    if (!resumeCallback) {
      throw new Error('Call paused, but no resume handler was set.');
    }

    // Set the call structure to the return value of the resume callback.
    call = resumeCallback(resumeArgs);

    // Reset the segment index.
    curSegment = 0;

    // Unpause the call.
    paused = false;
  }


  /**
   * @return {boolean} - Whether the call is paused.
   */
  function isPaused () {
    return paused;
  }


  /**
   * @return {boolean} - Whether the call is completed.
   */
  function isCompleted () {
    return completed;
  }


  /**
   * Advances the call by optionally resuming it with the provided params and
   * then returning the next TwiML document.
   *
   * @param {object} - Params to pass to the resume callback.
   * @return {string} - Compiled TwiML chunk, if applicable.
   */
  function advance (params = {}) {
    if (paused) {
      resume(params);
    }

    // This will recurse until a terminal chunk or the end of a branch is
    // reached, ultimately returning a complete TwiML document.
    return getNextSegment();
  }


  return {
    advance,
    isCompleted,
    isPaused
  };
}
