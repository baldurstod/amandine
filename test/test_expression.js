import { evaluateExpression } from '../dist/index.js';

evaluate('1 + 2 * 2 + 1');
evaluate('1 + (2 + 1)');
evaluate('1 + 2 * 3 + 4');
evaluate('defined(TEST)');
evaluate('defined(IS_DEFINED)');
evaluate('true && false');
evaluate('true || false');
evaluate('true && false || true');

function evaluate(expression) {
	const result = evaluateExpression(expression, new Map([['IS_DEFINED', '']]));
	console.info(`result for ${expression}: ${result}`);
}
