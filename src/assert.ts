export const assert = {
    ok(value: unknown, message?: string) {
        if (!value) {
            throw new Error(message || 'Assertion failed: value is not truthy');
        }
    },
    strictEqual<T>(actual: T, expected: T, message?: string) {
        if (actual !== expected) {
            throw new Error(message || `Assertion failed: ${actual} !== ${expected}`);
        }
    },
    notStrictEqual<T>(actual: T, expected: T, message?: string) {
        if (actual === expected) {
            throw new Error(message || `Assertion failed: ${actual} === ${expected}`);
        }
    },
};
