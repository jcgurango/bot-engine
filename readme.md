# @bot-engine/core
A simple chatbot engine focusing heavily on extensibility and stateless structure so it can be run Serverless. Written in TypeScript, but developed mainly for JS use.

Todo:
- [ ] NLU support
- [X] Implement FB Messenger channel
- [ ] Plugin system

## Installation
Install via npm:

```
npm install --save @bot-engine/core
```

Install from source:

```
git clone https://www.github.com/jcgurango/bot-engine
cd bot-engine
npm install
npm run build
```

## Usage
To use the bot engine, you need two components: a channel (where messages will be received), and a session manager (where chat sessions will be stored). The package exposes two defaults useful for testing:

- **InMemorySessionManager**, which will store sessions in memory, and
- **ConsoleChannel**, which allows you to use the console as a way to interact with the bot.

## Connectors
- [@bot-engine/channel-messenger](https://github.com/jcgurango/bot-engine-channel-messenger)

### Examples
#### Simple Console Greeter Bot

```js
const {
    BotEngine,
    InMemorySessionManager,
    IncomingMessageType,
    OutgoingMessageType,
    ConsoleChannel,
} = require('@bot-engine/core');

const engine = new BotEngine(new InMemorySessionManager(), {
    id: 'default',
    defaultStep: 'default',
    steps: [
        {
            id: 'default',
            messages: [
                {
                    type: OutgoingMessageType.PLAINTEXT,
                    payload: 'Hello! I\'m a bot!',
                },
            ],
            responses: [
                {
                    type: IncomingMessageType.PLAINTEXT,
                    text: 'good bot',
                    callback: (context) => {
                        return context.gotoStep('kindness');
                    },
                },
                {
                    type: IncomingMessageType.PLAINTEXT,
                    text: '*',
                    callback: (context) => {
                        return context.gotoStep('indifference');
                    },
                },
            ],
        },
        {
            id: 'kindness',
            messages: [
                {
                    type: OutgoingMessageType.PLAINTEXT,
                    payload: 'You\'re very kind.',
                },
            ],
            responses: [],
            callback: (context) => {
                return context.endFlow();
            },
        },
        {
            id: 'indifference',
            messages: [
                {
                    type: OutgoingMessageType.PLAINTEXT,
                    payload: 'Ok.',
                },
            ],
            responses: [],
            callback: (context) => {
                return context.endFlow();
            },
        },
    ],
});

engine.register(new ConsoleChannel());
engine.start();
```

#### Messenger Bot Example
STUB