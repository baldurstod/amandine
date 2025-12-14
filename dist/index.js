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
var Precedence;
(function (Precedence) {
    Precedence[Precedence["Lowest"] = 0] = "Lowest";
    Precedence[Precedence["Ternary"] = 1] = "Ternary";
    Precedence[Precedence["LogicalOr"] = 2] = "LogicalOr";
    Precedence[Precedence["LogicalAnd"] = 3] = "LogicalAnd";
    Precedence[Precedence["Equality"] = 4] = "Equality";
    Precedence[Precedence["Relational"] = 5] = "Relational";
    Precedence[Precedence["Additive"] = 6] = "Additive";
    Precedence[Precedence["Multiplicative"] = 7] = "Multiplicative";
    Precedence[Precedence["Function"] = 8] = "Function";
    Precedence[Precedence["Literal"] = 9] = "Literal";
})(Precedence || (Precedence = {}));
function replaceDefine(line, defines) {
    for (let [oldValue, newValue] of defines) {
        line = line.replace(new RegExp('\\b' + oldValue + '\\b', 'g'), newValue);
    }
    return line;
}
class Expression {
    operators = [];
    //operands: ExpressionValue[] = [];
    pushOperator(operator) {
        this.operators.push(operator);
    }
    popOperator() {
        this.operators.pop();
    }
    /*
    pushOperand(operand: ExpressionValue): void {
        this.operands.push(operand);
    }
    */
    eval(defines) {
        //console.info('eval', this.operators);
        const operators = this.operators;
        while (operators.length > 1) {
            let opeIndex = 0;
            let evalOpe = undefined;
            let precedence = Precedence.Lowest;
            for (let i = 0; i < operators.length; i++) {
                const ope = operators[i];
                if (typeof ope == 'object') {
                    if (ope.precedence > precedence) {
                        precedence = ope.precedence;
                        evalOpe = ope;
                        opeIndex = i;
                    }
                }
            }
            //console.info('evalOpe', evalOpe, operators);
            if (evalOpe) {
                switch (evalOpe.arguments) {
                    case 0:
                        //console.info('case 0 evalOpe', evalOpe);
                        const result0 = evalOpe.eval(defines);
                        operators.splice(opeIndex, 1, result0);
                        //console.info('case 0', operators);
                        break;
                    case 1:
                        throw new Error("TODO");
                    /*
                    //console.info('case 1 evalOpe', evalOpe);
                    const ope1 = operators[opeIndex - 1];
                    const ope2 = operators[opeIndex + 1];
                    //console.info(ope1, ope2);
                    evalOpe.operators = [ope1 as ExpressionValue, ope2 as ExpressionValue];
                    const result1 = evalOpe.eval(defines);
                    operators.splice(opeIndex - 1, 3, result1);
                    //console.info(operators);
                    break;
                    */
                    case 2:
                        if (opeIndex < 1) {
                            return false;
                        }
                        //console.info('case 2 evalOpe', evalOpe);
                        let operand1 = operators[opeIndex - 1];
                        let operand2 = operators[opeIndex + 1];
                        if (typeof operand1 == 'string') {
                            operand1 = replaceDefine(operand1, defines);
                        }
                        if (typeof operand2 == 'string') {
                            operand2 = replaceDefine(operand2, defines);
                        }
                        //console.info(operand1, operand2);
                        evalOpe.operators = [operand1, operand2];
                        const result = evalOpe.eval(defines);
                        operators.splice(opeIndex - 1, 3, result);
                        //console.info('case 2', operators);
                        break;
                    default:
                        throw new Error('Unknown argument count: ' + evalOpe.arguments);
                }
            }
            else {
                throw new Error('No operation');
            }
            //return operators.pop() as ExpressionValue;
        }
        if (typeof operators[0] == 'object') {
            return operators[0].eval(defines);
        }
        //console.info('eval return', operators[0], operators);
        return operators.pop();
    }
}
class GroupOperator {
    isExpressionOperator = true;
    operators = [, ,];
    expression = new Expression();
    arguments = 0;
    precedence = Precedence.Literal;
    eval(defines) {
        return this.expression.eval(defines);
    }
}
class AddOperator {
    isExpressionOperator = true;
    operators = [, ,];
    arguments = 2;
    precedence = Precedence.Additive;
    eval(defines) {
        return Number(this.operators[0] ?? 0) + Number(this.operators[1] ?? 0);
    }
}
class MultiplyOperator {
    isExpressionOperator = true;
    operators = [, ,];
    arguments = 2;
    precedence = Precedence.Multiplicative;
    eval(defines) {
        return Number(this.operators[0] ?? 0) * Number(this.operators[1] ?? 0);
    }
}
class ComparisonOperator {
    isExpressionOperator = true;
    operators = [, ,];
    arguments = 2;
    precedence = Precedence.Relational;
    eval(defines) {
        return this.operators[0] == this.operators[1];
    }
}
class AndOperator extends ComparisonOperator {
    precedence = Precedence.LogicalAnd;
    eval(defines) {
        return this.operators[0] && this.operators[1];
    }
}
class OrOperator extends ComparisonOperator {
    precedence = Precedence.LogicalOr;
    eval(defines) {
        return this.operators[0] || this.operators[1];
    }
}
class EqualOperator extends ComparisonOperator {
    precedence = Precedence.Equality;
    eval(defines) {
        return this.operators[0] == this.operators[1];
    }
}
class NotEqualOperator extends ComparisonOperator {
    precedence = Precedence.Equality;
    eval(defines) {
        return this.operators[0] != this.operators[1];
    }
}
class LessOperator extends ComparisonOperator {
    eval(defines) {
        return Number(this.operators[0]) < Number(this.operators[1]);
    }
}
class LessEqualOperator extends ComparisonOperator {
    eval(defines) {
        return Number(this.operators[0]) <= Number(this.operators[1]);
    }
}
class GreaterOperator extends ComparisonOperator {
    eval(defines) {
        return Number(this.operators[0]) > Number(this.operators[1]);
    }
}
class GreaterEqualOperator extends ComparisonOperator {
    eval(defines) {
        return Number(this.operators[0]) >= Number(this.operators[1]);
    }
}
class LiteralOperator {
    isExpressionOperator = true;
    literalValue;
    operators = [];
    arguments = 1;
    precedence = Precedence.Literal;
    constructor(value) {
        this.literalValue = value;
    }
    eval() {
        return this.literalValue;
    }
}
class FunctionOperator {
    isExpressionOperator = true;
    //defines: Map<string, string>;
    //literalValue: ExpressionValue;
    operators = [];
    arguments = 0;
    precedence = Precedence.Function;
    name;
    expression = new Expression();
    constructor(name) {
        this.name = name;
    }
    eval(defines) {
        let expressionResult = this.expression.eval(defines);
        switch (this.name) {
            case 'defined':
                if (defines.has(expressionResult)) {
                    return true;
                }
                else {
                    return false;
                }
            default:
                return expressionResult;
        }
    }
}
function parseExpression(expression, defines) {
    const tokenIterator = getNextToken(expression);
    //const operatorStack: ExpressionOperator[] = [];
    //const valueStack: ExpressionOperator[] = [];
    let currentExpression = new Expression(); //expressionStack[expressionStack.length - 1]!;
    const expressionStack = [currentExpression];
    let previousToken = undefined;
    for (const token of tokenIterator) {
        switch (token) {
            case WgslToken.Add:
                currentExpression.pushOperator(new AddOperator());
                break;
            case WgslToken.Multiply:
                currentExpression.pushOperator(new MultiplyOperator());
                break;
            case WgslToken.And:
                currentExpression.pushOperator(new AndOperator());
                break;
            case WgslToken.Or:
                currentExpression.pushOperator(new OrOperator());
                break;
            case WgslToken.Equal:
                currentExpression.pushOperator(new EqualOperator());
                break;
            case WgslToken.NotEqual:
                currentExpression.pushOperator(new NotEqualOperator());
                break;
            case WgslToken.Less:
                currentExpression.pushOperator(new LessOperator());
                break;
            case WgslToken.LessEqual:
                currentExpression.pushOperator(new LessEqualOperator());
                break;
            case WgslToken.Greater:
                currentExpression.pushOperator(new GreaterOperator());
                break;
            case WgslToken.GreaterEqual:
                currentExpression.pushOperator(new GreaterEqualOperator());
                break;
            /*
            case 'defined':
                currentExpression.push(new DefinedOperator(defines));
                break;
            */
            case WgslToken.OpenParenthesis:
                if (typeof previousToken == 'string') {
                    // function
                    const fn = new FunctionOperator(previousToken);
                    // Remove the function name
                    currentExpression.popOperator();
                    currentExpression.pushOperator(fn);
                    expressionStack.push(fn.expression);
                    currentExpression = fn.expression;
                }
                else {
                    // start a new sub expression
                    const group = new GroupOperator();
                    currentExpression.pushOperator(group);
                    expressionStack.push(group.expression);
                    currentExpression = group.expression;
                }
                break;
            case WgslToken.CloseParenthesis:
                expressionStack.pop();
                const exp = expressionStack[expressionStack.length - 1];
                if (!exp) {
                    throw new Error('unmatched closing parenthesis');
                }
                currentExpression = exp;
                /*
                const group = new GroupOperator();
                currentExpression.push(group);
                expressionStack.push(group.expression);
                currentExpression = group.expression;
                */
                break;
            default:
                if (typeof token == 'string') {
                    currentExpression.pushOperator(token);
                }
                else {
                    console.error('unknown token', token);
                }
        }
        previousToken = token;
    }
    /*
    let ope: ExpressionOperator | undefined;
    while (ope = operatorStack.pop()) {
        //console.info(ope);
        for (let i = 0; i < ope.arguments; i++) {
            ope.operators[ope.arguments - i - 1] = valueStack.pop();
        }
        valueStack.push(ope);
    }
    */
    return expressionStack[0];
}
function evaluateExpression(expression, defines) {
    const operator = parseExpression(expression);
    //console.log(operator);
    return operator?.eval(defines);
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
            case '&':
                if (charIterator.peek() == '&') {
                    charIterator.discard();
                    yield WgslToken.And;
                }
                break;
            case '|':
                if (charIterator.peek() == '|') {
                    charIterator.discard();
                    yield WgslToken.Or;
                }
                break;
            case '!':
                if (charIterator.peek() == '=') {
                    charIterator.discard();
                    yield WgslToken.NotEqual;
                }
                else {
                    yield WgslToken.Not;
                }
                break;
            case '=':
                if (charIterator.peek() == '=') {
                    charIterator.discard();
                    yield WgslToken.Equal;
                }
                break;
            case '<':
                if (charIterator.peek() == '=') {
                    charIterator.discard();
                    yield WgslToken.LessEqual;
                }
                else {
                    yield WgslToken.Less;
                }
                break;
            case '>':
                if (charIterator.peek() == '=') {
                    charIterator.discard();
                    yield WgslToken.GreaterEqual;
                }
                else {
                    yield WgslToken.Greater;
                }
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
    defines;
    #expression;
    #defines;
    #result;
    constructor(expression, defines) {
        this.defines = defines;
        this.#expression = expression;
        this.#defines = new Map(defines);
    }
    isTrue() {
        if (this.#result === undefined) {
            this.#result = evaluateExpression(this.#expression, this.#defines) == true;
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
    isTrue() {
        return !this.#condition.isTrue();
    }
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
                    if (this.condition.isTrue()) {
                        const defineSymbols = /#([^\s]*)\s*([^\s]*)\s*(.*)/g.exec(line.line);
                        if (defineSymbols && defineSymbols.length > 3) {
                            defines.set(defineSymbols[2], defineSymbols[3]);
                        }
                    }
                    return true;
                case 'undef':
                    if (this.condition.isTrue()) {
                        const undefSymbols = /#([^\s]*)\s*([^\s]*)/g.exec(line.line);
                        if (undefSymbols && undefSymbols.length > 2) {
                            defines.delete(undefSymbols[2]);
                        }
                    }
                    return true;
                case 'ifdef':
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
                    this.#currentSubBranch = new Branch(new ExpressionCondition(matchedSymbol[2], defines));
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
    out(out = []) {
        if (!this.condition.isTrue()) {
            return;
        }
        for (const line of this.#lines) {
            if (line.isBranch) {
                line.out(out);
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
    branch.out(result);
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

export { WgslPreprocessor, evaluateExpression };
