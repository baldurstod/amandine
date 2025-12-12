var WgslToken;
(function (WgslToken) {
    WgslToken[WgslToken["OpenParenthesis"] = 1] = "OpenParenthesis";
    WgslToken[WgslToken["CloseParenthesis"] = 2] = "CloseParenthesis";
    WgslToken[WgslToken["Add"] = 3] = "Add";
    WgslToken[WgslToken["Subtract"] = 4] = "Subtract";
    WgslToken[WgslToken["Multiply"] = 5] = "Multiply";
    WgslToken[WgslToken["Divide"] = 6] = "Divide";
    WgslToken[WgslToken["And"] = 7] = "And";
    WgslToken[WgslToken["Or"] = 8] = "Or";
    WgslToken[WgslToken["Not"] = 9] = "Not";
    WgslToken[WgslToken["Equal"] = 10] = "Equal";
    WgslToken[WgslToken["NotEqual"] = 11] = "NotEqual";
    WgslToken[WgslToken["Less"] = 12] = "Less";
    WgslToken[WgslToken["LessEqual"] = 13] = "LessEqual";
    WgslToken[WgslToken["Greater"] = 14] = "Greater";
    WgslToken[WgslToken["GreaterEqual"] = 15] = "GreaterEqual";
    //EOF,
})(WgslToken || (WgslToken = {}));
class AddOperator {
    isExpressionOperator = true;
    operators = [, ,];
    //operator2?: ExpressionOperator;
    arguments = 2;
    eval() {
        return Number(this.operators[0]?.eval()) + Number(this.operators[1]?.eval());
    }
}
class EqualOperator {
    isExpressionOperator = true;
    operators = [, ,];
    arguments = 2;
    eval() {
        //console.info('evaluating equal', this.operators)
        return this.operators[0]?.eval() == this.operators[1]?.eval();
    }
}
class LiteralOperator {
    isExpressionOperator = true;
    literalValue;
    operators = [];
    arguments = 1;
    constructor(value) {
        this.literalValue = value;
    }
    eval() {
        return this.literalValue;
    }
}
function parseExpression(expression) {
    const tokenIterator = getNextToken(expression);
    const operatorStack = [];
    const valueStack = [];
    for (const token of tokenIterator) {
        switch (token) {
            case WgslToken.Equal:
                operatorStack.push(new EqualOperator());
                break;
            default:
                valueStack.push(new LiteralOperator(token));
        }
    }
    //console.log(operatorStack, valueStack);
    let ope;
    while (ope = operatorStack.pop()) {
        for (let i = 0; i < ope.arguments; i++) {
            ope.operators[i] = valueStack.pop();
        }
        valueStack.push(ope);
    }
    return valueStack[0];
}
function evaluateExpression(expression) {
    //console.log(`evaluating expression <${expression}>`);
    const operator = parseExpression(expression);
    return operator?.eval();
}
function* getNextChar(wgsl) {
    wgsl.length;
    for (const c of wgsl) {
        yield c;
    }
    return null;
}
class TokenIterator /* implements Iterator<string, null, null>*/ {
    #charIterator;
    #stack = [];
    constructor(source) {
        this.#charIterator = getNextChar(source);
    }
    [Symbol.iterator]() {
        return {
            next: () => {
                if (this.#stack.length > 0) {
                    return { value: this.#stack.pop(), done: false };
                }
                const next = this.#charIterator.next().value;
                if (next !== null) {
                    return { value: next, done: false };
                }
                else {
                    return { value: null, done: true };
                }
            }
        };
    }
    ;
    /**
     * Peek the next character.
     */
    peek() {
        const next = this.#charIterator.next().value;
        if (next !== null) {
            this.#stack.push(next);
        }
        return next;
    }
    /**
     * Discard the next character
     * Only discard the characters obtained with peek()
     */
    discard() {
        if (this.#stack.length > 0) {
            --this.#stack.length;
        }
    }
}
function* getNextToken(source) {
    source.length;
    let literal = false;
    let literalString = '';
    const charIterator = new TokenIterator(source); //getNextChar(source);
    for (const char of charIterator) {
        if (literal && (char == '(' || char == ')' || char == '<' || char == '>' || char == ':' || char == ';' || char == ',' || char == '\n' || char == '\r' || char == '/' || char == ' ' || char == '\t')) {
            // Terminate and emit the string
            yield literalString;
            literal = false;
            literalString = '';
        }
        switch (char) {
            case '(':
                yield WgslToken.OpenParenthesis;
                break;
            case ')':
                yield WgslToken.CloseParenthesis;
                break;
            case '+':
                yield WgslToken.Add;
                break;
            case '-':
                yield WgslToken.Subtract;
                break;
            case '*':
                yield WgslToken.Multiply;
                break;
            case '/':
                yield WgslToken.Divide;
                break;
            case '&&':
                yield WgslToken.And;
                break;
            case '||':
                yield WgslToken.Or;
                break;
            case '!':
                yield WgslToken.Not;
                break;
            case '=':
                if (charIterator.peek() == '=') {
                    charIterator.discard();
                    yield WgslToken.Equal;
                }
                break;
            case '<':
                yield WgslToken.Less;
                break;
            case '<=':
                yield WgslToken.LessEqual;
                break;
            case '>':
                yield WgslToken.Greater;
                break;
            case '>=':
                yield WgslToken.GreaterEqual;
                break;
            case ' ':
            case '\t':
                break;
            default:
                literal = true;
                literalString += char;
                break;
        }
    }
    if (literalString != '') {
        yield literalString;
    }
}

const includes = new Map();
const PRAGMA_REGEX = /#pragma (\w+)/;
class ExpressionCondition {
    #expression;
    #result;
    constructor(expression) {
        this.#expression = expression;
    }
    isTrue(defines) {
        if (this.#result === undefined) {
            this.#result = evaluateExpression(this.#expression) == true;
        }
        return this.#result;
    }
}
class TrueCondition {
    isTrue() {
        return true;
    }
}
class FalseCondition {
    isTrue() {
        return false;
    }
}
class FlipCondition {
    #condition;
    constructor(condition) {
        this.#condition = condition;
    }
    isTrue(defines) {
        return !this.#condition.isTrue(defines);
    }
}
function replaceDefine(line, defines) {
    for (let [oldValue, newValue] of defines) {
        line = line.replace(new RegExp('\\b' + oldValue + '\\b', 'g'), newValue);
    }
    return line;
}
let branchId = 0;
class Branch {
    isBranch = true;
    condition;
    #lines = [];
    #currentSubBranch = null;
    branchId = String(branchId++);
    //readonly defines = new Map<string, string>();
    constructor(condition) {
        this.condition = condition;
    }
    addLine(line, defines) {
        const preprocessorSymbols = /^\s*#([^\s]*)\s*(.*)/g;
        // If we are in a subbranch, pass the line to the subbranch
        if (this.#currentSubBranch) {
            if (this.#currentSubBranch.addLine(line, defines)) {
                return true;
            }
        }
        const matchedSymbol = preprocessorSymbols.exec(line.line);
        if (matchedSymbol) {
            switch (matchedSymbol[1]) {
                // #define. defines are defined for the subsequent lines
                case 'define':
                    //console.info(this.condition);
                    if (this.condition.isTrue()) {
                        const defineSymbols = /#([^\s]*)\s*([^\s]*)\s*(.*)/g.exec(line.line);
                        if (defineSymbols && defineSymbols.length > 3) {
                            //console.info('add define', defineSymbols)
                            defines.set(defineSymbols[2], defineSymbols[3]);
                        }
                    }
                    return true;
                case 'undef':
                    if (this.condition.isTrue()) {
                        const undefSymbols = /#([^\s]*)\s*([^\s]*)/g.exec(line.line);
                        if (undefSymbols && undefSymbols.length > 2) {
                            //console.info('remove define', undefSymbols)
                            defines.delete(undefSymbols[2]);
                        }
                    }
                    return true;
                case 'ifdef':
                    //console.info(defines)
                    //this.#currentSubBranch = new Branch(new IsDefinedCondition(matchedSymbol[2]!));
                    if (defines.has(matchedSymbol[2])) {
                        this.#currentSubBranch = new Branch(new TrueCondition());
                    }
                    else {
                        this.#currentSubBranch = new Branch(new FalseCondition());
                    }
                    this.#lines.push(this.#currentSubBranch);
                    return true;
                case 'ifndef':
                    if (defines.has(matchedSymbol[2])) {
                        this.#currentSubBranch = new Branch(new FalseCondition());
                    }
                    else {
                        this.#currentSubBranch = new Branch(new TrueCondition());
                    }
                    this.#lines.push(this.#currentSubBranch);
                    return true;
                case 'if':
                    this.#currentSubBranch = new Branch(new ExpressionCondition(replaceDefine(matchedSymbol[2], defines)));
                    this.#lines.push(this.#currentSubBranch);
                    return true;
                case 'else':
                    if (this.#currentSubBranch) {
                        this.#currentSubBranch = new Branch(new FlipCondition(this.#currentSubBranch.condition));
                        this.#lines.push(this.#currentSubBranch);
                    }
                    else {
                        return false;
                    }
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
                return this.#currentSubBranch.addLine(line, defines);
            }
            else {
                line.line = replaceDefine(line.line, defines);
                this.#lines.push(line);
                return true;
            }
        }
    }
    out(out = [], defines) {
        if (!this.condition.isTrue(defines)) {
            return;
        }
        for (const line of this.#lines) {
            if (line.isBranch) {
                line.out(out, defines);
            }
            else {
                out.push(line);
            }
        }
    }
}
class WgslPreprocessor {
    static setWgslInclude(name, source) {
        includes.set(name, source);
    }
    static getWgslInclude(name) {
        return includes.get(name);
    }
    static preprocessWgsl(source, defines = new Map()) {
        const expandedArray = expandIncludes(source);
        const processedArray = preprocess(expandedArray, defines);
        const finalArray = [];
        for (const line of processedArray) {
            finalArray.push(line.line);
        }
        return finalArray.join('\n');
    }
    static getIncludeList(source, defines = new Map()) {
        const expandedArray = expandIncludes(source);
        const processedArray = preprocess(expandedArray, defines);
        const includes = new Set();
        function addInclude(line) {
            if (line.sourceName) {
                includes.add(line.sourceName);
            }
            if (line.includeLine) {
                addInclude(line.includeLine);
            }
        }
        for (const line of processedArray) {
            addInclude(line);
        }
        return includes;
    }
    static preprocessWgslLineMap(source, defines = new Map()) {
        const expandedArray = expandIncludes(source);
        const processedArray = preprocess(expandedArray, defines);
        return processedArray;
    }
}
function preprocess(lines, defines) {
    const branch = new Branch(new TrueCondition());
    const def = new Map(defines);
    for (let i = 0, l = lines.length; i < l; ++i) {
        branch.addLine(lines[i], def);
    }
    const result = [];
    branch.out(result, new Map(defines));
    return result;
}
function expandIncludes(source) {
    const lines = source.split('\n');
    const allIncludes = new Set();
    const outArray = [];
    for (let i = 0; i < lines.length; ++i) {
        const line = lines[i];
        if (line.trim().startsWith('#include')) {
            const includeName = line.replace('#include', '').trim();
            const include = getInclude(includeName, new Set(), allIncludes);
            if (include) {
                for (const includeLine of include) {
                    outArray.push({ line: includeLine.line, originLine: i, includeLine });
                }
                include.length;
            }
            else {
                if (include === undefined) {
                    console.error(`Include not found : ${line}`);
                }
            }
        }
        else {
            outArray.push({ line, originLine: i, });
        }
    }
    return outArray;
}
function getInclude(includeName, recursion = new Set(), allIncludes = new Set()) {
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
    //includeLineArray.unshift('');//Add an empty line to ensure nested include won't occupy the same line #
    const outArray = [];
    for (let i = 0, l = includeLineArray.length; i < l; ++i) {
        const line = includeLineArray[i];
        if (line.trim().startsWith('#include')) {
            const nestedIncludeName = line.replace('#include', '').trim();
            const include = getInclude(nestedIncludeName, recursion, allIncludes);
            if (include) {
                for (const includeLine of include) {
                    outArray.push({ sourceName: includeName, line: includeLine.line, originLine: i, includeLine });
                }
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
        outArray.push({ sourceName: includeName, line, originLine: i, });
    }
    allIncludes.add(includeName);
    return outArray;
}

export { WgslPreprocessor };
