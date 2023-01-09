import _ from 'underscore';
import React from 'react';
import htmlRendererPropTypes from './htmlRendererPropTypes';
import Text from '../../Text';
import  { getNativePropsForTNode, splitBoxModelStyle } from 'react-native-render-html';

const TextRenderer = (props) => {
    const nativeProps = getNativePropsForTNode(props);

    // We split wrapper and inner styles
    // "boxModelStyle" corresponds to border, margin, padding and backgroundColor
    const {boxModelStyle, otherStyle: textStyle} = splitBoxModelStyle(props.style);


    const defaultRendererProps = _.omit(nativeProps, ['style']);
    // This is equivalent to a TDefaultRenderer which `Text` is replaced
    // with custom Expensify `Text` component 
    return <Text style={{...boxModelStyle, ...textStyle}} {...defaultRendererProps}/>;
};

TextRenderer.propTypes = htmlRendererPropTypes;
TextRenderer.displayName = 'TextRenderer';

export default TextRenderer;