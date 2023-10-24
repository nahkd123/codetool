export interface CommandBranch {
    [x: string]: CommandLeaf;
}

export type CommandExecutor = (args: string[]) => any;
export type CommandLeaf = CommandBranch | CommandExecutor;

export class CommandError extends Error {
}