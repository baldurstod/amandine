import { evaluateExpression } from '../dist/index.js';

evaluate('1 + 2 * 2 + 1');
evaluate('1 + (2 + 1)');
evaluate('1 + 2 * 3 + 4');
evaluate('defined(TEST)');
evaluate('defined(IS_DEFINED)');
evaluate('true && false');
evaluate('true || false');
evaluate('true && false || true');
evaluate(' > 0');
evaluate('defined(FOO) && FOO >= 1  ', new Map([['FOO', 1]]));

function evaluate(expression, defines) {
	const result = evaluateExpression(expression, defines ?? new Map([['IS_DEFINED', '']]));
	console.info(`result for ${expression}: ${result}`);
}
