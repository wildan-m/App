import {CommonActions} from '@react-navigation/native';
import cleanStaleReportActionBackToParam from '@src/pages/inbox/cleanStaleReportActionBackToParam';

const mockDispatch = jest.fn();

jest.mock('@libs/Navigation/navigationRef', () => ({
    __esModule: true,
    default: {
        current: {
            getRootState: () => ({
                key: 'root',
                routes: [
                    {
                        key: 'route-1',
                        name: 'Report',
                        params: {backTo: ''},
                    },
                ],
            }),
            dispatch: (...args: unknown[]) => mockDispatch(...args),
        },
    },
}));

// Dynamically update the backTo param for each test
function setBackTo(value: string) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const navRef = require('@libs/Navigation/navigationRef').default;
    navRef.current.getRootState = () => ({
        key: 'root',
        routes: [
            {
                key: 'route-1',
                name: 'Report',
                params: {backTo: value},
            },
        ],
    });
}

describe('cleanStaleReportActionBackToParam', () => {
    beforeEach(() => {
        mockDispatch.mockClear();
    });

    it('does not match when stale segment is a prefix of a longer reportActionID', () => {
        // backTo contains r/111/2225 — stale segment r/111/222 should NOT match
        setBackTo('/r/111/2225');
        cleanStaleReportActionBackToParam('111', '222');

        expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('matches when stale segment is followed by a query param', () => {
        setBackTo('/r/111/222?param=1');
        cleanStaleReportActionBackToParam('111', '222');

        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                ...CommonActions.setParams({backTo: '/r/111?param=1'}),
                source: 'route-1',
                target: 'root',
            }),
        );
    });

    it('matches when stale segment is followed by a slash', () => {
        setBackTo('/r/111/222/details');
        cleanStaleReportActionBackToParam('111', '222');

        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                ...CommonActions.setParams({backTo: '/r/111/details'}),
                source: 'route-1',
                target: 'root',
            }),
        );
    });

    it('matches when stale segment is at end of string', () => {
        setBackTo('/r/111/222');
        cleanStaleReportActionBackToParam('111', '222');

        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                ...CommonActions.setParams({backTo: '/r/111'}),
                source: 'route-1',
                target: 'root',
            }),
        );
    });
});
