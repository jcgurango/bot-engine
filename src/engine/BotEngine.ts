import { ISessionManager, IContext, IIncomingMessage, IFlow, IStep, IChannel, IHasCallback } from '../types/interfaces';
import InMemorySessionManager from './InMemorySessionManager';
import { IncomingMessageType, OutgoingMessageType } from '../types/enums';

export const DEFAULT_RESPONSE_MATCHER = (message: IIncomingMessage, step: IStep, context: IContext) => {
    // Issue callbacks based on matching.
    return step.responses.find(({ type, payload, text }) => (
        type === message.type && (
            (type !== IncomingMessageType.PLAINTEXT || text === message.text || text === '*')
            && payload === message.payload
        )
    ));
};

export default class BotEngine {
    private session: ISessionManager;
    private flows: IFlow[];
    private channels: IChannel[];
    public defaultFlow: IFlow;
    private stopCallbacks: Function[];

    public responseMatcher: (message: IIncomingMessage, step: IStep, context: IContext) => (IIncomingMessage & IHasCallback) | undefined;

    constructor(session: ISessionManager, defaultFlow: IFlow, responseMatcher = DEFAULT_RESPONSE_MATCHER) {
        if (session) {
            this.session = session;
        } else {
            // Create an in-memory session manager by default, if none is provided.
            this.session = new InMemorySessionManager();
        }

        // Create an array of flows.
        this.flows = [];

        // Create an array of channels.
        this.channels = [];

        // Register the default flow.
        this.defaultFlow = defaultFlow;

        // Create an array of callbacks.
        this.stopCallbacks = [];

        // Register the response matcher.
        this.responseMatcher = responseMatcher;
    }

    private async callStep(newStep: IStep, context: IContext) {
        let nextStep = newStep;

        while (nextStep.callback) {
            const renderedStep = await nextStep.callback(context);
            nextStep = {
                ...nextStep,
                ...renderedStep,
                callback: renderedStep && renderedStep.callback,
            };
        }

        return nextStep;
    }

    async gotoStep(context: IContext, stepName: String): Promise<IStep> {
        // Find the new step.
        const flowName = await context.session.get('currentFlow');
        const currentFlow = (flowName && this.flows.find(({ id }) => id === flowName))
            || (flowName === this.defaultFlow.id && this.defaultFlow);
        const newStep = currentFlow && stepName && currentFlow.steps.find(({ id }) => id === stepName);

        if (!newStep) {
            throw new Error(`Unknown step ${stepName} in ${flowName}`);
        }

        return await this.callStep(newStep, context);
    }

    async startFlow(context: IContext, newFlow: IFlow, stepName?: String) {
        await context.session.set('currentFlow', newFlow.id);
        return await this.gotoStep(context, stepName || newFlow.defaultStep);
    }

    async startFlowByName(context: IContext, flowName: String, stepName?: String) {
        // Find the flow.
        const newFlow = this.flows.find(({ id }) => id === flowName);

        if (!newFlow) {
            throw new Error(`Flow ${flowName} not found.`);
        }

        return this.startFlow(context, newFlow, stepName);
    }

    async endFlow(context: IContext) {
        await context.session.set('currentFlow', null);
        await context.session.set('stepName', null);
        return null;
    }

    findFlowById(id: String) {
        if (id === this.defaultFlow.id) {
            return this.defaultFlow;
        }

        return this.flows.find(({ id }) => id === id);
    }

    async processMessage(chatId: String, message: IIncomingMessage): Promise<IStep | null> {
        // Retrieve the session for the given ID.
        const session = await this.session.getSessionStore(chatId);

        const flowName = await session.get('currentFlow');
        const currentFlow = flowName && this.findFlowById(flowName);
        const stepName = await session.get('stepName') || (currentFlow && currentFlow.defaultStep);
        const currentStep = currentFlow && stepName && currentFlow.steps.find(({ id }) => id === stepName);

        // Create a context object.
        const context: IContext = {
            engine: this,
            currentMessage: message,
            flowName,
            stepName,
            currentFlow,
            currentStep: currentStep,
            session,
            gotoStep: (stepName) => this.gotoStep(context, stepName),
            startFlow: (flowName, stepName?: String) => this.startFlowByName(context, flowName, stepName),
            endFlow: () => this.endFlow(context),
        };

        if (context.currentStep) {
            context.currentStep = await this.callStep(context.currentStep, context);
        }

        // Retrieve the current flow for the session.
        if (context.currentFlow) {
            if (context.currentStep) {
                // Issue callbacks based on matching.
                const response = this.responseMatcher(message, context.currentStep, context);

                if (response) {
                    return response.callback(context);
                } else {
                    // Didn't understand this response.
                    return {
                        messages: [
                            {
                                type: OutgoingMessageType.PLAINTEXT,
                                payload: 'Sorry, I didn\'t understand that.',
                            },
                            ...context.currentStep.messages,
                        ],
                        ...context.currentStep,
                    };
                }
            } else {
                // Flow hasn't begun yet.
                return await this.gotoStep(context, context.currentFlow.defaultStep);
            }
        }

        // Default response.
        return this.startFlow(context, this.defaultFlow);
    }

    register(channel: IChannel) {
        this.channels.push(channel);
    }

    registerFlow(flow: IFlow) {
        this.flows.push(flow);
    }
    
    start() {
        this.channels.forEach((channel) => {
            const callback = channel.start(this);

            if (callback) {
                this.stopCallbacks.push(callback);
            }
        });
    }

    stop() {
        this.stopCallbacks.forEach((stop) => {
            stop();
        });
    }
}