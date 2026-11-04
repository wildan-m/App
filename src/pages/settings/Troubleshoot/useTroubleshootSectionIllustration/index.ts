import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useThemeStyles from '@hooks/useThemeStyles';

import type UseTroubleshootSectionIllustration from './types';

const useTroubleshootSectionIllustration: UseTroubleshootSectionIllustration = () => {
    const {WorkspaceScene: workspaceSceneIllustration} = useMemoizedLazyIllustrations(['WorkspaceScene']);
    const styles = useThemeStyles();

    return {
        illustration: workspaceSceneIllustration,
        illustrationStyle: styles.troubleshootStaticIllustration,
    };
};

export default useTroubleshootSectionIllustration;
