import R from 'ramda';
import req from 'supertest';
import GateBot from '../src';

import {
  TWILIO_ENDPOINT
} from '../src/etc/constants';

import {
  assertXmlContains
} from './helpers';


const FROM_NUMBER = '415-555-1111';
const PRIMARY_PHONE_NUMBER = '415-555-2222';
const TWILIO_PHONE_NUMBER = '415-555-3333';


/**
 * Creates a gate bot instance.
 *
 * @param  {object} data - Mock data to use.
 * @return {object}
 */
function createApp (data) {
  const TWILIO_ACCOUNT_SID = '1';
  const TWILIO_APPLICATION_SID = '2';

  const app = GateBot({
    logLevel: 'error',
    primaryPhoneNumber: PRIMARY_PHONE_NUMBER,
    twilioPhoneNumber: TWILIO_PHONE_NUMBER,
    twilioAccountSid: TWILIO_ACCOUNT_SID,
    twilioApplicationSid: TWILIO_APPLICATION_SID,
    callDataFn (callerId, cb) {
      if (data[callerId]) {
        cb(undefined, data[callerId]);
      } else {
        cb(undefined, null);
      }
    }
  }).server;


  /**
   * Simulates a request to gate bot coming from Twilio.
   *
   * @param  {object} params
   * @return {promise}
   */
  const request = params => req(app)
    .get(TWILIO_ENDPOINT)
    .set('Accept', 'application/xml')
    .set('X-Forwarded-Proto', 'https')
    .query(Object.assign({
      AccountSid: TWILIO_ACCOUNT_SID,
      ApplicationSid: TWILIO_APPLICATION_SID,
      CallSid: '1',
      From: FROM_NUMBER
    }, params));


  return {
    request
  };
}


describe('GateBot', () => {
  let app;

  describe('Hello World', () => {
    const value = 'Hello world.';

    const call = [
      ['say', {value}]
    ];

    const database = {
      [FROM_NUMBER]: call
    };

    beforeAll(() => {
      app = createApp(database);
    });

    it('should say "Hello world."', () => {
      return app.request()
      .expect(200)
      .then(R.prop('text'))
      .then(assertXmlContains(`
        <Say language="en-GB"
          voice="woman">
          ${value}
        </Say>
        <Pause length="1"></Pause>
        <Hangup></Hangup>
      `));
    });
  });


  describe('Call Data Not Found', () => {
    beforeAll(() => {
      app = createApp({});
    });

    it('should forward the call to the primary phone number', () => {
      return app.request()
      .expect(200)
      .then(R.prop('text'))
      .then(assertXmlContains(`
        <Dial action="${TWILIO_ENDPOINT}"
          callerId="${FROM_NUMBER}"
          method="GET"
          timeout="20">
          ${PRIMARY_PHONE_NUMBER}
        </Dial>
      `));
    });
  });


  describe('Invalid requests', () => {
    it('should return a 400 error', () => {
      return app.request({
        ApplicationSid: false,
        AccountSid: false
      })
      .expect(400);
    });
  });


  describe('Send Digits & Hang Up', () => {
    const digits = '42';

    const call = [
      ['sendDigits', {
        value: digits
      }]
    ];

    const database = {
      [FROM_NUMBER]: call
    };

    beforeAll(() => {
      app = createApp(database);
    });

    it('should say "Hello world."', () => {
      return app.request({
        From: FROM_NUMBER
      })
      .expect(200)
      .then(R.prop('text'))
      .then(assertXmlContains(`
        <Play digits="${digits}"></Play>
        <Pause length="1"></Pause>
        <Hangup></Hangup>
      `));
    });
  });


  describe('Gather Digits', () => {
    const defaultResponse = 'foo';

    const sequence1 = '123';
    const response1 = `You entered ${sequence1}.`;

    const longSequence = '613731214614354234123';

    const call = [
      ['gatherDigits', {
        [sequence1]: [
          ['say', {
            value: response1
          }]
        ],
        [longSequence]: [],
        default: [
          ['say', {
            value: defaultResponse
          }]
        ]
      }]
    ];

    const database = {
      [FROM_NUMBER]: call
    };

    describe('Entering a matching sequence', () => {
      beforeAll(() => {
        app = createApp(database);
      });

      it('should send a gather instruction', () => {
        return app.request()
        .expect(200)
        .then(R.prop('text'))
        .then(assertXmlContains(`
          <Gather action="/twilio" method="GET" numDigits="${longSequence.length}" timeout="20"></Gather>
        `));
      });

      it('should follow the branch corresponding to the sequence entered', () => {
        return app.request({
          Digits: sequence1
        })
        .expect(200)
        .then(R.prop('text'))
        .then(assertXmlContains(`
          <Say language="en-GB" voice="woman">${response1}</Say>
          <Pause length="1"></Pause>
          <Hangup></Hangup>
        `));
      });
    });


    describe('Not entering a matching sequence', () => {
      beforeAll(() => {
        app = createApp(database);
      });

      it('should send a gather instruction', () => {
        return app.request()
        .expect(200)
        .then(R.prop('text'))
        .then(assertXmlContains(`
          <Gather action="/twilio"
            method="GET"
            numDigits="${longSequence.length}"
            timeout="20">
          </Gather>
        `));
      });

      it('should follow the branch corresponding to the sequence entered', () => {
        return app.request({
          Digits: '555'
        })
        .expect(200)
        .then(R.prop('text'))
        .then(assertXmlContains(`
          <Say language="en-GB"
            voice="woman">
            ${defaultResponse}
          </Say>
          <Pause length="1"></Pause>
          <Hangup></Hangup>
        `));
      });
    });
  });
});
