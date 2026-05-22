import findMatchingDynamicSuffix from '@libs/Navigation/helpers/dynamicRoutesUtils/findMatchingDynamicSuffix';

jest.mock('@src/ROUTES', () => ({
    DYNAMIC_ROUTES: {
        VERIFY_ACCOUNT: {path: 'verify-account'},
        ADD_BANK_ACCOUNT_VERIFY_ACCOUNT: {path: 'add-bank-account/verify-account'},
        COUNTRY: {path: 'country', queryParams: {country: true}},
        FLAG_COMMENT: {path: 'flag/:reportID/:reportActionID'},
        MEMBER_DETAILS: {path: 'member-details/:accountID'},
        KEYBOARD_SHORTCUTS: {path: 'keyboard-shortcuts'},
        OPT_TRAILING: {path: 'opt-page/:id?'},
        OPT_MIDDLE: {path: 'wrap/:p?/end'},
        // Workspace tag routes: the parametric settings route shares a prefix with the static
        // sub-routes whose paths can collide with a user-chosen tag name.
        WORKSPACE_TAG_SETTINGS: {path: 'tag/:orderWeight/:tagName'},
        WORKSPACE_TAG_EDIT: {path: 'tag-edit'},
        WORKSPACE_TAG_GL_CODE: {path: 'tag-gl-code'},
        WORKSPACE_TAG_APPROVER: {path: 'workspace-tag-approver'},
    },
}));

