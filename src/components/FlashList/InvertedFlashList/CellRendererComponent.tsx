import React from 'react';
import type {StyleProp, ViewProps, ViewStyle} from 'react-native';
import {View} from 'react-native';

type CellRendererComponentProps = ViewProps & {
    index: number;
    style?: StyleProp<ViewStyle>;
};

/** Prefix used to build a stable `nativeID` for every inverted cell. The list wraps these IDs (reversed) in
 * `experimental_accessibilityOrder` so screen readers traverse the messages in visual order. */
const INVERTED_CELL_NATIVE_ID_PREFIX = 'inverted-flashlist-cell-';

function getInvertedCellNativeID(index: number) {
    return `${INVERTED_CELL_NATIVE_ID_PREFIX}${index}`;
}

function CellRendererComponent(props: CellRendererComponentProps) {
    return (
        <View
            {...props}
            nativeID={getInvertedCellNativeID(props.index)}
            style={[
                props.style,
                /**
                 * To achieve absolute positioning and handle overflows for list items,
                 * it is necessary to assign zIndex values. In the case of inverted lists,
                 * the lower list items will have higher zIndex values compared to the upper
                 * list items. Consequently, lower list items can overflow the upper list items.
                 * See: https://github.com/Expensify/App/issues/20451
                 */
                {zIndex: -props.index},
            ]}
        />
    );
}

export default CellRendererComponent;
export {getInvertedCellNativeID};
