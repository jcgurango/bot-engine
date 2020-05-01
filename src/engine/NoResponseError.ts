export default class NoResponseError extends Error {
    public code: String;

    constructor(message: string, code: String) {
        super(message);
        this.code = code;
    }
}
