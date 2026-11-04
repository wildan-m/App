import Icon from '@components/Icon';
import * as PopoverMenu from '@components/PopoverMenu/v2';
import PressableWithFeedback from '@components/Pressable/PressableWithFeedback';
import PressableWithSecondaryInteraction from '@components/PressableWithSecondaryInteraction';
import Text from '@components/Text';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';

import variables from '@styles/variables';

import CONST from '@src/CONST';

import type {Meta} from 'storybook-react-rsbuild';

import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';

/**
 * We use the Component Story Format for writing stories. Follow the docs here:
 *
 * https://storybook.js.org/docs/react/writing-stories/introduction#component-story-format
 */
const story: Meta<typeof PopoverMenu.Root> = {
    title: 'Components/PopoverMenu V2',
    component: PopoverMenu.Root,
};

const triggerStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: variables.spacing2,
    padding: variables.spacing2 + 4,
    borderWidth: variables.borderTopWidth,
    borderRadius: variables.componentBorderRadiusNormal,
    alignSelf: 'flex-start',
} as const;

function StoryTrigger({iconSrc, label, accessibilityLabel}: {iconSrc: React.ComponentProps<typeof Icon>['src']; label: string; accessibilityLabel: string}) {
    return (
        <PopoverMenu.Trigger>
            <PressableWithFeedback
                onPress={() => {}}
                style={triggerStyle}
                role={CONST.ROLE.BUTTON}
                accessibilityLabel={accessibilityLabel}
                sentryLabel="PopoverMenuV2.Story.Trigger"
            >
                <Icon
                    src={iconSrc}
                    width={variables.iconSizeSmall}
                    height={variables.iconSizeSmall}
                />
                <Text>{label}</Text>
            </PressableWithFeedback>
        </PopoverMenu.Trigger>
    );
}

function Default() {
    const {Plus: plusIcon, Bank: bankIcon, CreditCard: creditCardIcon} = useMemoizedLazyExpensifyIcons(['Plus', 'Bank', 'CreditCard']);
    return (
        <SafeAreaProvider>
            <PopoverMenu.Root>
                <StoryTrigger
                    iconSrc={plusIcon}
                    label="Add payment method"
                    accessibilityLabel="Open menu"
                />
                <PopoverMenu.Content>
                    <PopoverMenu.Item
                        text="Bank account"
                        icon={bankIcon}
                        onSelect={() => {}}
                    />
                    <PopoverMenu.Item
                        text="Debit card"
                        icon={creditCardIcon}
                        onSelect={() => {}}
                    />
                </PopoverMenu.Content>
            </PopoverMenu.Root>
        </SafeAreaProvider>
    );
}

function WithHeader() {
    const {Plus: plusIcon2, Bank: bankIcon2, CreditCard: creditCardIcon2} = useMemoizedLazyExpensifyIcons(['Plus', 'Bank', 'CreditCard']);
    return (
        <SafeAreaProvider>
            <PopoverMenu.Root>
                <StoryTrigger
                    iconSrc={plusIcon2}
                    label="Pick a payment method"
                    accessibilityLabel="Open menu"
                />
                <PopoverMenu.Content>
                    <PopoverMenu.Header>Payment methods</PopoverMenu.Header>
                    <PopoverMenu.Item
                        text="Bank account"
                        icon={bankIcon2}
                        onSelect={() => {}}
                    />
                    <PopoverMenu.Item
                        text="Debit card"
                        icon={creditCardIcon2}
                        onSelect={() => {}}
                    />
                </PopoverMenu.Content>
            </PopoverMenu.Root>
        </SafeAreaProvider>
    );
}

function WithSubmenu() {
    const {Plus: plusIcon3, Bank: bankIcon3, CreditCard: creditCardIcon3, Wallet: walletIcon} = useMemoizedLazyExpensifyIcons(['Plus', 'Bank', 'CreditCard', 'Wallet']);
    return (
        <SafeAreaProvider>
            <PopoverMenu.Root>
                <StoryTrigger
                    iconSrc={plusIcon3}
                    label="More"
                    accessibilityLabel="Open menu"
                />
                <PopoverMenu.Content>
                    <PopoverMenu.Item
                        text="Bank account"
                        icon={bankIcon3}
                        onSelect={() => {}}
                    />
                    <PopoverMenu.Sub id="cards">
                        <PopoverMenu.Sub.Trigger
                            text="Cards"
                            icon={creditCardIcon3}
                        />
                        <PopoverMenu.Sub.Content>
                            <PopoverMenu.Sub.BackButton text="Cards" />
                            <PopoverMenu.Item
                                text="Debit card"
                                icon={creditCardIcon3}
                                onSelect={() => {}}
                            />
                            <PopoverMenu.Item
                                text="Credit card"
                                icon={creditCardIcon3}
                                onSelect={() => {}}
                            />
                        </PopoverMenu.Sub.Content>
                    </PopoverMenu.Sub>
                    <PopoverMenu.Item
                        text="Wallet"
                        icon={walletIcon}
                        onSelect={() => {}}
                    />
                </PopoverMenu.Content>
            </PopoverMenu.Root>
        </SafeAreaProvider>
    );
}

