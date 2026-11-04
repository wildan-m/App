import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useThemeStyles from '@hooks/useThemeStyles';

import type UseWalletSectionIllustration from './types';

const useWalletSectionIllustration: UseWalletSectionIllustration = () => {
    const {BigVault: bigVaultIllustration} = useMemoizedLazyIllustrations(['BigVault']);
    const styles = useThemeStyles();

    return {
        illustration: bigVaultIllustration,
        illustrationStyle: styles.walletStaticIllustration,
    };
};

export default useWalletSectionIllustration;
