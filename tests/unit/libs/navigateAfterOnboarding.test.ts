import SidePanelActions from '@libs/actions/SidePanel';
import {dismissMarketingWindow} from '@libs/actions/User';
import {setOnboardingRHPVariant} from '@libs/actions/Welcome';
import {navigateToSubmitWorkspaceAfterOnboardingWithMicrotaskQueue} from '@libs/navigateAfterOnboarding';
import Navigation from '@libs/Navigation/Navigation';
import {ACTIVE_PRODUCT_MARKETING_ANNOUNCEMENT} from '@libs/ProductMarketingWindowUtils';
import {buildCannedSearchQuery} from '@libs/SearchQueryUtils';

import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';

jest.mock('@libs/Navigation/Navigation', () => ({
    __esModule: true,
    default: {
        dismissModal: jest.fn(),
        navigate: jest.fn(),
        setNavigationActionToMicrotaskQueue: jest.fn((callback: () => void) => callback()),
    },
}));

jest.mock('@libs/actions/SidePanel', () => ({
    __esModule: true,
    default: {openSidePanel: jest.fn()},
}));

jest.mock('@libs/actions/Welcome', () => ({
    setOnboardingRHPVariant: jest.fn(),
}));

jest.mock('@libs/actions/Modal', () => ({
    setDisableDismissOnEscape: jest.fn(),
}));

jest.mock('@libs/actions/User', () => ({
    dismissMarketingWindow: jest.fn(),
}));

const navigationMock = jest.mocked(Navigation);

describe('navigateToSubmitWorkspaceAfterOnboardingWithMicrotaskQueue', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('navigates to HOME when policyID is missing', () => {
        navigateToSubmitWorkspaceAfterOnboardingWithMicrotaskQueue(undefined);

        expect(navigationMock.dismissModal).toHaveBeenCalledTimes(1);
        expect(navigationMock.navigate).toHaveBeenCalledTimes(1);
        expect(navigationMock.navigate).toHaveBeenCalledWith(ROUTES.HOME);
    });

    it('navigates to Spend > Expenses', () => {
        navigateToSubmitWorkspaceAfterOnboardingWithMicrotaskQueue('test-policy-id');

        expect(navigationMock.dismissModal).toHaveBeenCalledTimes(1);
        expect(navigationMock.navigate).toHaveBeenCalledTimes(1);
        expect(navigationMock.navigate).toHaveBeenCalledWith(ROUTES.SEARCH_ROOT.getRoute({query: buildCannedSearchQuery({type: CONST.SEARCH.DATA_TYPES.EXPENSE})}));
    });

    it('leaves the side panel closed so onboarding is not duplicated in the #admins room', () => {
        navigateToSubmitWorkspaceAfterOnboardingWithMicrotaskQueue('test-policy-id');

        expect(SidePanelActions.openSidePanel).not.toHaveBeenCalled();
        expect(setOnboardingRHPVariant).not.toHaveBeenCalled();
    });

    it('dismisses the active product marketing announcement so it never shows to a new sign-up', () => {
        navigateToSubmitWorkspaceAfterOnboardingWithMicrotaskQueue('test-policy-id');

        if (ACTIVE_PRODUCT_MARKETING_ANNOUNCEMENT) {
            expect(dismissMarketingWindow).toHaveBeenCalledWith(ACTIVE_PRODUCT_MARKETING_ANNOUNCEMENT.updateKey);
        } else {
            expect(dismissMarketingWindow).not.toHaveBeenCalled();
        }
    });
});
