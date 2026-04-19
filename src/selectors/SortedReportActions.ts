import type {OnyxEntry} from 'react-native-onyx';
import type {SortedReportActionsDerivedValue} from '@src/types/onyx/DerivedValues';

const sortedActionsSelector = (value: OnyxEntry<SortedReportActionsDerivedValue>) => value?.sortedActions;

export {sortedActionsSelector};
