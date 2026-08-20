import type CONST from '@src/CONST';

import type {ValueOf} from 'type-fest';

type UpdateBusinessCentralDimensionMappingParams = {
    /** The workspace where the dimension mapping is updated. */
    policyID: string;

    /** The Business Central dimension to map. */
    dimensionID: string;

    /** The Expensify dimension mapped to the Business Central dimension. */
    mapping: ValueOf<typeof CONST.BUSINESS_CENTRAL_MAPPING_VALUE>;
};

export default UpdateBusinessCentralDimensionMappingParams;
