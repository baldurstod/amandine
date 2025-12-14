export enum WgslToken {
	OpenParenthesis = 1,
	CloseParenthesis,
	Add,
	Subtract,
	Multiply,
	Divide,
	And,
	Or,
	Not,
	Equal,
	NotEqual,
	Less,
	LessEqual,
	Greater,
	GreaterEqual,
	//EOF,
}

enum Precedence {
	Lowest = 0,
	Ternary,
	LogicalOr,
	LogicalAnd,
	Equality,
	Relational,
	Additive,
	Multiplicative,
	Function,
	Literal,
}

type ExpressionValue = number | boolean | undefined | string;

export function replaceDefine(line: string, defines: Map<string, string>): string {
	for (let [oldValue, newValue] of defines) {
		line = line.replace(new RegExp('\\b' + oldValue + '\\b', 'g'), newValue);
	}
	return line;
}

class Expression {
	operators: (ExpressionOperator | ExpressionValue)[] = [];
	//operands: ExpressionValue[] = [];

	pushOperator(operator: ExpressionOperator | ExpressionValue): void {
		this.operators.push(operator);
	}

	popOperator(): void {
		this.operators.pop();
	}

	/*
	pushOperand(operand: ExpressionValue): void {
		this.operands.push(operand);
	}
	*/

	eval(defines: Map<string, string>): ExpressionValue {
		//console.info('eval', this.operators);

		const operators = this.operators;
		while (operators.length > 1) {
			let opeIndex = 0;
			let evalOpe: ExpressionOperator | undefined = undefined;
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
						evalOpe.operators = [operand1 as ExpressionValue, operand2 as ExpressionValue];
						const result = evalOpe.eval(defines);
						operators.splice(opeIndex - 1, 3, result);
						//console.info('case 2', operators);
						break;
					default:
						throw new Error('Unknown argument count: ' + evalOpe.arguments);
				}
			} else {
				throw new Error('No operation');

			}
			//return operators.pop() as ExpressionValue;
		}

		if (typeof operators[0] == 'object') {
			return operators[0].eval(defines);
		}

		//console.info('eval return', operators[0], operators);
		return operators.pop() as ExpressionValue;
	}
}

interface ExpressionOperator {
	isExpressionOperator: true;
	readonly arguments: number;
	readonly precedence: Precedence;

	operators: (ExpressionValue | undefined)[];
	eval: (defines: Map<string, string>) => ExpressionValue;
}

class GroupOperator implements ExpressionOperator {
	isExpressionOperator = true as const;
	operators: [ExpressionValue | undefined, ExpressionValue | undefined] = [, ,];
	readonly expression = new Expression();
	readonly arguments = 0;
	readonly precedence = Precedence.Literal;

	eval(defines: Map<string, string>): ExpressionValue {
		return this.expression.eval(defines);
	}
}

class AddOperator implements ExpressionOperator {
	isExpressionOperator = true as const;
	operators: [ExpressionValue | undefined, ExpressionValue | undefined] = [, ,];
	readonly arguments = 2;
	readonly precedence = Precedence.Additive;

	eval(defines: Map<string, string>): ExpressionValue {
		return Number(this.operators[0] ?? 0) + Number(this.operators[1] ?? 0);
	}
}

class MultiplyOperator implements ExpressionOperator {
	isExpressionOperator = true as const;
	operators: [ExpressionValue | undefined, ExpressionValue | undefined] = [, ,];
	readonly arguments = 2;
	readonly precedence = Precedence.Multiplicative;


	eval(defines: Map<string, string>): ExpressionValue {
		return Number(this.operators[0] ?? 0) * Number(this.operators[1] ?? 0);
	}
}

class ComparisonOperator implements ExpressionOperator {
	isExpressionOperator = true as const;
	operators: [ExpressionValue | undefined, ExpressionValue | undefined] = [, ,];
	readonly arguments = 2;
	precedence = Precedence.Relational;

	eval(defines: Map<string, string>): boolean {
		return this.operators[0] == this.operators[1];
	}
}

class AndOperator extends ComparisonOperator {
	readonly precedence = Precedence.LogicalAnd;

	eval(defines: Map<string, string>): boolean {
		return (this.operators[0] as boolean) && (this.operators[1] as boolean);
	}
}

class OrOperator extends ComparisonOperator {
	readonly precedence = Precedence.LogicalOr;

