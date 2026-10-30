import getReportRouteForCurrentContext from '@libs/Navigation/helpers/getReportRouteForCurrentContext';
import Navigation from '@libs/Navigation/Navigation';

import useSidePanelActions from './useSidePanelActions';

/**
 * Returns a callback that opens the thread Concierge answers a question in: in the side panel when the question
 * was asked there, otherwise in the main pane.
 */
function useOpenConciergeThread(isInSidePanel: boolean) {
    const {openSidePanel} = useSidePanelActions();

    return (conciergeThreadReportID: string) => {
        if (isInSidePanel) {
            openSidePanel({reportID: conciergeThreadReportID});
            return;
        }
        Navigation.navigate(getReportRouteForCurrentContext({reportID: conciergeThreadReportID}));
    };
}

export default useOpenConciergeThread;
