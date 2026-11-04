import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useThemeStyles from '@hooks/useThemeStyles';

import type UseSecuritySettingsSectionIllustration from './types';

const useSecuritySettingsSectionIllustration: UseSecuritySettingsSectionIllustration = () => {
    const {Safe: safeIllustration} = useMemoizedLazyIllustrations(['Safe']);
    const styles = useThemeStyles();

    return {
        illustration: safeIllustration,
        illustrationStyle: styles.securitySettingsStaticIllustration,
    };
};

export default useSecuritySettingsSectionIllustration;
