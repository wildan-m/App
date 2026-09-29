import type CONST from '@src/CONST';

import type {ValueOf} from 'type-fest';

type UpdateBusinessCentralPostingModeParams = {
    policyID: string;
    postingMode: ValueOf<typeof CONST.BUSINESS_CENTRAL_POSTING_MODE>;
};

export default UpdateBusinessCentralPostingModeParams;
