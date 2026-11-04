import type {LocaleContextProps} from '@components/LocaleContextProvider';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';

import CONST from '@src/CONST';

/**
 * Retrieves SettlementButton payment methods.
 */
const useSettlementButtonPaymentMethods = (hasActivatedWallet: boolean, translate: LocaleContextProps['translate']) => {
    const {User: userIcon, Building: buildingIcon, CheckCircle: checkCircleIcon} = useMemoizedLazyExpensifyIcons(['User', 'Building', 'CheckCircle']);

    const paymentMethods = {
        [CONST.PAYMENT_METHODS.PERSONAL_BANK_ACCOUNT]: {
            text: hasActivatedWallet ? translate('iou.settleWallet', '') : translate('iou.settlePersonal', ''),
            icon: userIcon,
            value: CONST.PAYMENT_METHODS.PERSONAL_BANK_ACCOUNT,
            key: CONST.PAYMENT_METHODS.PERSONAL_BANK_ACCOUNT,
        },
        [CONST.PAYMENT_METHODS.BUSINESS_BANK_ACCOUNT]: {
            text: translate('iou.settleBusiness', ''),
            icon: buildingIcon,
            value: CONST.PAYMENT_METHODS.BUSINESS_BANK_ACCOUNT,
            shouldUpdateSelectedIndex: false,
            key: CONST.PAYMENT_METHODS.BUSINESS_BANK_ACCOUNT,
        },
        [CONST.IOU.PAYMENT_TYPE.ELSEWHERE]: {
            text: translate('iou.payElsewhere', ''),
            icon: checkCircleIcon,
            value: CONST.IOU.PAYMENT_TYPE.ELSEWHERE,
            shouldUpdateSelectedIndex: false,
            key: CONST.IOU.PAYMENT_TYPE.ELSEWHERE,
        },
    };

    return paymentMethods;
};

export default useSettlementButtonPaymentMethods;
