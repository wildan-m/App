import {Str} from 'expensify-common';
import type {OnyxCollection, OnyxEntry} from 'react-native-onyx';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import {isAdminSelector} from '@src/selectors/Domain';
import type {CardList, Domain, ExpensifyCardSettings, Policy} from '@src/types/onyx';
import {
    getDomainNameFromExpensifyCardSettings,
    getFundIdFromSettingsKey,
    getLinkedPolicyIDsFromExpensifyCardSettings,
    getPreferredPolicyFromExpensifyCardSettings,
    isPolicyIDInLinkedExpensifyCardPolicyList,
} from './CardUtils';
import {getDescriptionForPolicyDomainCard, isPolicyAdmin} from './PolicyUtils';

type ExpensifyCardFeedEntry = {
    settingsKey: string;
    fundID: number;
    settings: ExpensifyCardSettings;
};

function hasLoadedExpensifyCardSettings(settings: ExpensifyCardSettings | undefined): boolean {
    return !!settings && Object.keys(settings).length > 1;
}

/**
 * Determines whether an Expensify card feed should be visible to the current user.
 *
 * Visibility is decided purely from the user's admin standing for the feed, never from
 * `preferredPolicy` or from whether a card has been issued in the current user's own card list:
 *  1. If the feed has `linkedPolicyIDs`, show it when the user is an admin of at least one
 *     linked policy that is not pending deletion.
 *  2. Otherwise show it when the user is a domain admin for the domain whose ID matches the
 *     fundID, or when any non-deleted policy the user administers has a `policyAccountID`
 *     equal to the fundID (i.e. the fund backs that workspace).
 *
 * Each feed is enumerated once by the caller, so a domain admin always sees every feed on
 * their domain exactly once — no per-workspace duplication and no hiding of feeds with no
 * card issued to the current user.
 */
function isExpensifyCardFeedVisibleToAdmin(
    settings: ExpensifyCardSettings,
    policies: OnyxCollection<Policy>,
    fundID: number,
    domains: OnyxCollection<Domain>,
    currentUserAccountID: number,
): boolean {
    if (!hasLoadedExpensifyCardSettings(settings)) {
        return false;
    }
    const linkedPolicyIDs = getLinkedPolicyIDsFromExpensifyCardSettings(settings);
    if (linkedPolicyIDs?.length) {
        return linkedPolicyIDs.some((linkedPolicyID) => {
            const policy = policies?.[`${ONYXKEYS.COLLECTION.POLICY}${linkedPolicyID.toUpperCase()}`];
            return isPolicyAdmin(policy) && policy?.pendingAction !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE;
        });
    }

    const domain = domains?.[`${ONYXKEYS.COLLECTION.DOMAIN}${fundID}`] ?? Object.values(domains ?? {}).find((entry) => entry?.accountID === fundID);
    if (isAdminSelector(currentUserAccountID)(domain)) {
        return true;
    }

    return Object.values(policies ?? {}).some(
        (policy) => policy?.policyAccountID === fundID && isPolicyAdmin(policy) && policy?.pendingAction !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE,
    );
}

function isFeedLinkedToPolicy(entry: ExpensifyCardFeedEntry, policyID: string): boolean {
    return isPolicyIDInLinkedExpensifyCardPolicyList(getLinkedPolicyIDsFromExpensifyCardSettings(entry.settings), policyID);
}

/** Primary vs other is decided solely by linkedPolicyIDs: the feed is primary for the active policy only when that policy is in its linked list. */
function isFeedPrimaryForPolicy(entry: ExpensifyCardFeedEntry, policyID: string): boolean {
    return isFeedLinkedToPolicy(entry, policyID);
}

function getAdminExpensifyCardFeedEntries(
    cardSettingsCollection: OnyxCollection<ExpensifyCardSettings>,
    policies: OnyxCollection<Policy>,
    domains: OnyxCollection<Domain>,
    currentUserAccountID: number,
): ExpensifyCardFeedEntry[] {
    return Object.entries(cardSettingsCollection ?? {}).flatMap(([settingsKey, settings]) => {
        if (!settings) {
            return [];
        }
        const fundID = getFundIdFromSettingsKey(settingsKey);
        if (!isExpensifyCardFeedVisibleToAdmin(settings, policies, fundID, domains, currentUserAccountID)) {
            return [];
        }
        return [{settingsKey, fundID, settings}];
    });
}

function partitionExpensifyCardFeedsForSelector(entries: ExpensifyCardFeedEntry[], policyID: string): {primary: ExpensifyCardFeedEntry[]; other: ExpensifyCardFeedEntry[]} {
    if (entries.length === 0) {
        return {primary: [], other: []};
    }
    const primary = entries.filter((e) => isFeedPrimaryForPolicy(e, policyID));
    const other = entries.filter((e) => !isFeedPrimaryForPolicy(e, policyID));
    return {primary, other};
}

function getExpensifyCardFeedDescription(
    cardSettings: OnyxEntry<ExpensifyCardSettings>,
    policies: OnyxCollection<Policy>,
    domains?: OnyxCollection<Domain>,
    fundID?: number,
    cardList?: CardList,
): string {
    const domainNameFromSettings = getDomainNameFromExpensifyCardSettings(cardSettings);
    if (domainNameFromSettings) {
        return getDescriptionForPolicyDomainCard(domainNameFromSettings, policies);
    }

    const linkedPolicyIDs = getLinkedPolicyIDsFromExpensifyCardSettings(cardSettings);
    const preferredPolicyID = getPreferredPolicyFromExpensifyCardSettings(cardSettings);
    const policyIDForName = linkedPolicyIDs?.length ? linkedPolicyIDs.at(0) : preferredPolicyID;
    const policyName = policyIDForName && policies?.[`${ONYXKEYS.COLLECTION.POLICY}${policyIDForName.toUpperCase()}`]?.name;
    if (policyName) {
        return policyName;
    }

    if (!fundID) {
        return '';
    }

    const domainEntry = domains?.[`${ONYXKEYS.COLLECTION.DOMAIN}${fundID}`] ?? Object.values(domains ?? {}).find((entry) => entry?.accountID === fundID);
    if (domainEntry?.email) {
        return getDescriptionForPolicyDomainCard(Str.extractEmailDomain(domainEntry.email), policies);
    }

    const cardDomainName = Object.values(cardList ?? {}).find((card) => card?.fundID === fundID.toString() && card.bank === CONST.EXPENSIFY_CARD.BANK)?.domainName;
    if (cardDomainName) {
        return getDescriptionForPolicyDomainCard(cardDomainName, policies);
    }

    const policyOwner = Object.values(policies ?? {}).find((policy) => policy?.policyAccountID === fundID)?.owner;
    return policyOwner ? getDescriptionForPolicyDomainCard(Str.extractEmailDomain(policyOwner), policies) : '';
}

export {getAdminExpensifyCardFeedEntries, getExpensifyCardFeedDescription, partitionExpensifyCardFeedsForSelector, type ExpensifyCardFeedEntry};
