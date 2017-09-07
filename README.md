[![][travis-img]][travis-url] [![][david-img]][david-url] [![][codacy-img]][codacy-url] [![][cc-img]][cc-url] [![][xo-img]][xo-url] [![][npm-img]][npm-url]

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
   - Immediately dial the digit or sequence of digits to open the door/gate for the guest
   - Send the resident an SMS letting them know someone has arrived.

This process is completely asynchronous; the resident need not answer their phone and guests are never needlessly delayed or confused.

## Setup

Doorman is an HTTP server. To use it, you will need to install it someplace where HTTP servers like to live, such as [Heroku](https://heroku.com), [Now](https://zeit.co/now), [et. al](https://github.com/anaibol/awesome-serverless#hosting-and-code-execution-in-the-cloud).

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
|`assetPath`|Path to a folder containing any static assets (such as audio files) you wish to serve.|
|`port`|Which port to listen on. This is typically configured automatically by providers like Heroku. Default: `8080`|
|`primaryPhoneNumber`|If Doorman can't find a matching key in its data store for an incoming call, it will forward the call to this number.|
|`twilioPhoneNumber`|Your Twilio phone number.|
|`twilioAccountSid`|Twilio Account SID.|
|`twilioApplicationSid`|Twilio Application SID.|
|`callDataFn`|This function will be invoked by Doorman and will be passed the current incoming caller ID and a callback. The callback has the signature `(err, data)` and should be invoked and passed the call flow data matching the provided caller ID.|
|`logLevel`|How much logging information to display. Uses [npmlog](https://github.com/npm/npmlog/blob/541407008c509755255a4819606e7916d26a77f5/log.js#L296-L304). (Default: `info`)|

### Examples

Here is an example using Redis as a data store:

```js
import { resolve } from 'path';
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
  assetPath: resolve(__dirname, 'assets'),
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
import { resolve } from 'path';
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
  assetPath: resolve(__dirname, 'assets'),
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

Doorman is programmed using JSON. Each key in Doorman's data-store represents an inbound caller ID, and each value represents how Doorman should handle calls from that number. Doorman supports numerous directives which can be composed to construct a call flow.

The basic structure call flow is:

```js
[
  ["directiveName", { /* Directive options. */ }],
  ["directiveName", { /* Directive options. */ }],
  ["directiveName", { /* Directive options. */ }]
]
```

### Directives

#### `forwardCall`

Forwards the call to the provided number.

|Option|Type|Description|
|---|---|---|
|`value`|`String`|Number to forward to.|

**Example:**

```json
[
  ["forwardCall", {
    "value": "+14155551212"
  }]
]
```

#### `sendSms`

Sends a text message.

|Option|Type|Description|
|---|---|---|
|`value`|`String`|Body of the message.|
|`to`|`String`|Number to send the message to.|

**Example:**

```json
[
  ["sendSms", {
    "to": "+14155551212"
    "value": "Hello, world!"
  }]
]
```

#### `say`

Uses Twilio's text-to-speech feature to speak the provided message. See the [Twilio \<Say\> documentation](https://www.twilio.com/docs/api/twiml/say) for allowed values.

|Option|Type|Description|
|---|---|---|
|`value`|`String`|Message to speak.|
|`[voice='woman']`|`String`|Voice to use.|
|`[language='en-GB']`|`String`|Language to use.|

**Example:**

```json
[
  ["say", {
    "value": "Greetings!"
  }]
]
```

#### `sendDigits`

Sends a sequence of DTMF tones for the provided digit or digits.

|Option|Type|Description|
|---|---|---|
|`value`|`String`|Digit or digit sequence.|

**Example:**

```json
[
  ["sendDigits", {
    "value": "1234"
  }]
]
```

#### `gatherDigits`

Pauses the call and waits for the callee to enter a sequence of digits. The call will then proceed down the branch matching the sequence entered. A `default` branch must be provided to handle cases where the callee does not enter a matching sequence.

|Option|Type|Description|
|---|---|---|
|`branches`|`Object`|Object mapping possible responses to nested Doorman JSON blobs.

**Example:**

```js
[
  ["gatherDigits", {
    "123": [
      ["directiveName", { /* Directive options. */ }]
    ],
    "456": [
      ["directiveName", { /* Directive options. */ }]
    ],
    "default": [
      ["directiveName", { /* Directive options. */ }]
    ]
  }]
]
```

#### `play`

Instructs Twilio to play the audio file at the provided URL. To ensure Doorman serves static assets correctly, configure the `assetPath` option to point to the folder containing your audio files.

|Option|Type|Description|
|---|---|---|
|`value`|`String`|Path to the audio file (relative to Doorman's web root) to play.|

**Example:**

```json
[
  ["play", {
    "value": "assets/foo.mp3"
  }]
]
```

#### `hangUp`

Ends the call.

**Example:**

```json
[
  ["hangUp"]
]
```

### Examples

In the following examples, let's assume we are working with an access control system that has the phone number `+14155551111`, a resident who has a cell number `+14155552222`, and that residents must enter the digit `9` to grant access to guests. Note that if using a data store such as Redis, we would store the access control system's caller ID as a key and the call flow as a value. These examples use a plain object for clarity.

In this first example, we will program Doorman to immediately grant access to guests, then send an SMS to the resident.

```json
{
  "+14155551111": [
    ["sendDigits", {
      "value": "9"
    }],
    ["sendSms", {
      "to": "+14155552222",
      "value": "A guest has arrived!"
    }]
  ]
}
```

Next, let's prompt the guest for a simple passcode (`123`) and forward the call to the resident if an incorrect passcode is entered:

```json
{
  "+14155551111": [
    ["say", {
      "value": "Please enter your passcode."
    }],
    ["gatherDigits", {
      "123": [
        ["say", {
          "value": "Access granted!"
        }],
        ["sendDigits", {
          "value": "9"
        }],
        ["sendSms", {
          "to": "+14155552222",
          "value": "A guest has arrived!"
        }]
      ],
      "default": [
        ["forwardCall", {
          "value": "+14155552222"
        }]
      ]
    }]
  ]
}
```

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

[cc-img]: https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg?style=flat-square
[cc-url]: https://github.com/conventional-changelog/standard-version

[xo-img]: https://img.shields.io/badge/code_style-XO-f74c4c.svg?style=flat-square
[xo-url]: https://github.com/sindresorhus/xo

[npm-img]: https://img.shields.io/npm/v/@darkobits/doorman.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/@darkobits/doorman
