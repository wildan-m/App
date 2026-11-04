import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useThemeStyles from '@hooks/useThemeStyles';

import type UseGenericEmptyStateIllustration from './types';

const useGenericEmptyStateIllustration: UseGenericEmptyStateIllustration = () => {
    const {FolderWithPapersAndWatch: folderWithPapersAndWatchIllustration} = useMemoizedLazyIllustrations(['FolderWithPapersAndWatch']);
    const styles = useThemeStyles();

    return {
        headerMedia: folderWithPapersAndWatchIllustration,
        headerContentStyles: [styles.emptyStateFolderStaticIllustration],
    };
};

export default useGenericEmptyStateIllustration;
