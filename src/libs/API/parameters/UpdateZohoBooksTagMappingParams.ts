import type CONST from '@src/CONST';

import type {ValueOf} from 'type-fest';

type UpdateZohoBooksTagMappingParams = {
    /** The workspace where the tag mapping is updated. */
    policyID: string;

    /** The Zoho Books reporting tag to map. */
    tagID: string;

    /** The Expensify dimension mapped to the Zoho Books reporting tag. */
    mapping: ValueOf<typeof CONST.ZOHO_BOOKS_MAPPING_VALUE>;
};

export default UpdateZohoBooksTagMappingParams;
