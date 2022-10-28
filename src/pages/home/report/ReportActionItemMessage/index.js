import React from 'react';
import {View} from 'react-native';
import _ from 'underscore';
import lodashGet from 'lodash/get';
import styles from '../../../../styles/styles';
import ReportActionItemFragment from '../ReportActionItemFragment';
import {propTypes, defaultProps} from './reportActionItemMessagePropTypes';
import withLocalize from '../../../../components/withLocalize';

const ReportActionItemMessage = props => (
    <View style={[styles.chatItemMessage, ...props.style]}>
        {_.map(_.compact(props.action.previousMessage || props.action.message), (fragment, index) => (
            <ReportActionItemFragment
                key={`actionFragment-${props.action.sequenceNumber}-${index}`}
                fragment={fragment}
                isAttachment={props.action.isAttachment}
                attachmentInfo={props.action.attachmentInfo}
                source={lodashGet(props.action, 'originalMessage.source')}
                loading={props.action.isLoading}
                style={props.style}
            />
        ))}
    </View>
);

ReportActionItemMessage.propTypes = propTypes;
ReportActionItemMessage.defaultProps = defaultProps;
ReportActionItemMessage.displayName = 'ReportActionItemMessage';

export default withLocalize(ReportActionItemMessage);
