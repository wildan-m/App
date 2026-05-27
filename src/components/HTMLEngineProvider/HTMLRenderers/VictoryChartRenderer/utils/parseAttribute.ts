import JSON5 from 'json5';

/**
 * Parse attribute as JSON or fallback to input as is.
 * Example: "20" -> 20
 *        : "[ {x: 'Jan', y: 3} ]" -> `[{"x": "Jan", "y": 3}]` (Valid RFC 8259)
 *        : "Green" -> "Green"
 *
 * Pass `isValid` to enforce the expected shape at runtime: when the parsed value (or the raw-string
 * fallback) fails the guard, `undefined` is returned instead of a mis-cast value, so callers can fall
 * back to a safe default rather than crashing on malformed input.
 */
function parseAttribute<T>(attribute: string, isValid?: (value: unknown) => value is T): T | undefined {
    if (!attribute) {
        return undefined;
    }
    let parsed: unknown;
    try {
        // Using JSON5 instead of JSON because the former is not as strict as the later e.g. can parse objects with non-stringified fields `'{x: 100}'`
        parsed = JSON5.parse(attribute);
    } catch {
        parsed = attribute;
    }
    if (isValid && !isValid(parsed)) {
        return undefined;
    }
    return parsed as T;
}

export default parseAttribute;
