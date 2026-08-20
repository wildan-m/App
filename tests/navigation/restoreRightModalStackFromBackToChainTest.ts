import getAdaptedStateFromPath from '@libs/Navigation/helpers/getAdaptedStateFromPath';

import NAVIGATORS from '@src/NAVIGATORS';
import SCREENS from '@src/SCREENS';

import type {NavigationState, PartialState} from '@react-navigation/native';

function getRightModalRouteNames(state: ReturnType<typeof getAdaptedStateFromPath>) {
    const rightModalRoute = state?.routes?.find((route) => route.name === NAVIGATORS.RIGHT_MODAL_NAVIGATOR);
    const rightModalState = rightModalRoute?.state as PartialState<NavigationState> | undefined;
    return rightModalState?.routes?.map((route) => route.name) ?? [];
}

describe('getAdaptedStateFromPath - right modal stack restored from the backTo chain', () => {
    it('keeps the expense report RHP under the transaction thread opened from it', () => {
        const expenseReportRoute = `/e/2222?backTo=${encodeURIComponent('/r/1111')}`;
        const state = getAdaptedStateFromPath(`/search/view/3333?backTo=${encodeURIComponent(expenseReportRoute)}`, undefined);

        expect(getRightModalRouteNames(state)).toEqual([SCREENS.RIGHT_MODAL.EXPENSE_REPORT, SCREENS.RIGHT_MODAL.SEARCH_REPORT]);
        expect(state?.routes?.at(0)?.name).toBe(NAVIGATORS.TAB_NAVIGATOR);
    });

    it('leaves the stack untouched when the backTo points at a full screen route', () => {
        const state = getAdaptedStateFromPath(`/search/view/3333?backTo=${encodeURIComponent('/r/1111')}`, undefined);

        expect(getRightModalRouteNames(state)).toEqual([SCREENS.RIGHT_MODAL.SEARCH_REPORT]);
    });

    it('leaves the stack untouched when there is no backTo param', () => {
        const state = getAdaptedStateFromPath('/search/view/3333', undefined);

        expect(getRightModalRouteNames(state)).toEqual([SCREENS.RIGHT_MODAL.SEARCH_REPORT]);
    });
});
