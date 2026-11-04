import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useThemeStyles from '@hooks/useThemeStyles';

import type UseAboutSectionIllustration from './types';

const useAboutSectionIllustration: UseAboutSectionIllustration = () => {
    const {TiltedCoinExpensify: tiltedCoinExpensifyIllustration} = useMemoizedLazyIllustrations(['TiltedCoinExpensify']);
    const styles = useThemeStyles();

    return {
        illustration: tiltedCoinExpensifyIllustration,
        illustrationStyle: styles.aboutStaticIllustration,
    };
};

export default useAboutSectionIllustration;
