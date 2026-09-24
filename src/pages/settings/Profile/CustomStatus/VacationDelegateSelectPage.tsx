import BaseVacationDelegateSelectionComponent from '@components/BaseVacationDelegateSelectionComponent';
import ScreenWrapper from '@components/ScreenWrapper';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import {setDraftValues} from '@libs/actions/FormActions';
import Navigation from '@libs/Navigation/Navigation';

import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import INPUT_IDS from '@src/types/form/VacationDelegateForm';
import type {Participant} from '@src/types/onyx/IOU';

import React from 'react';

function VacationDelegateSelectPage() {
    const {translate} = useLocalize();

    const [vacationDelegate] = useOnyx(ONYXKEYS.NVP_PRIVATE_VACATION_DELEGATE);
    const [draftDelegate] = useOnyx(ONYXKEYS.FORMS.VACATION_DELEGATE_FORM_DRAFT, {selector: (draft) => draft?.[INPUT_IDS.DELEGATE]});

    // Picking a delegate only fills in the vacation delegate form, which saves it together with its clear after date.
    const onSelectRow = (option: Participant) => {
        setDraftValues(ONYXKEYS.FORMS.VACATION_DELEGATE_FORM, {[INPUT_IDS.DELEGATE]: option?.login ?? ''});
        Navigation.goBack(ROUTES.SETTINGS_VACATION_DELEGATE);
    };

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom={false}
            testID="VacationDelegateSelectPage"
            shouldShowOfflineIndicator={false}
        >
            <BaseVacationDelegateSelectionComponent
                vacationDelegate={{...vacationDelegate, delegate: draftDelegate ?? vacationDelegate?.delegate, previousDelegate: undefined}}
                onSelectRow={onSelectRow}
                headerTitle={translate('statusPage.chooseDelegate')}
                onBackButtonPress={() => Navigation.goBack(ROUTES.SETTINGS_VACATION_DELEGATE)}
                cannotSetDelegateMessage={translate('statusPage.cannotSetVacationDelegate')}
                includeCurrentUser={false}
            />
        </ScreenWrapper>
    );
}

export default VacationDelegateSelectPage;
