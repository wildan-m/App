import type {OfflineWithFeedbackProps} from '@components/OfflineWithFeedback';

type HRSettingRow = {
    title: string;
    description: string;
    route: string;
    pendingAction?: OfflineWithFeedbackProps['pendingAction'];
};

export type {HRSettingRow};
