import type {CompiledEntry} from './compileDynamicRoutePattern';
import {compiledOptionalParametricDynamicRoutes, compiledStrictParametricDynamicRoutes} from './compileDynamicRoutePattern';
import {dynamicRoutePaths} from './isDynamicRouteSuffix';
import splitPathAndQuery from './splitPathAndQuery';

type DynamicSuffixMatch = {
    /** Registered pattern, e.g. 'flag/:reportID/:reportActionID' */
    pattern: string;
    /** Actual URL values, e.g. 'flag/456/abc' */
    actualSuffix: string;
    /** Extracted path params, e.g. {reportID: '456', reportActionID: 'abc'} */
    pathParams: Record<string, string>;
};

/**
 * Tries to match a candidate suffix against a list of compiled parametric patterns.
 * Returns the first match with extracted path params, or undefined.
 *
 * @private - Internal helper. Do not export or use outside this file.
 */
function tryMatchParametric(candidate: string, candidateSegmentCount: number, patterns: CompiledEntry[]): DynamicSuffixMatch | undefined {
    const normalized = candidate.endsWith('/') ? candidate : `${candidate}/`;

    for (const {compiled} of patterns) {
        if (candidateSegmentCount < compiled.minSegments || candidateSegmentCount > compiled.maxSegments) {
            continue;
        }
        const match = compiled.regex.exec(normalized);
        if (!match) {
            continue;
        }
        const pathParams: Record<string, string> = {};
        for (const name of compiled.paramNames) {
            const value = match.groups?.[name];
            if (value === undefined) {
                continue;
            }
            try {
                pathParams[name] = decodeURIComponent(value);
            } catch {
                pathParams[name] = value;
            }
        }
        return {pattern: compiled.pattern, actualSuffix: candidate, pathParams};
    }

    return undefined;
}

/**
 * Finds a registered dynamic route suffix that matches the end of the given path.
 *
 * Iterates path sub-suffixes from longest to shortest and, at each candidate length,
 * checks with decreasing specificity:
 *   1. Static matches (`dynamicRoutePaths` Set lookup).
 *   2. Strict parametric patterns (no optional params).
 *   3. Optional parametric patterns (has at least one `:param?`).
 *
 * Trying longer candidates first guarantees the longest (most specific) suffix wins, so a
 * parametric route whose final value happens to equal a shorter static route's path — e.g. a
 * tag named `tag-edit` reached via `tag/:orderWeight/:tagName` — still resolves to the parametric
 * route instead of being hijacked by the static `tag-edit` suffix. Within a single candidate
 * length, static beats strict-parametric beats optional-parametric, keeping the tie-break
 * deterministic.
 *
 * @param path - The path to find the matching dynamic suffix for
 * @returns The matching dynamic suffix, or undefined if no matching suffix is found
 */
function findMatchingDynamicSuffix(path = ''): DynamicSuffixMatch | undefined {
    const [normalizedPath] = splitPathAndQuery(path);
    if (!normalizedPath) {
        return undefined;
    }

    const segments = normalizedPath.split('/').filter(Boolean);

    // Iterate sub-suffixes from longest to shortest so the most specific suffix wins.
    for (let i = 0; i < segments.length; i++) {
        const candidate = segments.slice(i).join('/');
        const candidateSegmentCount = segments.length - i;

        // Static match (e.g. 'country', 'verify-account')
        if (dynamicRoutePaths.has(candidate)) {
            return {pattern: candidate, actualSuffix: candidate, pathParams: {}};
        }

        // Strict parametric patterns (no optional params)
        const strictMatch = tryMatchParametric(candidate, candidateSegmentCount, compiledStrictParametricDynamicRoutes);
        if (strictMatch) {
            return strictMatch;
        }

        // Optional parametric patterns (has at least one :param?)
        const optionalMatch = tryMatchParametric(candidate, candidateSegmentCount, compiledOptionalParametricDynamicRoutes);
        if (optionalMatch) {
            return optionalMatch;
        }
    }

    return undefined;
}

export default findMatchingDynamicSuffix;
