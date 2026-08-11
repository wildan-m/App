import type IconAsset from '@src/types/utils/IconAsset';

type Feature = {
    id: string;
    title: string;
    icon: IconAsset;
    enabledByDefault?: boolean;
    requiresUpdate?: boolean;
    enabled?: boolean;
};

type SectionObject = {
    titleTranslationKey: string;
    items: Feature[];
};

export type {Feature, SectionObject};
