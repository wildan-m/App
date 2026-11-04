import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useThemeStyles from '@hooks/useThemeStyles';

import type UsePreferencesSectionIllustration from './types';

const usePreferencesSectionIllustration: UsePreferencesSectionIllustration = () => {
    const {DjBoothReferenceHands: djBoothReferenceHandsIllustration} = useMemoizedLazyIllustrations(['DjBoothReferenceHands']);
    const styles = useThemeStyles();

    return {
        illustration: djBoothReferenceHandsIllustration,
        illustrationStyle: styles.preferencesStaticIllustration,
    };
};

export default usePreferencesSectionIllustration;
