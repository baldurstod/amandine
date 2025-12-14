export declare function evaluateExpression(expression: string, defines: Map<string, string>): ExpressionValue;

declare type ExpressionValue = number | boolean | undefined | string;

export declare type FinalLine = {
    sourceName?: string;
    line: string;
    originLine: number;
    includeLine?: FinalLine;
};

export declare class WgslPreprocessor {
    static setWgslInclude(name: string, source: string): void;
    static getWgslInclude(name: string): string | undefined;
    static preprocessWgsl(source: string, defines?: Map<string, string>): string;
    static getIncludeList(source: string, defines?: Map<string, string>): Set<string>;
    static preprocessWgslLineMap(source: string, defines?: Map<string, string>): FinalLine[];
}

export { }
