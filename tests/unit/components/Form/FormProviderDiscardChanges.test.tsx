import {act, fireEvent, render, screen} from '@testing-library/react-native';

import FormContext from '@components/Form/FormContext';
import type {FormProviderProps} from '@components/Form/FormProvider';
import FormProvider from '@components/Form/FormProvider';
import PressableWithFeedback from '@components/Pressable/PressableWithFeedback';
import Text from '@components/Text';

import ONYXKEYS from '@src/ONYXKEYS';
import type {Form} from '@src/types/form';

import React from 'react';
import {View} from 'react-native';
import Onyx from 'react-native-onyx';

import waitForBatchedUpdatesWithAct from '../../../utils/waitForBatchedUpdatesWithAct';

type GuardProps = {
    getHasUnsavedChanges: () => boolean;
    onDiscard: () => void;
};

const mockGuard = jest.fn<null, [GuardProps]>(() => null);

jest.mock('@components/Form/FormDiscardChangesGuard', () => ({
    __esModule: true,
    default: (props: GuardProps) => mockGuard(props),
}));

type MockFormWrapperProps = {
    children?: React.ReactNode;
    onSubmit: () => void;
};

const mockFormWrapper = jest.fn(({children, onSubmit}: MockFormWrapperProps) => (
    <View>
        <PressableWithFeedback
            testID="submit"
            onPress={onSubmit}
            accessibilityRole="button"
            accessibilityLabel="Submit"
        >
            <Text>Submit</Text>
        </PressableWithFeedback>
        {children}
    </View>
));

jest.mock('@components/Form/FormWrapper', () => ({
    __esModule: true,
    default: (props: MockFormWrapperProps) => mockFormWrapper(props),
}));

jest.mock('@hooks/useIsFocusedRef', () => jest.fn(() => ({current: true})));
jest.mock('@hooks/usePressLoading', () =>
    jest.fn(() => ({
        isLoading: false,
        startWithLoading: async (runAfterPaint: () => void) => {
            runAfterPaint();
        },
    })),
);
jest.mock('@hooks/useDebounceNonReactive', () => jest.fn((callback: () => void) => callback));
jest.mock('@src/utils/keyboard', () => ({
    dismiss: jest.fn(() => Promise.resolve()),
    dismissKeyboardAndExecute: jest.fn((callback: () => void) => callback()),
}));

const FORM_ID = ONYXKEYS.FORMS.WORKSPACE_REPORT_FIELDS_FORM;
const DRAFT_KEY = `${FORM_ID}Draft` as const;

type TestInputProps = {
    inputID: keyof Form;
    defaultValue?: string;
    shouldSaveDraft?: boolean;
};

