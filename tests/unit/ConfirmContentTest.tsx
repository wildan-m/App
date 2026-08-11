import {render} from '@testing-library/react-native';

import ConfirmContent from '@components/ConfirmContent';

import CONST from '@src/CONST';

import type {StyleProp, ViewStyle} from 'react-native';

import React from 'react';
import {StyleSheet} from 'react-native';

const mockIllustration = () => null;

type ButtonProps = {
    success?: boolean;
    danger?: boolean;
    text?: string;
    onPress?: () => void;
    [key: string]: unknown;
};

type StyledNode = {
    props: {
        style?: StyleProp<ViewStyle>;
    };
};

type ImageSVGProps = {
    height?: number | string;
    width?: number | string;
    [key: string]: unknown;
};

const mockButtonSpy = jest.fn<void, [ButtonProps]>();
const mockImageSVGSpy = jest.fn<void, [ImageSVGProps]>();

jest.mock('@components/ImageSVG', () => {
    const ReactLib = jest.requireActual<typeof React>('react');
    return {
        __esModule: true,
        default: (props: ImageSVGProps) => {
            mockImageSVGSpy(props);
            return ReactLib.createElement('mock-image-svg');
        },
    };
});

jest.mock('@components/Button', () => {
    const ReactLib = jest.requireActual<typeof React>('react');
    return {
        __esModule: true,
        default: (props: ButtonProps) => {
            mockButtonSpy(props);
            return ReactLib.createElement('mock-button', props);
        },
    };
});

jest.mock('@hooks/useLocalize', () =>
    jest.fn(() => ({
        translate: jest.fn((key: string) => key),
    })),
);

jest.mock('@hooks/useTheme', () =>
    jest.fn(() => ({
        icon: '#000',
    })),
);

jest.mock('@hooks/useThemeStyles', () => {
    const CONSTLib = jest.requireActual<{default: typeof CONST}>('@src/CONST').default;
    return jest.fn(() => ({
        m5: {},
        mt3: {},
        mt4: {},
        mb3: {},
        mb4: {},
        mb6: {},
        flex1: {},
        flexRow: {},
        gap4: {},
        noSelect: {},
        alignItemsCenter: {},
        alignItemsEnd: {},
        alignSelfCenter: {},
        justifyContentCenter: {},
        textAlignCenter: {},
        pv0: {},
        confirmContentFittedImageContainer: {height: CONSTLib.CONFIRM_CONTENT_SVG_SIZE.HEIGHT},
    }));
});

jest.mock('@hooks/useNetwork', () => jest.fn(() => ({isOffline: false})));

describe('ConfirmContent', () => {
    beforeEach(() => {
        mockButtonSpy.mockClear();
        mockImageSVGSpy.mockClear();
    });

    describe('image sizing when shouldFitImageToContainer is set', () => {
        // The illustration must never be taller than the container it is rendered into.
        // On Android children are not clipped to their parent, so an oversized image
        // paints over the title below it.
        function renderWithImage(imageStyles: ViewStyle) {
            const {toJSON} = render(
                <ConfirmContent
                    title="Test"
                    onConfirm={jest.fn()}
                    isVisible
                    image={mockIllustration}
                    shouldFitImageToContainer
                    imageStyles={imageStyles}
                />,
            );
            const tree = toJSON();
            const imageWrapper: StyledNode | null | undefined = Array.isArray(tree) ? tree.at(0) : tree;
            return {
                wrapperStyle: StyleSheet.flatten(imageWrapper?.props.style),
                imageProps: mockImageSVGSpy.mock.calls.at(0)?.[0],
            };
        }

        it('fills a container that a caller constrained to a smaller height', () => {
            const {wrapperStyle, imageProps} = renderWithImage({width: 160, height: 140});

            expect(wrapperStyle.height).toBe(140);
            expect(imageProps?.height).toBe('100%');
            expect(imageProps?.height).not.toBe(CONST.CONFIRM_CONTENT_SVG_SIZE.HEIGHT);
        });

        it('keeps the default height for callers that do not constrain the container', () => {
            const {wrapperStyle, imageProps} = renderWithImage({width: '100%'});

            expect(wrapperStyle.height).toBe(CONST.CONFIRM_CONTENT_SVG_SIZE.HEIGHT);
            expect(imageProps?.height).toBe('100%');
        });
    });

    function getConfirmButtonProps(shouldStackButtons: boolean): ButtonProps | undefined {
        const calls = mockButtonSpy.mock.calls;
        if (shouldStackButtons) {
            return calls.find((call) => call[0].pressOnEnter)?.[0];
        }
        return calls.find((call) => call[0].pressOnEnter)?.[0];
    }

    const testCases = [
        {shouldShowCancelButton: false, danger: false, success: false, expectedSuccess: false},
        {shouldShowCancelButton: false, danger: false, success: true, expectedSuccess: false},
        {shouldShowCancelButton: false, danger: true, success: false, expectedSuccess: false},
        {shouldShowCancelButton: false, danger: true, success: true, expectedSuccess: false},
        {shouldShowCancelButton: true, danger: false, success: false, expectedSuccess: false},
        {shouldShowCancelButton: true, danger: false, success: true, expectedSuccess: true},
        {shouldShowCancelButton: true, danger: true, success: false, expectedSuccess: false},
        {shouldShowCancelButton: true, danger: true, success: true, expectedSuccess: false},
    ];

    describe('stacked buttons (shouldStackButtons=true)', () => {
        it.each(testCases)(
            'confirm button success=$expectedSuccess when shouldShowCancelButton=$shouldShowCancelButton, danger=$danger, success=$success',
            ({shouldShowCancelButton, danger, success, expectedSuccess}) => {
                mockButtonSpy.mockClear();
                render(
                    <ConfirmContent
                        title="Test"
                        onConfirm={jest.fn()}
                        isVisible
                        shouldStackButtons
                        shouldShowCancelButton={shouldShowCancelButton}
                        danger={danger}
                        success={success}
                    />,
                );

                const confirmProps = getConfirmButtonProps(true);
                expect(confirmProps?.success).toBe(expectedSuccess);
                expect(confirmProps?.danger).toBe(danger);
            },
        );
    });

    describe('side-by-side buttons (shouldStackButtons=false)', () => {
        it.each(testCases)(
            'confirm button success=$expectedSuccess when shouldShowCancelButton=$shouldShowCancelButton, danger=$danger, success=$success',
            ({shouldShowCancelButton, danger, success, expectedSuccess}) => {
                mockButtonSpy.mockClear();
                render(
                    <ConfirmContent
                        title="Test"
                        onConfirm={jest.fn()}
                        isVisible
                        shouldStackButtons={false}
                        shouldShowCancelButton={shouldShowCancelButton}
                        danger={danger}
                        success={success}
                    />,
                );

                const confirmProps = getConfirmButtonProps(false);
                expect(confirmProps?.success).toBe(expectedSuccess);
                expect(confirmProps?.danger).toBe(danger);
            },
        );
    });
});
