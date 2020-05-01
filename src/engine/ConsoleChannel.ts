import * as readline from 'readline';
import { IChannel, IStep } from '../types/interfaces';
import { IncomingMessageType, OutgoingMessageType } from '../types/enums';
import BotEngine from './BotEngine';

export default class ConsoleChannel implements IChannel {
    private respond(step: IStep | null) {
        console.log('Response:');

        if (step) {
            step.messages.forEach((message) => {
                if (message.type === OutgoingMessageType.PLAINTEXT) {
                    console.log(message.payload);
                } else {
                    console.log(JSON.stringify(message, null, '\t'));
                }
            });

            console.log('');
            console.log('Possible responses:');

            step.responses.forEach((response) => {
                if (response.type === IncomingMessageType.PLAINTEXT) {
                    console.log(response.text);
                } else {
                    console.log(JSON.stringify(response, null, '\t'));
                }
            });
        }
    }

    start(engine: BotEngine): void {
        (async () => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });

            console.log('Initialized');
    
            while (true) {
                const response: IStep | null = await new Promise((resolve) => {
                    rl.question('> ', (answer) => {
                        if (answer === 'exit') {
                            process.exit();
                        }

                        resolve(engine.processMessage(process.pid.toString(), {
                            type: IncomingMessageType.PLAINTEXT,
                            text: answer,
                        }));
                    });
                });

                this.respond(response);
            }
        })();
    }
}
