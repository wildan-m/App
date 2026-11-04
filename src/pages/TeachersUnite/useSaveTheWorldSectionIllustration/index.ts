import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useThemeStyles from '@hooks/useThemeStyles';

import type UseSaveTheWorldSectionIllustration from './types';

const useSaveTheWorldSectionIllustration: UseSaveTheWorldSectionIllustration = () => {
    const {SaveTheWorldScale: saveTheWorldScaleIllustration} = useMemoizedLazyIllustrations(['SaveTheWorldScale']);
    const styles = useThemeStyles();

    return {
        illustration: saveTheWorldScaleIllustration,
        illustrationStyle: styles.saveTheWorldStaticIllustration,
    };
};

export default useSaveTheWorldSectionIllustration;