	eval(defines: Map<string, string>): boolean {
		return (this.operators[0] as boolean) || (this.operators[1] as boolean);
	}
}

class EqualOperator extends ComparisonOperator {
	readonly precedence = Precedence.Equality;

	eval(defines: Map<string, string>): boolean {
		return this.operators[0] == this.operators[1];
	}
}

class NotEqualOperator extends ComparisonOperator {
	readonly precedence = Precedence.Equality;

	eval(defines: Map<string, string>): boolean {
		return this.operators[0] != this.operators[1];
	}
}

class LessOperator extends ComparisonOperator {
	eval(defines: Map<string, string>): boolean {
		return Number(this.operators[0]) < Number(this.operators[1]);
	}
}

class LessEqualOperator extends ComparisonOperator {
	eval(defines: Map<string, string>): boolean {
		return Number(this.operators[0]) <= Number(this.operators[1]);
	}
}

class GreaterOperator extends ComparisonOperator {
	eval(defines: Map<string, string>): boolean {
		return Number(this.operators[0]) > Number(this.operators[1]);
	}
}

class GreaterEqualOperator extends ComparisonOperator {
	eval(defines: Map<string, string>): boolean {
		return Number(this.operators[0]) >= Number(this.operators[1]);
	}
}

class LiteralOperator implements ExpressionOperator {
	isExpressionOperator = true as const;
	literalValue: ExpressionValue;
	operators = [];
	readonly arguments = 1;
	readonly precedence = Precedence.Literal;

	constructor(value: ExpressionValue) {
		this.literalValue = value;
	}

	eval(): ExpressionValue {
		return this.literalValue;
	}
}

class FunctionOperator implements ExpressionOperator {
	isExpressionOperator = true as const;
	//defines: Map<string, string>;
	//literalValue: ExpressionValue;
	operators = [];
	readonly arguments = 0;
	readonly precedence = Precedence.Function;
	readonly name: string;
	readonly expression = new Expression();

	constructor(name: string) {
		this.name = name;
	}

	eval(defines: Map<string, string>): ExpressionValue {
		let expressionResult = this.expression.eval(defines);
		switch (this.name) {
			case 'defined':
				if (defines.has(expressionResult as string)) {
					return true;
				} else {
					return false;
				}
			default:
				return expressionResult;
		}
	}
}

function parseExpression(expression: string, defines: Map<string, string>): Expression | undefined {
	const tokenIterator = getNextToken(expression);

	//const operatorStack: ExpressionOperator[] = [];
	//const valueStack: ExpressionOperator[] = [];

	let currentExpression: Expression = new Expression();//expressionStack[expressionStack.length - 1]!;
	const expressionStack: Expression[] = [currentExpression];

	let previousToken: WgslToken | string | undefined = undefined;
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
				} else {
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
					currentExpression.pushOperator(token as string);
				} else {
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

export function evaluateExpression(expression: string, defines: Map<string, string>): ExpressionValue {
	const operator = parseExpression(expression, defines);
	//console.log(operator);
	return operator?.eval(defines);
}

function* getNextChar(wgsl: string): Generator<string, null, unknown> {
	let offset = 0;
	const length = wgsl.length;

	for (const c of wgsl) {
		yield c;
	}
	return null;
}

class TokenIterator/* implements Iterator<string, null, null>*/ {
	#charIterator: Generator<string, null, unknown>
	#stack: string[] = [];


	constructor(source: string) {
		this.#charIterator = getNextChar(source);
	}

	[Symbol.iterator]() {

		return {
			next: (): IteratorResult<string, null> => {
				if (this.#stack.length > 0) {
					return { value: this.#stack.pop()!, done: false };
				}

				const next = this.#charIterator.next().value;
				if (next !== null) {
					return { value: next, done: false };
				} else {
					return { value: null, done: true };
				}
			}
		};
	};



	/**
	 * Peek the next character.
	 */
	peek(): string | null {
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

function* getNextToken(source: string): Generator<WgslToken | string, void, unknown> {
	let offset = 0;
	const length = source.length;

	let forwardSlash = false;
	let lineComment = false;
	let blockComment = false;
	let literal = false;
	let literalString = '';

	const charIterator = new TokenIterator(source);//getNextChar(source);
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
				} else {
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
				} else {
					yield WgslToken.Less;
				}
				break;
			case '>':
				if (charIterator.peek() == '=') {
					charIterator.discard();
					yield WgslToken.GreaterEqual;
				} else {
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
