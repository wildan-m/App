import _ from 'underscore';
import React from 'react';
import {View} from 'react-native';
import htmlRendererPropTypes from './htmlRendererPropTypes';
import Text from '../../Text';
import  { getNativePropsForTNode, splitBoxModelStyle, TNodeChildrenRenderer } from 'react-native-render-html';

const TextRenderer = (props) => {
    const nativeProps = getNativePropsForTNode(props);
    const textStyle = props.tnode.styles.nativeTextFlow;
    
    const defaultRendererProps = _.omit(nativeProps, ['style']);
    // This is equivalent to a TDefaultRenderer which `Text` is replaced
    // with custom Expensify `Text` component 
    return <Text style={textStyle} {...defaultRendererProps}/>;
};

TextRenderer.propTypes = htmlRendererPropTypes;
TextRenderer.displayName = 'TextRenderer';

export default TextRenderer;