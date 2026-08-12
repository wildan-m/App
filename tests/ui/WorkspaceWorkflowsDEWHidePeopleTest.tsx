import {act, render, screen} from '@testing-library/react-native';

import ComposeProviders from '@components/ComposeProviders';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import {ModalProvider} from '@components/Modal/Global/ModalContext';
import OnyxListItemProvider from '@components/OnyxListItemProvider';

import {CurrentReportIDContextProvider} from '@hooks/useCurrentReportID';
import * as useResponsiveLayoutModule from '@hooks/useResponsiveLayout';
import type ResponsiveLayoutResult from '@hooks/useResponsiveLayout/types';

import createPlatformStackNavigator from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigator';

import type {WorkspaceSplitNavigatorParamList} from '@navigation/types';

import WorkspaceWorkflowsPage from '@pages/workspace/workflows/WorkspaceWorkflowsPage';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';
import type {Policy} from '@src/types/onyx';
import type {PersonalDetailsList} from '@src/types/onyx/PersonalDetails';
import type {PolicyEmployeeList} from '@src/types/onyx/PolicyEmployee';

import {PortalProvider} from '@gorhom/portal';
import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import Onyx from 'react-native-onyx';

import * as LHNTestUtils from '../utils/LHNTestUtils';
import * as TestHelper from '../utils/TestHelper';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

jest.mock('@src/components/ConfirmedRoute.tsx');

// Render the banner's HTML source as plain text so the banner can be asserted on. The real engine is irrelevant here.
jest.mock('react-native-render-html', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const {Text: MockText} = require('react-native');
    return {
        RenderHTMLConfigProvider: ({children}: {children: React.ReactNode}) => children,
        RenderHTMLSource: ({source}: {source: {html: string}}) => <MockText>{source.html}</MockText>,
    };
});

TestHelper.setupGlobalFetchMock();

const POLICY_ID = 'dew-hide-people-test';
const OWNER_EMAIL = 'test@user.com';
const OWNER_ACCOUNT_ID = 1;
const BATCH = CONST.WORKFLOW_APPROVALS_INITIAL_BATCH;

const Stack = createPlatformStackNavigator<WorkspaceSplitNavigatorParamList>();

/**
 * Builds an employeeList that yields `customWorkflowCount` custom approval workflows. Each custom workflow is one
 * submitter routed to its own approver; the conversion always prepends the default ("Everyone") workflow, so the
 * total rendered card count is `customWorkflowCount + 1`.
 */
function buildWorkflowData(customWorkflowCount: number): {employeeList: PolicyEmployeeList; personalDetails: PersonalDetailsList} {
    const employeeList: PolicyEmployeeList = {
        [OWNER_EMAIL]: {email: OWNER_EMAIL, submitsTo: OWNER_EMAIL, forwardsTo: undefined},
    };
    const personalDetails: PersonalDetailsList = {
        [OWNER_ACCOUNT_ID]: TestHelper.buildPersonalDetails(OWNER_EMAIL, OWNER_ACCOUNT_ID, 'Owner'),
    };

    for (let i = 1; i <= customWorkflowCount; i++) {
        const approverEmail = `approver${i}@example.com`;
        const memberEmail = `member${i}@example.com`;
        const approverAccountID = 100 + i;
        const memberAccountID = 200 + i;

        // The approver itself doesn't submit anywhere, so it never creates its own workflow — only the submitter does.
        employeeList[approverEmail] = {email: approverEmail, submitsTo: undefined, forwardsTo: undefined};
        employeeList[memberEmail] = {email: memberEmail, submitsTo: approverEmail, forwardsTo: undefined};
        personalDetails[approverAccountID] = TestHelper.buildPersonalDetails(approverEmail, approverAccountID, `Approver ${i}`);
        personalDetails[memberAccountID] = TestHelper.buildPersonalDetails(memberEmail, memberAccountID, `Member ${i}`);
    }

    return {employeeList, personalDetails};
}

