import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useThemeStyles from '@hooks/useThemeStyles';

import type UseSearchEmptyStateIllustration from './types';

const useSearchEmptyStateIllustration: UseSearchEmptyStateIllustration = () => {
    const {
        Fireworks: fireworksIllustration,
        FolderWithPapersAndWatch: folderWithPapersAndWatchIllustration,
        EmptyStateSearchExpenses: emptyStateSearchExpensesIllustration,
    } = useMemoizedLazyIllustrations(['Fireworks', 'FolderWithPapersAndWatch', 'EmptyStateSearchExpenses']);
    const styles = useThemeStyles();

    return {
        fireworks: {
            headerMedia: fireworksIllustration,
            headerContentStyles: [styles.emptyStateFireworksStaticIllustration],
        },
        folder: {
            headerMedia: folderWithPapersAndWatchIllustration,
            headerContentStyles: [styles.emptyStateFolderStaticIllustration],
        },
        expenses: {
            headerMedia: emptyStateSearchExpensesIllustration,
            headerContentStyles: [styles.emptyStateFolderStaticIllustration],
        },
    };
};

export default useSearchEmptyStateIllustration;
