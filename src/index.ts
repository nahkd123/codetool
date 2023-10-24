import { CommandBranch, CommandError, CommandLeaf } from "./tools/cli-base";
import { cliFiller } from "./tools/filler";

const tree: CommandBranch = {
    filler: cliFiller
};

const args = process.argv.splice(2);

function recursiveGet(path: string[], tree: CommandLeaf) {
    if (path.length == 0 || typeof tree == "function") return tree;
    const next = path.shift();

    if (next) {
        if (typeof tree == "function") throw new CommandError(`Command '${next}' does not exists in current subcommand!`);
        let nextLeaf = tree[next];
        if (!nextLeaf) throw new CommandError(`Subcommand '${next}' does not exists in current subcommand!`);
        
        try {
            return recursiveGet(path, nextLeaf);
        } catch (e) {
            throw new CommandError(`Subcommand resolution '${next}' failed!`, { cause: e });
        }
    }

    return tree;
}

(async function() {
    try {
        let argsClone = [...args];
        let leaf = recursiveGet(argsClone, tree);
        if (typeof leaf == "function") await leaf(argsClone);
        else {
            let branch = leaf as CommandBranch;
            console.log(`Listing all subcommands:`);
            
            function printHelp(branch: CommandBranch) {
                console.group();
                for (let subcommand in branch) {
                    console.log(subcommand);
                    if (typeof branch[subcommand] != "function") printHelp(branch[subcommand] as any);
                }
                console.groupEnd();
            }
    
            printHelp(branch);
        }
    } catch (e) {
        console.error(`An error occured while executing command '${args.join(" ")}':`);
    
        function printError(e: any) {
            console.group();
            if (e instanceof CommandError) {
                console.error(e.message);
                if (e.cause) printError(e.cause);
            } else {
                console.error(e);
            }
            console.groupEnd();
        }
    
        printError(e);
        process.exit(1);
    }
})();