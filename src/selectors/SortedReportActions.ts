import type {OnyxEntry} from 'react-native-onyx';
import type {SortedReportActionsDerivedValue} from '@src/types/onyx/DerivedValues';

const sortedActionsSelector = (value: OnyxEntry<SortedReportActionsDerivedValue>) => value?.sortedActions;

// eslint-disable-next-line import/prefer-default-export
export {sortedActionsSelector};
