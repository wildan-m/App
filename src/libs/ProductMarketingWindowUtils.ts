import type {IllustrationName} from '@components/Icon/IllustrationLoader';

import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';
import ROUTES from '@src/ROUTES';
import type {Route} from '@src/ROUTES';
import type {Policy} from '@src/types/onyx';
import type Beta from '@src/types/onyx/Beta';

import type {ImageSourcePropType} from 'react-native';
import type {OnyxEntry} from 'react-native-onyx';

import {hasVendorFeature} from './PolicyUtils';

type ProductMarketingAnnouncementVisual =
    | {
          type: 'image';
          source: ImageSourcePropType;
      }
    | {
          type: 'illustration';
          name: IllustrationName;
      };

/**
 * Everything a variant's CTA is allowed to branch on when building its destination. Supplied by
 * ProductMarketingWindowManager so each release can route on the user's situation (which workspace the CTA
 * targets, whether the promoted feature is already available) without the manager knowing what is being promoted.
 */
type ProductMarketingAnnouncementCtaContext = {
    /** The active workspace the user is an admin on, which admin CTAs target. Undefined for the member variant. */
    adminPolicy?: Policy;

    /** Beta check, so a CTA can go straight to a feature the user already has instead of to where they can turn it on. */
    isBetaEnabled: (beta: Beta) => boolean;
};

/** One audience-specific content variant of a product marketing announcement. All content is authored by marketing per release. */
type ProductMarketingAnnouncementVariant = {
    /** Marketing-supplied product screenshot or fallback illustration shown at the top of the window. */
    visual: ProductMarketingAnnouncementVisual;

    /** Short, bolded heading describing the feature being promoted. */
    heading: TranslationPaths;

    /** 1–2 sentences describing the feature and its benefit. */
    body: TranslationPaths;

    /** Label of the primary CTA button. */
    ctaLabel: TranslationPaths;

    /** Builds the route the primary CTA navigates to. */
    getCtaRoute: (context: ProductMarketingAnnouncementCtaContext) => Route;
};

/** A single product marketing announcement with audience-targeted content variants. */
type ProductMarketingAnnouncement = {
    /** Stable key shared by every audience variant of this product update. A later update must use a new key. */
    updateKey: string;

    /** Variant shown to users who are an admin on at least one active workspace. Admin prevails when a user is both member and admin. */
    admin: ProductMarketingAnnouncementVariant;

    /** Optional variant shown to users without an admin role on any active workspace. */
    member?: ProductMarketingAnnouncementVariant;
};

/**
 * The single active product marketing announcement, or null when no window should be shown.
 * Only one announcement can be active at a time — there is no stacking or queueing. When the active
 * announcement is dismissed, nothing is shown until a later release replaces it with a new update key.
 */
const ACTIVE_PRODUCT_MARKETING_ANNOUNCEMENT: ProductMarketingAnnouncement | null = {
    updateKey: 'productUpdateAugust2026',
    admin: {
        visual: {type: 'illustration', name: 'Accounting'},
        heading: 'productMarketingWindow.august2026.admin.heading',
        body: 'productMarketingWindow.august2026.admin.body',
        ctaLabel: 'productMarketingWindow.august2026.cta',
        // Admins who already have vendor matching on this workspace go straight to their vendor list; everyone else
        // lands on More features, where the Vendors toggle they need to turn on lives.
        getCtaRoute: ({adminPolicy, isBetaEnabled}) =>
            hasVendorFeature(adminPolicy, isBetaEnabled(CONST.BETAS.VENDOR_MATCHING))
                ? ROUTES.WORKSPACE_VENDORS.getRoute(adminPolicy?.id)
                : ROUTES.WORKSPACE_MORE_FEATURES.getRoute(adminPolicy?.id),
    },
    member: {
        visual: {type: 'illustration', name: 'AgentsIceCream'},
        heading: 'productMarketingWindow.august2026.member.heading',
        body: 'productMarketingWindow.august2026.member.body',
        ctaLabel: 'productMarketingWindow.august2026.cta',
        getCtaRoute: () => ROUTES.SETTINGS_AGENTS_NEW.getRoute(),
    },
};

/** Whether the given announcement was already dismissed by the user. */
function isProductMarketingAnnouncementDismissed(announcement: ProductMarketingAnnouncement | null, lastDismissedMarketingWindow: OnyxEntry<string>): boolean {
    return !!announcement && announcement.updateKey === lastDismissedMarketingWindow;
}

/**
 * Resolves the content variant of the announcement the user should see, or undefined when no window should be shown.
 * Dismissal never falls through to another announcement — when the active announcement is dismissed, nothing is shown.
 */
function getProductMarketingAnnouncementVariant(
    announcement: ProductMarketingAnnouncement | null,
    hasActiveAdminPolicies: boolean,
    lastDismissedMarketingWindow: OnyxEntry<string>,
): ProductMarketingAnnouncementVariant | undefined {
    if (!announcement || isProductMarketingAnnouncementDismissed(announcement, lastDismissedMarketingWindow)) {
        return undefined;
    }
    return hasActiveAdminPolicies ? announcement.admin : announcement.member;
}

export {ACTIVE_PRODUCT_MARKETING_ANNOUNCEMENT, isProductMarketingAnnouncementDismissed, getProductMarketingAnnouncementVariant};
export type {ProductMarketingAnnouncement, ProductMarketingAnnouncementCtaContext, ProductMarketingAnnouncementVariant};