function WithRadioItems() {
    const [selected, setSelected] = React.useState('1x');
    const {Meter: meterIcon} = useMemoizedLazyExpensifyIcons(['Meter']);
    const speeds = ['0.5x', '1x', '1.5x', '2x'];
    return (
        <SafeAreaProvider>
            <PopoverMenu.Root>
                <StoryTrigger
                    iconSrc={meterIcon}
                    label={`Playback speed: ${selected}`}
                    accessibilityLabel="Open speed menu"
                />
                <PopoverMenu.Content>
                    <PopoverMenu.Header>Playback speed</PopoverMenu.Header>
                    {speeds.map((speed) => (
                        <PopoverMenu.RadioItem
                            key={speed}
                            text={speed}
                            isSelected={selected === speed}
                            onSelect={() => setSelected(speed)}
                            shouldPutLeftPaddingWhenNoIcon
                        />
                    ))}
                </PopoverMenu.Content>
            </PopoverMenu.Root>
        </SafeAreaProvider>
    );
}

function ScrollableVariant() {
    const {Plus: plusIcon4} = useMemoizedLazyExpensifyIcons(['Plus']);
    // 100 items exercises the documented worst case for `<ScrollableContent>` (bounded-N regime).
    const items = Array.from({length: 100}, (_, i) => `Option ${i + 1}`);
    return (
        <SafeAreaProvider>
            <PopoverMenu.Root>
                <StoryTrigger
                    iconSrc={plusIcon4}
                    label="Open 100-item menu"
                    accessibilityLabel="Open long menu"
                />
                <PopoverMenu.ScrollableContent>
                    <PopoverMenu.Header>Pick an option</PopoverMenu.Header>
                    {items.map((item) => (
                        <PopoverMenu.Item
                            key={item}
                            text={item}
                            onSelect={() => {}}
                        />
                    ))}
                </PopoverMenu.ScrollableContent>
            </PopoverMenu.Root>
        </SafeAreaProvider>
    );
}

function GroupedWithSeparator() {
    const {
        Plus: plusIcon5,
        Bank: bankIcon4,
        CreditCard: creditCardIcon4,
        Wallet: walletIcon2,
        Trashcan: trashcanIcon,
    } = useMemoizedLazyExpensifyIcons(['Plus', 'Bank', 'CreditCard', 'Wallet', 'Trashcan']);
    return (
        <SafeAreaProvider>
            <PopoverMenu.Root>
                <StoryTrigger
                    iconSrc={plusIcon5}
                    label="Account actions"
                    accessibilityLabel="Open menu"
                />
                <PopoverMenu.Content>
                    <PopoverMenu.Group>
                        <PopoverMenu.Item
                            text="Bank account"
                            icon={bankIcon4}
                            onSelect={() => {}}
                        />
                        <PopoverMenu.Item
                            text="Debit card"
                            icon={creditCardIcon4}
                            onSelect={() => {}}
                        />
                        <PopoverMenu.Item
                            text="Wallet"
                            icon={walletIcon2}
                            onSelect={() => {}}
                        />
                    </PopoverMenu.Group>
                    <PopoverMenu.Separator />
                    <PopoverMenu.Item
                        text="Remove account"
                        icon={trashcanIcon}
                        onSelect={() => {}}
                    />
                </PopoverMenu.Content>
            </PopoverMenu.Root>
        </SafeAreaProvider>
    );
}

function DisabledRow() {
    const {Plus: plusIcon6, Bank: bankIcon5, CreditCard: creditCardIcon5} = useMemoizedLazyExpensifyIcons(['Plus', 'Bank', 'CreditCard']);
    return (
        <SafeAreaProvider>
            <PopoverMenu.Root>
                <StoryTrigger
                    iconSrc={plusIcon6}
                    label="Add payment method"
                    accessibilityLabel="Open menu"
                />
                <PopoverMenu.Content>
                    <PopoverMenu.Item
                        text="Bank account"
                        icon={bankIcon5}
                        onSelect={() => {}}
                    />
                    <PopoverMenu.Item
                        text="Debit card (coming soon)"
                        icon={creditCardIcon5}
                        onSelect={() => {}}
                        disabled
                    />
                </PopoverMenu.Content>
            </PopoverMenu.Root>
        </SafeAreaProvider>
    );
}

function WithSecondaryInteraction() {
    const {Plus: plusIcon7, Trashcan: trashcanIcon2, Copy: copyIcon} = useMemoizedLazyExpensifyIcons(['Plus', 'Trashcan', 'Copy']);
    return (
        <SafeAreaProvider>
            <PopoverMenu.Root>
                <PopoverMenu.SecondaryInteractionTrigger>
                    <PressableWithSecondaryInteraction
                        onPress={() => {}}
                        onSecondaryInteraction={() => {}}
                        style={triggerStyle}
                        accessibilityLabel="Right-click or long-press to open menu"
                    >
                        <Icon
                            src={plusIcon7}
                            width={variables.iconSizeSmall}
                            height={variables.iconSizeSmall}
                        />
                        <Text>Right-click / long-press me</Text>
                    </PressableWithSecondaryInteraction>
                </PopoverMenu.SecondaryInteractionTrigger>
                <PopoverMenu.Content>
                    <PopoverMenu.Item
                        text="Copy"
                        icon={copyIcon}
                        onSelect={() => {}}
                    />
                    <PopoverMenu.Item
                        text="Delete"
                        icon={trashcanIcon2}
                        onSelect={() => {}}
                    />
                </PopoverMenu.Content>
            </PopoverMenu.Root>
        </SafeAreaProvider>
    );
}

export default story;
export {Default, WithHeader, WithSubmenu, WithRadioItems, ScrollableVariant, GroupedWithSeparator, DisabledRow, WithSecondaryInteraction};