/** `hidePeople: undefined` models the realistic "off" case: the back end omits the field entirely unless it is true. */
const buildPolicy = (employeeList: PolicyEmployeeList, hidePeople?: boolean): Policy =>
    ({
        ...LHNTestUtils.getFakePolicy(POLICY_ID),
        type: CONST.POLICY.TYPE.CORPORATE,
        role: CONST.POLICY.ROLE.ADMIN,
        owner: OWNER_EMAIL,
        approver: OWNER_EMAIL,
        outputCurrency: 'USD',
        areWorkflowsEnabled: true,
        approvalMode: CONST.POLICY.APPROVAL_MODE.DYNAMICEXTERNAL,
        dynamicExternalWorkflowHidePeople: hidePeople,
        reimbursementChoice: CONST.POLICY.REIMBURSEMENT_CHOICES.REIMBURSEMENT_NO,
        employeeList,
    }) as Policy;

const setupPolicy = async (customWorkflowCount: number, hidePeople?: boolean) => {
    const {employeeList, personalDetails} = buildWorkflowData(customWorkflowCount);
    await act(async () => {
        await Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${POLICY_ID}`, buildPolicy(employeeList, hidePeople));
        await Onyx.merge(ONYXKEYS.PERSONAL_DETAILS_LIST, personalDetails);
    });
};

const renderPage = () =>
    render(
        <ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider, CurrentReportIDContextProvider]}>
            <PortalProvider>
                <ModalProvider>
                    <NavigationContainer>
                        <Stack.Navigator initialRouteName={SCREENS.WORKSPACE.WORKFLOWS}>
                            <Stack.Screen
                                name={SCREENS.WORKSPACE.WORKFLOWS}
                                component={WorkspaceWorkflowsPage}
                                initialParams={{policyID: POLICY_ID}}
                            />
                        </Stack.Navigator>
                    </NavigationContainer>
                </ModalProvider>
            </PortalProvider>
        </ComposeProviders>,
    );

const countWorkflowCards = () => screen.queryAllByText(TestHelper.translateLocal('workflowsExpensesFromPage.title')).length;
const queryBanner = () => screen.queryByText(/A custom approval workflow is enabled on this workspace/);
const querySearchBar = () => screen.queryByLabelText(TestHelper.translateLocal('workflowsPage.findWorkflow'));
const queryAddApproval = () => screen.queryByText(TestHelper.translateLocal('workflowsPage.addApprovalButton'));
const queryLoadMore = () => screen.queryByRole(CONST.ROLE.BUTTON, {name: /load .* more/i});

describe('WorkspaceWorkflowsPage - DEW "Hide People Table Columns"', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        await act(async () => {
            await Onyx.set(ONYXKEYS.NVP_PREFERRED_LOCALE, CONST.LOCALES.EN);
        });
        const wideLayout: ResponsiveLayoutResult = {
            shouldUseNarrowLayout: false,
            isSmallScreenWidth: false,
            isInNarrowPaneModal: false,
            isExtraSmallScreenHeight: false,
            isMediumScreenWidth: false,
            isLargeScreenWidth: true,
            isExtraLargeScreenWidth: false,
            isExtraSmallScreenWidth: false,
            isSmallScreen: false,
            onboardingIsMediumOrLargerScreenWidth: true,
            isInLandscapeMode: false,
        };
        jest.spyOn(useResponsiveLayoutModule, 'default').mockReturnValue(wideLayout);
        await TestHelper.signInWithTestUser(OWNER_ACCOUNT_ID, OWNER_EMAIL);
    });

    afterEach(async () => {
        await act(async () => {
            await Onyx.clear();
        });
        jest.clearAllMocks();
    });

    it('keeps the banner but hides the approval workflow UI when the flag is set', async () => {
        // 10 custom + 1 default = 11 workflows: enough to also produce a search bar and a "Load more" card when visible.
        await setupPolicy(10, true);
        renderPage();
        await waitForBatchedUpdatesWithAct();

        expect(queryBanner()).toBeOnTheScreen();
        expect(countWorkflowCards()).toBe(0);
        expect(querySearchBar()).not.toBeOnTheScreen();
        expect(queryAddApproval()).not.toBeOnTheScreen();
        // The "Load more" count is derived from the unfiltered workflow list, so it must be suppressed too or it
        // would render on its own under the banner with no list above it.
        expect(queryLoadMore()).not.toBeOnTheScreen();
    });

    it('leaves DEW behavior unchanged when the flag is absent', async () => {
        await setupPolicy(10);
        renderPage();
        await waitForBatchedUpdatesWithAct();

        expect(queryBanner()).toBeOnTheScreen();
        expect(countWorkflowCards()).toBe(BATCH);
        expect(querySearchBar()).toBeOnTheScreen();
        expect(queryLoadMore()).toBeOnTheScreen();
    });
});
