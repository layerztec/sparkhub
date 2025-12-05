interface Assert {
    ok(value: unknown, message?: string): asserts value;
    strictEqual<T>(actual: T, expected: T, message?: string): void;
    notStrictEqual<T>(actual: T, expected: T, message?: string): void;
}

export const assert: Assert = {
    ok(value: unknown, message?: string): asserts value {
        if (!value) {
            throw new Error(message || 'Assertion failed: value is not truthy');
        }
    },
    strictEqual<T>(actual: T, expected: T, message?: string): void {
        if (actual !== expected) {
            throw new Error(message || `Assertion failed: ${actual} !== ${expected}`);
        }
    },
    notStrictEqual<T>(actual: T, expected: T, message?: string): void {
        if (actual === expected) {
            throw new Error(message || `Assertion failed: ${actual} === ${expected}`);
        }
    },
};
