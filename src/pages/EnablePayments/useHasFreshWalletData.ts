import {useEffect, useRef, useState} from 'react';

function useHasFreshWalletData(isOffline: boolean, isLoading: boolean | undefined): boolean {
    const wasLoadingRef = useRef(false);
    const [hasFreshData, setHasFreshData] = useState(false);

    useEffect(() => {
        if (isOffline) {
            return;
        }

        if (isLoading) {
            wasLoadingRef.current = true;
            return;
        }

        if (!wasLoadingRef.current) {
            return;
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect -- we need to trigger a re-render when fresh data arrives to stop showing the loading indicator
        setHasFreshData(true);
    }, [isOffline, isLoading]);

    return hasFreshData;
}

export default useHasFreshWalletData;
