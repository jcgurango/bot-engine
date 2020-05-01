import { ISessionManager, ISessionStore } from "../types/interfaces";

/**
 * A simple storage system that stores everything in-memory.
 */
export default class InMemorySessionManager implements ISessionManager {
    private store: any;

    constructor() {
        this.store = { };
    }

    async getSessionStore(id: String): Promise<ISessionStore> {
        const idString = id.toString();

        if (!this.store[idString]) {
            this.store[idString] = { };
        }

        return {
            get: async (key) => (this.store[idString][key.toString()] || null),
            set: async (key, value) => {
                this.store[idString][key.toString()] = value;
            },
        };
    }
}