import * as API from '@libs/API';
import type {SetPolicyVendorsEnabledParams} from '@libs/API/parameters';
import {WRITE_COMMANDS} from '@libs/API/types';

import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy} from '@src/types/onyx';
import type {OnyxData} from '@src/types/onyx/Request';

import type {OnyxEntry} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

/**
 * Enables or disables a set of imported vendors for the workspace. Disabled vendors are recorded in
 * the policy-level `disabledVendors` map (keyed by vendor external ID) so accounting re-syncs, which
 * only rewrite `connections.*.data`, never reset an admin's toggles. Enabling a vendor removes its
 * key from the map, keeping "absent = enabled" as the default for newly imported vendors.
 */
function setPolicyVendorsEnabled(policy: OnyxEntry<Policy>, vendorIDs: string[], enabled: boolean) {
    const policyID = policy?.id;
    if (!policyID || vendorIDs.length === 0) {
        return;
    }

    const previousDisabledVendors = policy?.disabledVendors ?? {};

    const optimisticDisabledVendors = vendorIDs.reduce<Record<string, boolean | null>>((acc, vendorID) => {
        acc[vendorID] = enabled ? null : true;
        return acc;
    }, {});

    const failureDisabledVendors = vendorIDs.reduce<Record<string, boolean | null>>((acc, vendorID) => {
        acc[vendorID] = previousDisabledVendors[vendorID] ?? null;
        return acc;
    }, {});

    const onyxData: OnyxData<typeof ONYXKEYS.COLLECTION.POLICY> = {
        optimisticData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
                value: {
                    disabledVendors: optimisticDisabledVendors,
                },
            },
        ],
        failureData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
                value: {
                    disabledVendors: failureDisabledVendors,
                },
            },
        ],
    };

    const parameters: SetPolicyVendorsEnabledParams = {
        policyID,
        vendors: JSON.stringify(vendorIDs.map((vendorID) => ({vendorID, enabled}))),
    };

    API.write(WRITE_COMMANDS.SET_POLICY_VENDORS_ENABLED, parameters, onyxData);
}

// eslint-disable-next-line import/prefer-default-export
export {setPolicyVendorsEnabled};