function TestInput({inputID, defaultValue, shouldSaveDraft}: TestInputProps) {
    const {registerInput} = React.useContext(FormContext);
    const inputProps = registerInput(inputID, false, {defaultValue, shouldSaveDraft});

    return (
        <View>
            <PressableWithFeedback
                testID={`edit-${inputID}`}
                onPress={() => inputProps.onInputChange?.('edited', inputID)}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${inputID}`}
            >
                <Text>{`Edit ${inputID}`}</Text>
            </PressableWithFeedback>
            <PressableWithFeedback
                testID={`revert-${inputID}`}
                onPress={() => inputProps.onInputChange?.(defaultValue ?? '', inputID)}
                accessibilityRole="button"
                accessibilityLabel={`Revert ${inputID}`}
            >
                <Text>{`Revert ${inputID}`}</Text>
            </PressableWithFeedback>
        </View>
    );
}

function renderForm(children: React.ReactNode, props: Partial<FormProviderProps<typeof FORM_ID>> = {shouldConfirmDiscardChanges: true}) {
    render(
        <FormProvider
            formID={FORM_ID as FormProviderProps<typeof FORM_ID>['formID']}
            submitButtonText="Submit"
            validate={() => ({})}
            onSubmit={jest.fn()}
            {...props}
        >
            {children}
        </FormProvider>,
    );
}

function latestGuardProps(): GuardProps {
    const props = mockGuard.mock.lastCall?.[0];
    if (!props) {
        throw new Error('The guard was not rendered');
    }
    return props;
}

async function press(testID: string) {
    fireEvent.press(screen.getByTestId(testID));
    await waitForBatchedUpdatesWithAct();
}

describe('FormProvider discard changes', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        mockGuard.mockClear();
        await act(async () => {
            await Onyx.clear();
        });
        await waitForBatchedUpdatesWithAct();
    });

    it('does not guard forms that did not opt in', async () => {
        // Given a form that leaves shouldConfirmDiscardChanges off, like every form that hasn't been audited yet
        renderForm(<TestInput inputID="name" />, {});
        await waitForBatchedUpdatesWithAct();

        // When the user edits it
        await press('edit-name');

        // Then no guard runs, so leaving behaves exactly as it did before
        expect(mockGuard).not.toHaveBeenCalled();
    });

    it('only reports unsaved changes while an input differs from what it started with', async () => {
        // Given a form whose input starts with an existing saved value
        renderForm(
            <TestInput
                inputID="name"
                defaultValue="saved"
            />,
        );
        await waitForBatchedUpdatesWithAct();

        // Then an untouched form has nothing to lose, so leaving it must not prompt
        expect(latestGuardProps().getHasUnsavedChanges()).toBe(false);

        // When the user edits the input
        await press('edit-name');

        // Then leaving would lose the edit
        expect(latestGuardProps().getHasUnsavedChanges()).toBe(true);

        // When the user puts the original value back
        await press('revert-name');

        // Then nothing would be lost anymore
        expect(latestGuardProps().getHasUnsavedChanges()).toBe(false);
    });

    it('does not report a submitted form as unsaved until it is edited again', async () => {
        // Given an edited form
        renderForm(<TestInput inputID="name" />);
        await waitForBatchedUpdatesWithAct();
        await press('edit-name');

        // When the user submits it
        await press('submit');

        // Then the navigation that usually follows a save must not prompt
        expect(latestGuardProps().getHasUnsavedChanges()).toBe(false);

        // When a failed save keeps the form open and the user edits it again
        await press('revert-name');

        // Then that newer edit is unsaved
        expect(latestGuardProps().getHasUnsavedChanges()).toBe(true);
    });

    it('does not count a draft loaded with the form as an edit', async () => {
        // Given a draft that already exists when the form opens
        await act(async () => {
            await Onyx.set(DRAFT_KEY, {name: 'from draft'});
        });
        await waitForBatchedUpdatesWithAct();

        // When the form renders that draft
        renderForm(
            <TestInput
                inputID="name"
                shouldSaveDraft
            />,
        );
        await waitForBatchedUpdatesWithAct();

        // Then the user hasn't changed anything yet
        expect(latestGuardProps().getHasUnsavedChanges()).toBe(false);
    });

    it('restores only its own draft-backed inputs when changes are discarded', async () => {
        // Given a draft shared with an earlier step of the flow, and a form that edits one draft-backed input
        await act(async () => {
            await Onyx.set(DRAFT_KEY, {initialValue: 'keep me', name: 'original'});
        });
        await waitForBatchedUpdatesWithAct();
        renderForm(
            <TestInput
                inputID="name"
                shouldSaveDraft
            />,
        );
        await waitForBatchedUpdatesWithAct();
        await press('edit-name');
        expect(await Onyx.get(DRAFT_KEY)).toMatchObject({name: 'edited'});

        // When the user discards the changes
        act(() => latestGuardProps().onDiscard());
        await waitForBatchedUpdatesWithAct();

        // Then the discarded edit can't come back from the draft, and the earlier step keeps its value
        expect(await Onyx.get(DRAFT_KEY)).toEqual({initialValue: 'keep me', name: 'original'});
    });
});
