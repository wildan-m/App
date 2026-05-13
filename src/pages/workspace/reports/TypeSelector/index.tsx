import {Str} from 'expensify-common';
import type {ForwardedRef} from 'react';
import React from 'react';
import {View} from 'react-native';
import type {MenuItemBaseProps} from '@components/MenuItem';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import useLocalize from '@hooks/useLocalize';
import Navigation from '@libs/Navigation/Navigation';
import {getReportFieldTypeTranslationKey} from '@libs/WorkspaceReportFieldUtils';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import type {PolicyReportFieldType} from '@src/types/onyx/Policy';

type TypeSelectorProps = Pick<MenuItemBaseProps, 'label' | 'rightLabel' | 'errorText'> & {
    /** Currently selected type */
    value?: string;

    /** The policy ID this report field belongs to */
    policyID: string;

    /**
     * InputWrapper injects this for FormProvider integration. The new flow writes the selected type
     * directly to the WORKSPACE_REPORT_FIELDS_FORM draft from the type selector screen, so this is
     * unused — but accepting it keeps the component compatible with InputWrapper's expected shape.
     */
    onInputChange?: (value: string) => void;

    /** Reference to the outer element */
    ref?: ForwardedRef<View>;
};

function TypeSelector({value, policyID, label = '', rightLabel, errorText = '', ref}: TypeSelectorProps) {
    const {translate} = useLocalize();

    const openTypeSelector = () => {
        Navigation.navigate(ROUTES.WORKSPACE_REPORT_FIELDS_TYPE_SELECTOR.getRoute(policyID));
    };

    return (
        <View>
            <MenuItemWithTopDescription
                ref={ref}
                shouldShowRightIcon
                title={value ? Str.recapitalize(translate(getReportFieldTypeTranslationKey(value as PolicyReportFieldType))) : ''}
                description={label}
                rightLabel={rightLabel}
                brickRoadIndicator={errorText ? CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR : undefined}
                errorText={errorText}
                onPress={openTypeSelector}
            />
        </View>
    );
}

export default TypeSelector;