describe('findMatchingDynamicSuffix', () => {
    it('should match a single-segment dynamic suffix', () => {
        expect(findMatchingDynamicSuffix('settings/wallet/verify-account')).toEqual({
            pattern: 'verify-account',
            actualSuffix: 'verify-account',
            pathParams: {},
        });
    });

    it('should match when the path has a leading slash', () => {
        expect(findMatchingDynamicSuffix('/settings/wallet/verify-account')).toEqual({
            pattern: 'verify-account',
            actualSuffix: 'verify-account',
            pathParams: {},
        });
    });

    it('should return undefined for a path with no matching suffix', () => {
        expect(findMatchingDynamicSuffix('/settings/wallet/unknown-page')).toBeUndefined();
    });

    it('should return undefined for an empty path', () => {
        expect(findMatchingDynamicSuffix('')).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
        expect(findMatchingDynamicSuffix(undefined)).toBeUndefined();
    });

    it('should ignore query parameters when matching', () => {
        expect(findMatchingDynamicSuffix('settings/wallet/verify-account?sortBy=date')).toEqual({
            pattern: 'verify-account',
            actualSuffix: 'verify-account',
            pathParams: {},
        });
    });

    it('should handle trailing slashes', () => {
        expect(findMatchingDynamicSuffix('settings/wallet/verify-account/')).toEqual({
            pattern: 'verify-account',
            actualSuffix: 'verify-account',
            pathParams: {},
        });
    });

    it('should not match a suffix that appears in the middle of the path', () => {
        expect(findMatchingDynamicSuffix('/verify-account/settings/wallet')).toBeUndefined();
    });

    it('should match a suffix when path has suffix-specific query params', () => {
        expect(findMatchingDynamicSuffix('settings/profile/address/country?country=US')).toEqual({
            pattern: 'country',
            actualSuffix: 'country',
            pathParams: {},
        });
    });

    it('should prefer longer multi-segment static match over shorter', () => {
        expect(findMatchingDynamicSuffix('/settings/wallet/add-bank-account/verify-account')).toEqual({
            pattern: 'add-bank-account/verify-account',
            actualSuffix: 'add-bank-account/verify-account',
            pathParams: {},
        });
    });

    it('should match parametric suffix and extract params', () => {
        expect(findMatchingDynamicSuffix('/r/123/flag/456/abc')).toEqual({
            pattern: 'flag/:reportID/:reportActionID',
            actualSuffix: 'flag/456/abc',
            pathParams: {reportID: '456', reportActionID: 'abc'},
        });
    });

    it('should match single-param suffix', () => {
        expect(findMatchingDynamicSuffix('/r/123/members/member-details/456')).toEqual({
            pattern: 'member-details/:accountID',
            actualSuffix: 'member-details/456',
            pathParams: {accountID: '456'},
        });
    });

    it('should not match parametric suffix in the middle of path', () => {
        expect(findMatchingDynamicSuffix('/flag/123/abc/settings/wallet')).toBeUndefined();
    });

    it('should return undefined when no parametric pattern matches', () => {
        expect(findMatchingDynamicSuffix('/r/123/unknown/456/abc')).toBeUndefined();
    });

    it('should handle query params alongside parametric suffix', () => {
        expect(findMatchingDynamicSuffix('/r/123/flag/456/abc?tab=details')).toEqual({
            pattern: 'flag/:reportID/:reportActionID',
            actualSuffix: 'flag/456/abc',
            pathParams: {reportID: '456', reportActionID: 'abc'},
        });
    });

    it('should match keyboard-shortcuts dynamic suffix', () => {
        expect(findMatchingDynamicSuffix('settings/about/keyboard-shortcuts')).toEqual({
            pattern: 'keyboard-shortcuts',
            actualSuffix: 'keyboard-shortcuts',
            pathParams: {},
        });
    });

    describe('parametric value colliding with a static route path', () => {
        it('should prefer the longer parametric suffix when a tag is named like the static tag-edit route', () => {
            expect(findMatchingDynamicSuffix('/settings/workspaces/123/tags/tag/0/tag-edit')).toEqual({
                pattern: 'tag/:orderWeight/:tagName',
                actualSuffix: 'tag/0/tag-edit',
                pathParams: {orderWeight: '0', tagName: 'tag-edit'},
            });
        });

        it('should prefer the longer parametric suffix when a tag is named like the static tag-gl-code route', () => {
            expect(findMatchingDynamicSuffix('/settings/workspaces/123/tags/tag/0/tag-gl-code')).toEqual({
                pattern: 'tag/:orderWeight/:tagName',
                actualSuffix: 'tag/0/tag-gl-code',
                pathParams: {orderWeight: '0', tagName: 'tag-gl-code'},
            });
        });

        it('should prefer the longer parametric suffix when a tag is named like the static workspace-tag-approver route', () => {
            expect(findMatchingDynamicSuffix('/settings/workspaces/123/tags/tag/0/workspace-tag-approver')).toEqual({
                pattern: 'tag/:orderWeight/:tagName',
                actualSuffix: 'tag/0/workspace-tag-approver',
                pathParams: {orderWeight: '0', tagName: 'workspace-tag-approver'},
            });
        });

        it('should still match the static tag-edit route when it is the genuine trailing sub-route of a tag settings page', () => {
            expect(findMatchingDynamicSuffix('/settings/workspaces/123/tags/tag/0/MyTag/tag-edit')).toEqual({
                pattern: 'tag-edit',
                actualSuffix: 'tag-edit',
                pathParams: {},
            });
        });
    });

    describe('optional path params', () => {
        it('should match trailing-optional pattern when optional is absent', () => {
            expect(findMatchingDynamicSuffix('/r/123/opt-page')).toEqual({
                pattern: 'opt-page/:id?',
                actualSuffix: 'opt-page',
                pathParams: {},
            });
        });

        it('should match trailing-optional pattern when optional is present', () => {
            expect(findMatchingDynamicSuffix('/r/123/opt-page/789')).toEqual({
                pattern: 'opt-page/:id?',
                actualSuffix: 'opt-page/789',
                pathParams: {id: '789'},
            });
        });

        it('should match middle-optional pattern when optional is absent', () => {
            expect(findMatchingDynamicSuffix('/r/123/wrap/end')).toEqual({
                pattern: 'wrap/:p?/end',
                actualSuffix: 'wrap/end',
                pathParams: {},
            });
        });

        it('should match middle-optional pattern when optional is present', () => {
            expect(findMatchingDynamicSuffix('/r/123/wrap/x/end')).toEqual({
                pattern: 'wrap/:p?/end',
                actualSuffix: 'wrap/x/end',
                pathParams: {p: 'x'},
            });
        });

        it('should ignore query params when matching trailing-optional present-form', () => {
            expect(findMatchingDynamicSuffix('/r/123/opt-page/789?tab=details')).toEqual({
                pattern: 'opt-page/:id?',
                actualSuffix: 'opt-page/789',
                pathParams: {id: '789'},
            });
        });

        it('should ignore query params when matching trailing-optional absent-form', () => {
            expect(findMatchingDynamicSuffix('/r/123/opt-page?tab=details')).toEqual({
                pattern: 'opt-page/:id?',
                actualSuffix: 'opt-page',
                pathParams: {},
            });
        });
    });
});
