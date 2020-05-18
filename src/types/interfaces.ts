import { IncomingMessageType, OutgoingMessageType } from './enums';
import BotEngine from '../engine/BotEngine';

export interface ISessionManager {
    getSessionStore(id: String): Promise<ISessionStore>;
}

export interface ISessionStore {
    set(key: String, value: any): Promise<void>;
    get(key: String): Promise<any>;
}

export interface IIncomingMessage {
    type: IncomingMessageType;
    payload?: any;
    text?: String;
    metadata?: any;
}

export interface IHasCallback {
    callback(context: IContext): Promise<Partial<IStep> | null>;
}

export interface IOutgoingMessage {
    type: OutgoingMessageType;
    payload: any;
}

export interface IContext {
    engine: BotEngine;
    currentMessage: IIncomingMessage;
    flowName: String;
    stepName: String;
    currentFlow?: IFlow;
    currentStep?: IStep;
    gotoStep(stepName: String): Promise<IStep | null>;
    startFlow(flowName: String, stepName?: String): Promise<IStep | null>;
    endFlow(): Promise<IStep | null>;
    session: ISessionStore;
}

export interface IStep {
    id: String;
    messages: IOutgoingMessage[];
    responses: (IIncomingMessage & IHasCallback)[];
    responseMatcher?: (message: IIncomingMessage, step: IStep, context: IContext) => (IIncomingMessage & IHasCallback);
    callback?: ((context: IContext) => Promise<Partial<IStep>> | Partial<IStep> | null) | null;
}

export interface IFlow {
    id: String;
    defaultStep: String;
    steps: IStep[];
}

export interface IChannel {
    start(engine: BotEngine): Function | void;
}
