const includes = new Map();
//const preprocessorSymbols = /#([^\s]*)(\s*)/gm
const PRAGMA_REGEX = /#pragma (\w+)/;
class SimpleCondition {
    #condition;
    //#conditionIsTrue: boolean;
    constructor(condition /*, conditionIsTrue: boolean*/) {
        this.#condition = condition;
        //this.#conditionIsTrue = conditionIsTrue;
    }
    isTrue() {
        return true;
    }
}
class TrueCondition {
    isTrue() {
        return true;
    }
}
let branchId = 0;
class Branch {
    #condition;
    //#branchA: Branch;
    //#branchB: Branch | null = null;
    //#condition: string | null;
    //#conditionIsTrue: boolean;
    #lines = [];
    #currentSubBranch = null;
    branchId = String(branchId++);
    constructor(condition) {
        this.#condition = condition;
        //this.#conditionIsTrue = conditionIsTrue;
    }
    addLine(line) {
        const preprocessorSymbols = /#([^\s]*)(\s*)/gm;
        // If we are in a subbranch, pass the line to the subbranch
        if (this.#currentSubBranch) {
            if (this.#currentSubBranch.addLine(line)) {
                return true;
            }
        }
        const matchedSymbol = preprocessorSymbols.exec(line);
        if (matchedSymbol) {
            switch (matchedSymbol[1]) {
                case 'ifdef':
                    this.#currentSubBranch = new Branch(new SimpleCondition(matchedSymbol[2]));
                    this.#lines.push(this.#currentSubBranch);
                    return true;
                case 'endif':
                    if (this.#currentSubBranch) {
                        this.#currentSubBranch = null;
                        return true;
                    }
                    else {
                        return false;
                    }
                default:
                    // This is probably an error
                    this.#lines.push(line);
                    return true;
            }
        }
        else {
            if (this.#currentSubBranch) {
                return this.#currentSubBranch.addLine(line);
            }
            else {
                this.#lines.push(line);
                return true;
            }
        }
    }
    out(out = []) {
        for (const line of this.#lines) {
            if (typeof line == 'string') {
                out.push(line);
            }
            else {
                line.out(out);
            }
        }
        return out;
    }
}
function addWgslInclude(name, source) {
    includes.set(name, source);
}
function preprocessWgsl(source, defines = new Map()) {
    const outArray = expandIncludes(source);
    const result = preprocess(outArray);
    return result.join('\n');
}
function preprocess(lines, defines) {
    const branch = new Branch(new TrueCondition());
    for (let i = 0, l = lines.length; i < l; ++i) {
        //const line = lines[i]!;
        branch.addLine(lines[i]);
        /*
        const matchedSymbols = line.matchAll(preprocessorSymbols);
        for (const matchedSymbol of matchedSymbols) {
            console.info(line, matchedSymbol);
        }
        */
    }
    return branch.out();
}
function expandIncludes(source) {
    const lines = source.split('\n');
    const allIncludes = new Set();
    let compileRow = 1;
    const outArray = [];
    const sourceRowToInclude = new Map();
    for (let i = 0; i < lines.length; ++i) {
        const line = lines[i];
        if (line.trim().startsWith('#include')) {
            const includeName = line.replace('#include', '').trim();
            const include = getInclude(includeName, sourceRowToInclude, compileRow, new Set(), allIncludes);
            if (include) {
                sourceRowToInclude.set(compileRow, [includeName, include.length]);
                outArray.push(...include);
                compileRow += include.length;
                include.length;
            }
            else {
                if (include === undefined) {
                    console.error(`Include not found : ${line}`);
                }
            }
        }
        else {
            outArray.push(line);
            ++compileRow;
        }
    }
    return outArray;
}
function getInclude(includeName, sourceRowToInclude, compileRow = 0, recursion = new Set(), allIncludes = new Set()) {
    //this.#includes.add(includeName);
    if (recursion.has(includeName)) {
        console.error('Include recursion in ' + includeName);
        return null;
    }
    recursion.add(includeName);
    const include = includes.get(includeName);
    if (include == undefined) {
        return null;
    }
    const includeLineArray = include.trim().split('\n');
    includeLineArray.unshift(''); //Add an empty line to insure nested include won't occupy the same line #
    const outArray = [];
    for (let i = 0, l = includeLineArray.length; i < l; ++i) {
        const line = includeLineArray[i];
        if (line.trim().startsWith('#include')) {
            const includeName = line.replace('#include', '').trim();
            const include = getInclude(includeName, sourceRowToInclude, compileRow + i, recursion, allIncludes);
            if (include) {
                sourceRowToInclude.set(compileRow, [includeName, include.length]);
                outArray.push(...include);
                compileRow += include.length;
            }
            continue;
        }
        if (line.trim().startsWith('#pragma')) {
            const result = PRAGMA_REGEX.exec(line);
            if (result && result[1] == 'once') {
                if (allIncludes.has(includeName)) {
                    return null;
                }
                continue;
            }
        }
        outArray.push(line);
        ++compileRow;
    }
    allIncludes.add(includeName);
    return outArray;
}

export { addWgslInclude, preprocessWgsl };
