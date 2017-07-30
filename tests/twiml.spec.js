import twimlResponse from '../src/lib/twiml';

import {
  DEFAULT_TIMEOUT,
  TWILIO_ENDPOINT
} from '../src/etc/constants';

import {
  assertXmlContains
} from './helpers';


const FROM_NUMBER = '415-555-1111';
const TWILIO_PHONE_NUMBER = '415-555-3333';


describe('TwiML Responses', () => {
  let twiml;

  beforeEach(() => {
    twiml = new twimlResponse(FROM_NUMBER, TWILIO_PHONE_NUMBER);
  });

  describe('forwardCall', () => {
    it('should create the correct TwiML', () => {
      const toNumber = '415-555-4444';

      twiml.forwardCall({
        value: toNumber
      });

      assertXmlContains(`
        <Dial action="${TWILIO_ENDPOINT}"
          callerId="${FROM_NUMBER}"
          method="GET"
          timeout="${DEFAULT_TIMEOUT}">
          ${toNumber}
        </Dial>
      `, twiml.render());
    });

    describe('not providing a value', () => {
      it('should throw an error', () => {
        expect(() => {
          twiml.forwardCall();
        }).toThrow();
      });
    });
  });

  describe('sendSms', () => {
    const toNumber = '415-555-4444';
    const message = 'foo';

    it('should create the correct TwiML', () => {
      twiml.sendSms({
        to: toNumber,
        value: message
      });

      assertXmlContains(`
        <Sms from="${TWILIO_PHONE_NUMBER}"
          to="${toNumber}">
          ${message}
        </Sms>
      `, twiml.render());
    });

    describe('not providing a value', () => {
      it('should throw an error', () => {
        expect(() => {
          twiml.sendSms({
            to: toNumber
          });
        }).toThrow('Did not receive a value');
      });
    });

    describe('not providing a "to" number', () => {
      it('should throw an error', () => {
        expect(() => {
          twiml.sendSms({
            value: message
          });
        }).toThrow('Did not receive a "to" number');
      });
    });
  });

  describe('say', () => {
    it('should create the correct TwiML', () => {
      const message = 'foo';

      twiml.say({
        value: message
      });

      assertXmlContains(`
        <Say language="en-GB"
          voice="woman">
          ${message}
        </Say>
      `, twiml.render());
    });

    describe('not providing a value', () => {
      it('should throw an error', () => {
        expect(() => {
          twiml.say();
        }).toThrow();
      });
    });
  });

  describe('sendDigits', () => {
    it('should create the correct TwiML', () => {
      const digits = '42';

      twiml.sendDigits({
        value: digits
      });

      assertXmlContains(`
        <Play digits="${digits}"></Play>
      `, twiml.render());
    });

    describe('not providing a value', () => {
      it('should throw an error', () => {
        expect(() => {
          twiml.sendDigits();
        }).toThrow();
      });
    });
  });

  describe('gatherDigits', () => {
    const digits = '42';

    it('should create the correct TwiML', () => {
      twiml.gatherDigits({
        [digits]: [],
        default: []
      });

      assertXmlContains(`
        <Gather action="${TWILIO_ENDPOINT}"
          method="GET"
          numDigits="${digits.length}"
          timeout="${DEFAULT_TIMEOUT}">
        </Gather>
      `, twiml.render());
    });

    describe('not providing a "default" branch', () => {
      it('should throw an error', () => {
        expect(() => {
          twiml.gatherDigits({
            [digits]: []
          });
        }).toThrow();
      });
    });
  });

  describe('play', () => {
    it('should create the correct TwiML', () => {
      const file = '/foo/bar.baz';

      twiml.play({
        value: file
      });

      assertXmlContains(`
        <Play>${file}</Play>
      `, twiml.render());
    });

    describe('not providing a value', () => {
      it('should throw an error', () => {
        expect(() => {
          twiml.play();
        }).toThrow();
      });
    });
  });

  describe('hangUp', () => {
    it('should create the correct TwiML', () => {
      twiml.hangUp();

      assertXmlContains(`
        <Pause length="1"></Pause>
        <Hangup></Hangup>
      `, twiml.render());
    });
  });
});
