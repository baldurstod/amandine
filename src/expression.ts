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

type ExpressionValue = number | boolean | undefined | string;

interface ExpressionOperator {
	isExpressionOperator: true;
	readonly arguments: number;
	//setArgument: (index: number, value: ExpressionOperator) => void;

	operators: (ExpressionOperator | undefined)[];
	eval: () => ExpressionValue;
}

class AddOperator implements ExpressionOperator {
	isExpressionOperator = true as const;
	operators: [ExpressionOperator | undefined, ExpressionOperator | undefined] = [, ,];
	//operator2?: ExpressionOperator;
	readonly arguments = 2;

	eval(): ExpressionValue {
		return Number(this.operators[0]?.eval()) + Number(this.operators[1]?.eval());
	}
}

class EqualOperator implements ExpressionOperator {
	isExpressionOperator = true as const;
	operators: [ExpressionOperator | undefined, ExpressionOperator | undefined] = [, ,];
	readonly arguments = 2;

	eval(): boolean {
		//console.info('evaluating equal', this.operators)
		return this.operators[0]?.eval() == this.operators[1]?.eval();
	}
}

class LiteralOperator implements ExpressionOperator {
	isExpressionOperator = true as const;
	literalValue: ExpressionValue;
	operators = [];
	readonly arguments = 1;

	constructor(value: ExpressionValue) {
		this.literalValue = value;
	}

	eval(): ExpressionValue {
		return this.literalValue;
	}
}

function parseExpression(expression: string): ExpressionOperator | undefined {
	const tokenIterator = getNextToken(expression);

	const operatorStack: ExpressionOperator[] = [];
	const valueStack: ExpressionOperator[] = [];

	for (const token of tokenIterator) {
		switch (token) {
			case WgslToken.Equal:
				operatorStack.push(new EqualOperator());
				break;
			default:
				valueStack.push(new LiteralOperator(token as string));
		}
	}

	console.log(operatorStack, valueStack);


	let ope: ExpressionOperator | undefined;
	while (ope = operatorStack.pop()) {
		for (let i = 0; i < ope.arguments; i++) {
			ope.operators[i] = valueStack.pop();
		}
		valueStack.push(ope);
	}

	return valueStack[0];
}

export function evaluateExpression(expression: string): ExpressionValue {
	console.log(`evaluating expression <${expression}>`);
	const operator = parseExpression(expression);
	return operator?.eval();
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
