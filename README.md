[![][travis-img]][travis-url] [![][david-img]][david-url] [![][codacy-img]][codacy-url] [![][xo-img]][xo-url] [![][npm-img]][npm-url]

# Doorman

Modern apartment communities equipped with access control systems typically work like this:

1. The resident gives their phone number (usually a cell) to their apartment community.
2. When a guest arrives, they dial a number associated with the resident in the directory.
3. The access control system calls the resident.
4. The resident enters a digit or sequence of digits to open the door/gate for the guest.

This is annoying because of its synchronicity; it requires the resident to answer their phone, call quality is often very poor, and if anything goes wrong both parties wind up confused and frustrated. Additionally, this process does not scale well; a resident hosting a large event, for example, would have to remain tethered to their phone, anxious that one missed call will delay and frustrate one of their guests.

**What if there was _a better way_?**

1. The resident gives their phone number (in this case, a [Twilio](https://twilio.com) number that points to a server running Doorman) to their apartment community.
2. When a guest arrives, they dial a number associated with the resident in the directory.
3. The access control system calls Doorman which, depending on configuration, will:
  3a. Immediately dial the digit or sequence of digits to open the door/gate for the guest.
  3b. Send the resident an SMS letting them know someone has arrived.

This process is completely asynchronous; the resident need not answer their phone and guests are never needlessly delayed or confused.

## Setup

Doorman is an HTTP server. To use it, you will need to install it someplace where HTTP servers like to live, such as [Heroku](https://heroku.com).

Next, you will need to set up a Twilio account. Create a [TwiML App](https://support.twilio.com/hc/en-us/articles/223180928-How-do-I-create-a-TwiML-App-) and configure the Voice URL to point to the server running Doorman.

Doorman is configured using a key/value store where each key is a phone number and each value is a JSON blob describing how Doorman should behave. You can use any key/value store you like, including an in-memory object, but Redis is ideal, and Heroku offers free nodes.

### Installation

Doorman is available on NPM:

```bash
> npm install --save @darkobits/doorman
```

### Configuration

Doorman has the following configurable options:

|Option|Description|
|---|---|
|`port`|Which port to listen on. Default: `8080`|
|`primaryPhoneNumber`|If Doorman doesn't recognize an incoming call, it will forward it to this number.|
|`twilioPhoneNumber`|Your Twilio phone number.|
|`twilioAccountSid`|Twilio Account SID.|
|`twilioApplicationSid`|Twilio Application SID.|
|`callDataFn`|This function will be invoked by Doorman and will be passed the current incoming caller ID and a callback.|
|`logLevel`|How much logging information to display. Uses [npmlog](https://github.com/npm/npmlog/blob/541407008c509755255a4819606e7916d26a77f5/log.js#L296-L304). (Default: `info`)|

### Examples

Here is an example using Redis as a data store:

```js
import redis from 'redis';
import doorman from '@darkobits/doorman';

const {
  PORT
  PRIMARY_PHONE_NUMBER,
  REDIS_URL,
  TWILIO_ACCOUNT_SID,
  TWILIO_APPLICATION_SID,
  TWILIO_PHONE_NUMBER,
} = process.env;


const client = new redis.createClient({
  url: REDIS_URL
});


doorman({
  port: PORT,
  primaryPhoneNumber: PRIMARY_PHONE_NUMBER,
  twilioPhoneNumber: TWILIO_PHONE_NUMBER,
  twilioAccountSid: TWILIO_ACCOUNT_SID,
  twilioApplicationSid: TWILIO_APPLICATION_SID,
  callDataFn: client.get.bind(client)
})
.startServer();
```

And here is an example using a basic in-memory data store:

```js
import doorman from '@darkobits/doorman';

const {
  PORT
  PRIMARY_PHONE_NUMBER,
  REDIS_URL,
  TWILIO_ACCOUNT_SID,
  TWILIO_APPLICATION_SID,
  TWILIO_PHONE_NUMBER,
} = process.env;

const data = {
  // ...
};


doorman({
  port: PORT,
  primaryPhoneNumber: PRIMARY_PHONE_NUMBER,
  twilioPhoneNumber: TWILIO_PHONE_NUMBER,
  twilioAccountSid: TWILIO_ACCOUNT_SID,
  twilioApplicationSid: TWILIO_APPLICATION_SID,
  callDataFn: (callerId, cb) => cb(undefined, data[callerId])
})
.startServer();
```

## Scripting Calls

...


## &nbsp;
<p align="center">
  <br>
  <img width="22" height="22" src="https://cloud.githubusercontent.com/assets/441546/25318539/db2f4cf2-2845-11e7-8e10-ef97d91cd538.png">
</p>

[travis-img]: https://img.shields.io/travis/darkobits/doorman.svg?style=flat-square
[travis-url]: https://travis-ci.org/darkobits/doorman

[david-img]: https://img.shields.io/david/darkobits/doorman.svg?style=flat-square
[david-url]: https://david-dm.org/darkobits/doorman

[codacy-img]: https://img.shields.io/codacy/coverage/1fbd5676e2df4ec78555c507a4d3d5a3.svg?style=flat-square
[codacy-url]: https://www.codacy.com/app/darkobits/doorman

[xo-img]: https://img.shields.io/badge/code_style-XO-f74c4c.svg?style=flat-square
[xo-url]: https://github.com/sindresorhus/xo

[npm-img]: https://img.shields.io/npm/v/@darkobits/doorman.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/@darkobits/doorman
