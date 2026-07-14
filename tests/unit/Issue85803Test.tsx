import {render, screen} from '@testing-library/react-native';

import {LocaleContextProvider} from '@components/LocaleContextProvider';
import OnyxListItemProvider from '@components/OnyxListItemProvider';

import TravelMenuItem from '@pages/inbox/sidebar/FABPopoverContent/menuItems/TravelMenuItem';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';
import Onyx from 'react-native-onyx';

import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

const POLICY_ID = 'policy85803';
const CURRENT_USER_EMAIL = 'demoted@expensifail.com';

function renderTravelMenuItem() {
    return render(
        <OnyxListItemProvider>
            <LocaleContextProvider>
                <TravelMenuItem />
            </LocaleContextProvider>
        </OnyxListItemProvider>,
    );
}

/**
 * Seeds a fully travel-provisioned workspace (terms accepted, Spotnana configured) that the
 * current user belongs to, with the given role.
 */
async function setUpTravelWorkspaceWithRole(role: string) {
    await Onyx.multiSet({
        [ONYXKEYS.SESSION]: {email: CURRENT_USER_EMAIL, accountID: 858031},
        [ONYXKEYS.NVP_ACTIVE_POLICY_ID]: POLICY_ID,
        [`${ONYXKEYS.COLLECTION.POLICY}${POLICY_ID}`]: {
            id: POLICY_ID,
            name: 'Travel Workspace',
            type: CONST.POLICY.TYPE.CORPORATE,
            role,
            isTravelEnabled: true,
            employeeList: {[CURRENT_USER_EMAIL]: {role}},
            travelSettings: {hasAcceptedTerms: true, spotnanaCompanyID: 'spotnana85803'},
        },
    });
}

describe('Issue 85803 - Travel quick action is gated on the user being a workspace admin', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        await Onyx.clear();
    });

    it('shows the Travel item when the user is an admin of the travel-enabled workspace', async () => {
        await setUpTravelWorkspaceWithRole(CONST.POLICY.ROLE.ADMIN);

        renderTravelMenuItem();
        await waitForBatchedUpdatesWithAct();

        expect(screen.getByText('Book travel')).toBeOnTheScreen();
    });

    it('hides the Travel item after the user is demoted from Admin to Member', async () => {
        await setUpTravelWorkspaceWithRole(CONST.POLICY.ROLE.USER);

        renderTravelMenuItem();
        await waitForBatchedUpdatesWithAct();

        expect(screen.queryByText('Book travel')).not.toBeOnTheScreen();
    });
});
