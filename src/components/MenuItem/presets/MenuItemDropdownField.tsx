import FormHelpMessage from '@components/FormHelpMessage';
import Icon from '@components/Icon';
import MenuItemContent from '@components/MenuItem/layout/MenuItemContent';
import MenuItemRoot from '@components/MenuItem/layout/MenuItemRoot';
import MenuItemRow from '@components/MenuItem/layout/MenuItemRow';
import MenuItemTrailing from '@components/MenuItem/layout/MenuItemTrailing';
import MenuItemRightLabel from '@components/MenuItem/leaves/trailing/MenuItemRightLabel';
import Text from '@components/Text';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import variables from '@styles/variables';

import {callFunctionIfActionIsAllowed} from '@userActions/Session';

import type WithSentryLabel from '@src/types/utils/SentryLabel';
import type WithTestID from '@src/types/utils/TestID';

import type {ReactNode} from 'react';
import type {GestureResponderEvent} from 'react-native';

import React from 'react';
import {View} from 'react-native';

type MenuItemDropdownFieldProps = WithSentryLabel &
    WithTestID & {
        /** Name of the field, shown as placeholder text while empty and as the small top label once a value is set */
        label: string;

        /** The selected value, if any */
        value?: string;

        /** Custom element rendered in place of the plain-text value (e.g. attendee pills) */
        valueComponent?: ReactNode;

        /** Short trailing hint, such as a `Required` marker; only rendered while the field has no value */
        rightLabel?: string;

        /** Error text rendered below the field */
        errorText?: string;

        /** Function to fire when the field is pressed. When omitted the field is not interactive and hides its caret */
        onPress?: (event: GestureResponderEvent | KeyboardEvent) => void | Promise<void>;

        /** Whether the field is disabled */
        isDisabled?: boolean;

        /** Pre-computed accessibility label; falls back to the label/value pair */
        accessibilityLabel?: string;
    };

/**
 * The dropdown-style form-field MenuItem preset — a bordered container matching the text-input
 * treatment, with a down caret on the right. Pressing it opens the same selector page or RHP the
 * borderless push row opens; the caret is purely cosmetic.
 */
function MenuItemDropdownField({label, value = '', valueComponent, rightLabel, errorText, onPress, isDisabled = false, sentryLabel, testID, accessibilityLabel}: MenuItemDropdownFieldProps) {
    const styles = useThemeStyles();
    const theme = useTheme();
    const icons = useMemoizedLazyExpensifyIcons(['DownArrow']);
    const hasValue = !!value || !!valueComponent;

    return (
        <View style={[styles.mh4, styles.mv2]}>
            <MenuItemRoot
                onPress={onPress ? callFunctionIfActionIsAllowed(onPress) : undefined}
                isDisabled={isDisabled}
                style={styles.dropdownFieldContainer}
                sentryLabel={sentryLabel}
                testID={testID}
                accessibilityLabel={accessibilityLabel ?? (value ? `${label}, ${value}` : label)}
            >
                <MenuItemRow>
                    <MenuItemContent>
                        {hasValue ? (
                            <>
                                <Text
                                    style={[styles.textLabelSupporting, styles.pre]}
                                    numberOfLines={1}
                                >
                                    {label}
                                </Text>
                                {valueComponent ?? (
                                    <Text
                                        style={[styles.textNormal, styles.pre]}
                                        numberOfLines={1}
                                    >
                                        {value}
                                    </Text>
                                )}
                            </>
                        ) : (
                            <Text
                                style={[styles.textNormal, styles.textSupporting]}
                                numberOfLines={1}
                            >
                                {label}
                            </Text>
                        )}
                    </MenuItemContent>
                    <MenuItemTrailing>
                        {!!rightLabel && !hasValue && <MenuItemRightLabel>{rightLabel}</MenuItemRightLabel>}
                        {!!onPress && (
                            <Icon
                                src={icons.DownArrow}
                                fill={theme.icon}
                                width={variables.iconSizeSmall}
                                height={variables.iconSizeSmall}
                            />
                        )}
                    </MenuItemTrailing>
                </MenuItemRow>
            </MenuItemRoot>
            {!!errorText && <FormHelpMessage message={errorText} />}
        </View>
    );
}

export default MenuItemDropdownField;
