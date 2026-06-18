import type {OnyxCollection} from 'react-native-onyx';
import {getAdminExpensifyCardFeedEntries, getExpensifyCardFeedDescription} from '@libs/ExpensifyCardFeedSelectorUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Card, CardList, Domain, ExpensifyCardSettings, Policy} from '@src/types/onyx';
import {createRandomExpensifyCard} from '../utils/collections/card';

const fundID = 5555;
const policyID = 'policy_other';
const workspacePolicyID = 'WS1';

function createDomain(email: string, accountID: number): Domain {
    return {
        validated: true,
        accountID,
        email,
        // Backend-provided key name; not camelCase in Onyx data.
        // eslint-disable-next-line @typescript-eslint/naming-convention
        domain_defaultSecurityGroupID: '0',
    };
}

function createCardList(...cards: Card[]): CardList {
    return Object.fromEntries(cards.map((card, index) => [`card${index}`, card]));
}

function createAdminPolicy(overrides: Partial<Policy> & Pick<Policy, 'id'>): Policy {
    return {
        name: 'Test Workspace',
        role: CONST.POLICY.ROLE.ADMIN,
        type: CONST.POLICY.TYPE.TEAM,
        owner: 'admin@workspace.com',
        outputCurrency: 'USD',
        isPolicyExpenseChatEnabled: false,
        ...overrides,
    };
}

function createPolicyCollection(policies: Policy[]): OnyxCollection<Policy> {
    return Object.fromEntries(policies.map((policy) => [`${ONYXKEYS.COLLECTION.POLICY}${policy.id.toUpperCase()}`, policy]));
}

describe('getExpensifyCardFeedDescription', () => {
    it('returns domainName from card settings root', () => {
        const settings: ExpensifyCardSettings = {domainName: 'example.com', isEnabled: true};
        expect(getExpensifyCardFeedDescription(settings, {})).toBe('example.com');
    });

    it('returns domainName nested under a program block when root is missing', () => {
        const settings: ExpensifyCardSettings = {
            [CONST.COUNTRY.US]: {isEnabled: true},
            [CONST.COUNTRY.GB]: {domainName: 'example.co.uk', isEnabled: true},
            hasOnceLoaded: true,
        };

        expect(getExpensifyCardFeedDescription(settings, {})).toBe('example.co.uk');
    });

    it('falls back to domain email when settings have no domainName', () => {
        const settings: ExpensifyCardSettings = {isEnabled: true};
        const domains: OnyxCollection<Domain> = {
            [`${ONYXKEYS.COLLECTION.DOMAIN}${fundID}`]: createDomain('+@company.com', fundID),
        };

        expect(getExpensifyCardFeedDescription(settings, {}, domains, fundID)).toBe('company.com');
    });

    it('falls back to card list domainName when settings and domain email are missing', () => {
        const settings: ExpensifyCardSettings = {isEnabled: true};
        const cardList = createCardList(
            createRandomExpensifyCard(1, {
                fundID: fundID.toString(),
                domainName: 'cards.example.com',
            }),
        );

        expect(getExpensifyCardFeedDescription(settings, {}, {}, fundID, cardList)).toBe('cards.example.com');
    });

    it('falls back to workspace policy owner domain when fundID matches policyAccountID', () => {
        const settings: ExpensifyCardSettings = {isEnabled: true};
        const policies = createPolicyCollection([
            createAdminPolicy({
                id: policyID,
                policyAccountID: fundID,
            }),
        ]);

        expect(getExpensifyCardFeedDescription(settings, policies, {}, fundID)).toBe('workspace.com');
    });
});

describe('getAdminExpensifyCardFeedEntries', () => {
    const currentUserAccountID = 999;
    const orphanFundID = 1234;
    const orphanFeedSettings: ExpensifyCardSettings = {isEnabled: true, hasOnceLoaded: true};
    const cardSettingsCollection: OnyxCollection<ExpensifyCardSettings> = {
        [`${ONYXKEYS.COLLECTION.PRIVATE_EXPENSIFY_CARD_SETTINGS}${orphanFundID}`]: orphanFeedSettings,
    };
    const adminPolicyForFund = createPolicyCollection([
        createAdminPolicy({
            id: workspacePolicyID,
            policyAccountID: orphanFundID,
        }),
    ]);

    it('shows an orphan feed when the user administers a workspace whose policyAccountID matches the fundID', () => {
        const entries = getAdminExpensifyCardFeedEntries(cardSettingsCollection, adminPolicyForFund, {}, currentUserAccountID);

        expect(entries).toHaveLength(1);
        expect(entries.at(0)?.fundID).toBe(orphanFundID);
    });

    it('shows an orphan feed to a domain admin even when no Expensify Card is issued to the current user', () => {
        const domains: OnyxCollection<Domain> = {
            [`${ONYXKEYS.COLLECTION.DOMAIN}${orphanFundID}`]: {
                ...createDomain('+@company.com', orphanFundID),
                // Current user is listed as a domain admin
                // eslint-disable-next-line @typescript-eslint/naming-convention
                expensify_adminPermissions_0: currentUserAccountID,
            },
        };

        const entries = getAdminExpensifyCardFeedEntries(cardSettingsCollection, {}, domains, currentUserAccountID);

        expect(entries).toHaveLength(1);
        expect(entries.at(0)?.fundID).toBe(orphanFundID);
    });

    it('hides an orphan feed when the user is neither a domain admin nor admin of a matching workspace', () => {
        const unrelatedPolicy = createPolicyCollection([createAdminPolicy({id: 'UNRELATED', policyAccountID: 9999})]);

        const entries = getAdminExpensifyCardFeedEntries(cardSettingsCollection, unrelatedPolicy, {}, currentUserAccountID);

        expect(entries).toHaveLength(0);
    });

    it('ignores preferredPolicy: an orphan feed with only a preferredPolicy is hidden when the user has no admin standing for the fund', () => {
        const settingsWithPreferredPolicy: OnyxCollection<ExpensifyCardSettings> = {
            [`${ONYXKEYS.COLLECTION.PRIVATE_EXPENSIFY_CARD_SETTINGS}${orphanFundID}`]: {...orphanFeedSettings, preferredPolicy: workspacePolicyID},
        };
        const unrelatedPolicy = createPolicyCollection([createAdminPolicy({id: 'UNRELATED', policyAccountID: 9999})]);

        const entries = getAdminExpensifyCardFeedEntries(settingsWithPreferredPolicy, unrelatedPolicy, {}, currentUserAccountID);

        expect(entries).toHaveLength(0);
    });

    it('shows a feed with linkedPolicyIDs when the user administers a linked policy', () => {
        const settingsWithLinkedPolicies: OnyxCollection<ExpensifyCardSettings> = {
            [`${ONYXKEYS.COLLECTION.PRIVATE_EXPENSIFY_CARD_SETTINGS}${orphanFundID}`]: {...orphanFeedSettings, linkedPolicyIDs: [workspacePolicyID]},
        };

        const entries = getAdminExpensifyCardFeedEntries(settingsWithLinkedPolicies, adminPolicyForFund, {}, currentUserAccountID);

        expect(entries).toHaveLength(1);
    });
});
