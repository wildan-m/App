import getClipboardText from '@libs/Clipboard/getClipboardText';
import Parser from '@libs/Parser';

jest.mock('@libs/Parser', () => ({
    __esModule: true,
    default: {
        htmlToText: jest.fn(),
        htmlToMarkdown: jest.fn(),
    },
}));

const mockedParser = jest.mocked(Parser);

describe('getClipboardText', () => {
    const selection = '<a href="https://expensify.com">Expensify</a>';
    const mentionedReportID = '1';
    const reportIDToName = {[mentionedReportID]: '#general'};

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // In the jest-expo test environment, platform resolution prefers .native files,
    // so getClipboardText resolves to the native implementation (htmlToMarkdown).
    // The web implementation (htmlToText) is tested via useCopySelectionEvent and
    // ContextMenuActions integration tests.
    it('calls Parser.htmlToMarkdown with the selection', () => {
        mockedParser.htmlToMarkdown.mockReturnValue('[Expensify](https://expensify.com)');

        const result = getClipboardText(selection);

        expect(result).toBe('[Expensify](https://expensify.com)');
        expect(mockedParser.htmlToMarkdown.mock.calls).toContainEqual([selection, {reportIDToName: undefined, accountIDToName: undefined}]);
    });

    it('returns the parser output without modification', () => {
        const expected = 'some parsed text';
        mockedParser.htmlToMarkdown.mockReturnValue(expected);

        const result = getClipboardText('<b>test</b>');

        expect(result).toBe(expected);
        expect(mockedParser.htmlToMarkdown.mock.calls).toContainEqual(['<b>test</b>', {reportIDToName: undefined, accountIDToName: undefined}]);
    });

    it('forwards the report name map so a report mention resolves instead of rendering as "#Hidden"', () => {
        // Given a caller that resolved the names of the reports mentioned in the HTML
        mockedParser.htmlToMarkdown.mockReturnValue('#general');

        // When the clipboard text is produced
        getClipboardText(selection, reportIDToName);

        // Then the map reaches the parser, which is what turns `<mention-report reportID>` into the room name
        expect(mockedParser.htmlToMarkdown.mock.calls).toContainEqual([selection, {reportIDToName, accountIDToName: undefined}]);
    });
});

describe('getClipboardText (web)', () => {
    const getWebClipboardText = jest.requireActual<{default: typeof getClipboardText}>('@libs/Clipboard/getClipboardText/index.ts').default;

    beforeEach(() => {
        jest.clearAllMocks();
        mockedParser.htmlToText.mockImplementation((html: string) => html);
    });

    it('adds a line break between sibling blocks so copied messages are not merged in plain text', () => {
        // Given two copied messages serialized as sibling block elements
        const html = '<div><div>first message</div></div><div><div>second message</div></div>';

        // When the plain text flavor is produced
        getWebClipboardText(html);

        // Then a <br> separates the blocks, which htmlToText turns into a newline
        expect(mockedParser.htmlToText.mock.calls.at(0)?.at(0)).toBe('<div><div>first message</div></div><br><div><div>second message</div></div>');
    });

    it('does not add a line break inside a single block', () => {
        // Given a single message with inline formatting
        const html = '<div>first <strong>bold</strong> message</div>';

        // When the plain text flavor is produced
        getWebClipboardText(html);

        // Then the HTML reaches htmlToText unchanged
        expect(mockedParser.htmlToText.mock.calls.at(0)?.at(0)).toBe(html);
    });
});
