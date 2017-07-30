
/**
 * Default TwiML to generate if an action can't be found.
 *
 * @type {string}
 */
export const DEFAULT_ACTION = 'hangUp';


/**
 * Timeout used for <Gather> (user input), forwarding calls, etc.
 *
 * @type {number}
 */
export const DEFAULT_TIMEOUT = 20;


/**
 * Endpoint that will be registered with Express that Twilio should use to get
 * TwiML.
 *
 * @type {string}
 */
export const TWILIO_ENDPOINT = '/twilio';
