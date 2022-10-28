import React from 'react';
import _ from 'underscore';
import{ReportActionItemMessage as ReportActionItemMessageWeb} from './index.website';
import {propTypes, defaultProps} from './reportActionItemMessagePropTypes';
import withLocalize from '../../../../components/withLocalize';

const ReportActionItemMessage = props => (
    <ReportActionItemMessageWeb
            // eslint-disable-next-line react/jsx-props-no-spreading
        {...props}
    >
        {props.children}
    </ReportActionItemMessageWeb>
);

ReportActionItemMessage.propTypes = propTypes;
ReportActionItemMessage.defaultProps = defaultProps;
ReportActionItemMessage.displayName = 'ReportActionItemMessage';

export default withLocalize(ReportActionItemMessage);
