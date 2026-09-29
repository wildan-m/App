import type {CONST as COMMON_CONST} from 'expensify-common';
import type {ValueOf} from 'type-fest';

type UpdateBusinessCentralAccountingMethodParams = {
    policyID: string;
    accountingMethod: ValueOf<typeof COMMON_CONST.INTEGRATIONS.ACCOUNTING_METHOD>;
};

export default UpdateBusinessCentralAccountingMethodParams;
