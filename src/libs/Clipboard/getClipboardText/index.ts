import Parser from '@libs/Parser';

// `htmlToText` only turns `<br>` into a line break, so sibling block elements (e.g. one `<div>` per copied message)
// would be merged into a single line. Add a break wherever a block closes and the next one opens.
const BLOCK_BOUNDARY_REGEX = /((?:<\/(?:div|p|li)>)+)(?=<(?:div|p|li|ul|ol)\b)/gi;

export default function getClipboardText(selection: string, reportIDToName?: Record<string, string>, accountIDToName?: Record<string, string>): string {
    return Parser.htmlToText(selection.replaceAll(BLOCK_BOUNDARY_REGEX, '$1<br>'), {reportIDToName, accountIDToName});
}
