export interface Memory {
    id?: string;
    userId?: string;
    agentId?: string;
    createdAt?: number;
    content: {
        text: string;
        [key: string]: any;
    };
    roomId?: string;
    embedding?: number[];
    [key: string]: any;
}
export interface State {
    [key: string]: any;
}
export type HandlerCallback = (response: {
    text: string;
    [key: string]: any;
}) => Promise<any> | void;
export interface IAgentRuntime {
    [key: string]: any;
}
export interface ActionExample {
    user: string;
    content: {
        text: string;
        [key: string]: any;
    };
}
export interface Action {
    name: string;
    similes: string[];
    description: string;
    validate: (runtime: IAgentRuntime, message: Memory, state?: State) => Promise<boolean>;
    handler: (runtime: IAgentRuntime, message: Memory, state?: State, options?: any, callback?: HandlerCallback) => Promise<boolean>;
    examples: ActionExample[][];
}
export interface Plugin {
    name: string;
    description: string;
    actions: Action[];
    evaluators?: any[];
    providers?: any[];
    services?: any[];
}
