import {sortAlphabetically} from '@libs/OptionsListUtils';
import {flattenPopoverMenuItemGroups} from '@libs/PopoverMenuSections';

type TestMenuItem = {text: string; addSeparatorBefore?: boolean};

const localeCompare = (a: string, b: string) => a.localeCompare(b);

describe('Issue #94706 - Export menu grouping, dividers and alphabetical ordering', () => {
    it('places a divider before the first item of every non-empty group except the first', () => {
        const groups: TestMenuItem[][] = [[{text: 'QuickBooks Online'}, {text: 'Mark as exported'}], [{text: 'Export current view'}], [{text: 'New Export Format'}]];

        const result = flattenPopoverMenuItemGroups(groups);

        expect(result.map((item) => item.text)).toEqual(['QuickBooks Online', 'Mark as exported', 'Export current view', 'New Export Format']);
        // First group's first item must NOT have a divider, and non-first items never get one.
        expect(result.map((item) => item.addSeparatorBefore ?? false)).toEqual([false, false, true, true]);
    });

    it('skips empty groups so no stray dividers are produced', () => {
        // No accounting actions and no custom templates -> only "current view" + default templates remain.
        const groups: TestMenuItem[][] = [[], [{text: 'Export current view'}], [], [{text: 'Basic export'}]];

        const result = flattenPopoverMenuItemGroups(groups);

        expect(result.map((item) => item.text)).toEqual(['Export current view', 'Basic export']);
        // "Export current view" is the first emitted item -> no leading divider; "Basic export" opens a new group -> divider.
        expect(result.map((item) => item.addSeparatorBefore ?? false)).toEqual([false, true]);
    });

    it('produces the mockup order: accounting, Export current view, custom (alphabetical), default (alphabetical)', () => {
        const accounting: TestMenuItem[] = [{text: 'QuickBooks Online'}, {text: 'Mark as exported'}];
        const currentView: TestMenuItem[] = [{text: 'Export current view'}];
        // Intentionally unsorted to prove the alphabetical sort runs.
        const customTemplates: TestMenuItem[] = [{text: 'New Export Format'}, {text: 'Acme template'}];
        const defaultTemplates: TestMenuItem[] = [{text: 'Basic export'}, {text: 'All Data - report level'}, {text: 'All Data - expense level'}];

        const result = flattenPopoverMenuItemGroups([
            accounting,
            currentView,
            sortAlphabetically(customTemplates, 'text', localeCompare),
            sortAlphabetically(defaultTemplates, 'text', localeCompare),
        ]);

        expect(result.map((item) => item.text)).toEqual([
            'QuickBooks Online',
            'Mark as exported',
            'Export current view',
            // custom templates sorted alphabetically
            'Acme template',
            'New Export Format',
            // default templates sorted alphabetically (Basic export sits with the defaults, at the bottom)
            'All Data - expense level',
            'All Data - report level',
            'Basic export',
        ]);
        // Dividers open each of the three groups after the accounting group.
        expect(result.filter((item) => item.addSeparatorBefore).map((item) => item.text)).toEqual(['Export current view', 'Acme template', 'All Data - expense level']);
    });
});
