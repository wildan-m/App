import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useThemeStyles from '@hooks/useThemeStyles';

import type UseEmptyLHNIllustration from './types';

const useEmptyLHNIllustration: UseEmptyLHNIllustration = () => {
    const {Fireworks: fireworksIllustration} = useMemoizedLazyIllustrations(['Fireworks']);
    const styles = useThemeStyles();

    return {
        icon: fireworksIllustration,
        iconWidth: styles.emptyStateFireworksStaticIllustration.width,
        iconHeight: styles.emptyStateFireworksStaticIllustration.height,
    };
};

export default useEmptyLHNIllustration;
