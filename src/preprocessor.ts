const includes = new Map<string, string>();

const PRAGMA_REGEX = /#pragma (\w+)/;

interface Condition {
	isTrue: (defines: Map<string, string>) => boolean;
}

class SimpleCondition implements Condition {
	#condition: string;

	constructor(condition: string) {
		this.#condition = condition;
	}

	isTrue(): boolean {
		return true;
	}
}

class IsDefinedCondition implements Condition {
	#condition: string;

	constructor(condition: string) {
		this.#condition = condition;
	}

	isTrue(defines: Map<string, string>): boolean {
		return defines.has(this.#condition);
	}
}

class AndCondition implements Condition {
	#condition1: Condition;
	#condition2: Condition;

	constructor(condition1: Condition, condition2: Condition) {
		this.#condition1 = condition1;
		this.#condition2 = condition2;
	}

	isTrue(defines: Map<string, string>): boolean {
		if (!this.#condition1.isTrue(defines)) {
			return false;
		}
		return this.#condition2.isTrue(defines);
	}
}

class TrueCondition implements Condition {
	isTrue(): boolean {
		return true;
	}
}

class FlipCondition implements Condition {
	#condition: Condition;

	constructor(condition: Condition) {
		this.#condition = condition;
	}

	isTrue(defines: Map<string, string>): boolean {
		return !this.#condition.isTrue(defines);
	}
}

let branchId = 0;
class Branch {
	isBranch = true as const;
	readonly condition: Condition;
	#lines: (FinalLine | Branch)[] = [];
	#currentSubBranch: Branch | null = null;
	readonly branchId = String(branchId++);
	readonly defines = new Map<string, string>();

	constructor(condition: Condition) {
		this.condition = condition;
	}

	addLine(line: FinalLine): boolean {
		const preprocessorSymbols = /#([^\s]*)\s*(.*)/g
		// If we are in a subbranch, pass the line to the subbranch
		if (this.#currentSubBranch) {
			if (this.#currentSubBranch.addLine(line)) {
				return true;
			}
		}

		const matchedSymbol = preprocessorSymbols.exec(line.line);
		if (matchedSymbol) {
			switch (matchedSymbol[1]) {
				// #define. defines are defined for the whole preprocessor branch they appear in
				case 'define':
					const defineSymbols = /#([^\s]*)\s*([^\s]*)\s*(.*)/g.exec(line.line);
					if (defineSymbols && defineSymbols.length > 3) {
						this.defines.set(defineSymbols[2]!, defineSymbols[3]!);
					}
					return true;
				case 'ifdef':
					this.#currentSubBranch = new Branch(new IsDefinedCondition(matchedSymbol[2]!));
					this.#lines.push(this.#currentSubBranch);
					return true;
				case 'else':
					if (this.#currentSubBranch) {
						this.#currentSubBranch = new Branch(new FlipCondition(this.#currentSubBranch.condition));
						this.#lines.push(this.#currentSubBranch);
					} else {
						return false;
					}
					return true;
				case 'endif':
					if (this.#currentSubBranch) {
						this.#currentSubBranch = null;
						return true;
					} else {
						return false;
					}
				default:
					// This is probably an error
					this.#lines.push(line);
					return true;
					break;
			}
		} else {
			if (this.#currentSubBranch) {
				return this.#currentSubBranch.addLine(line);
			} else {
				this.#lines.push(line);
				return true;
			}
		}
	}

	out(out: FinalLine[] = [], defines: Map<string, string>): void {
		// Concatenation of defines passed to the shader + defines in the shader code
		const allDefines = new Map<string, string>(defines);

		for (const define of this.defines) {
			allDefines.set(...define);
		}

		if (!this.condition.isTrue(allDefines)) {
			return;
		}
		for (const line of this.#lines) {
			if ((line as Branch).isBranch) {
				(line as Branch).out(out, allDefines);
			} else {
				out.push(line as FinalLine);
			}
		}
	}
}

export function setWgslInclude(name: string, source: string): void {
	includes.set(name, source);
}

export function getWgslInclude(name: string): string | undefined {
	return includes.get(name);
}

export type FinalLine = {
	sourceName?: string;
	line: string;
	originLine: number;
	includeLine?: FinalLine;
}

export function preprocessWgsl(source: string, defines: Map<string, string> = new Map<string, string>()): string {
	const expandedArray = expandIncludes(source);

	const processedArray = preprocess(expandedArray, defines);

	const finalArray: string[] = [];
	for (const line of processedArray) {
		finalArray.push(line.line);
	}
	return finalArray.join('\n');
}

export function getIncludeList(source: string, defines: Map<string, string> = new Map<string, string>()): Set<string> {
	const expandedArray = expandIncludes(source);

	const processedArray = preprocess(expandedArray, defines);

	const includes = new Set<string>();

	function addInclude(line: FinalLine): void {
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

export function preprocessWgslLineMap(source: string, defines: Map<string, string> = new Map<string, string>()): FinalLine[] {
	const expandedArray = expandIncludes(source);

	const processedArray = preprocess(expandedArray, defines);

	return processedArray;
}

function preprocess(lines: FinalLine[], defines: Map<string, string>): FinalLine[] {
	const branch = new Branch(new TrueCondition());
	for (let i = 0, l = lines.length; i < l; ++i) {
		branch.addLine(lines[i]!);
	}

	const result: FinalLine[] = [];
	branch.out(result, defines);
	return result;
}

function expandIncludes(source: string): FinalLine[] {
	const lines = source.split('\n');

	const allIncludes = new Set<string>();
	const outArray: FinalLine[] = [];
	const sizeOfSourceRow = [];

	for (let i = 0; i < lines.length; ++i) {
		const line = lines[i]!;
		let actualSize = 1;

		if (line.trim().startsWith('#include')) {
			const includeName = line.replace('#include', '').trim();
			const include = getInclude(includeName, new Set(), allIncludes);
			if (include) {
				for (const includeLine of include) {
					outArray.push({ line: includeLine.line, originLine: i, includeLine });

				}
				actualSize = include.length;
			} else {
				if (include === undefined) {
					console.error(`Include not found : ${line}`)
				}
			}
		} else {
			outArray.push({ line, originLine: i, });
		}
		sizeOfSourceRow[i] = actualSize;
	}
	return outArray;
}

function getInclude(includeName: string, recursion = new Set<string>(), allIncludes = new Set<string>()): FinalLine[] | null {
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
	const outArray: FinalLine[] = [];
	for (let i = 0, l = includeLineArray.length; i < l; ++i) {
		const line = includeLineArray[i]!;
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
