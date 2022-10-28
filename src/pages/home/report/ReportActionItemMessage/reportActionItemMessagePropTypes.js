import PropTypes from 'prop-types';
import reportActionPropTypes from '../reportActionPropTypes';
import {withLocalizePropTypes} from '../../../../components/withLocalize';

const propTypes = {
    /** The report action */
    action: PropTypes.shape(reportActionPropTypes).isRequired,

    /** Additional styles to add after local styles. */
    style: PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.object),
        PropTypes.object,
    ]),

    /** localization props */
    ...withLocalizePropTypes,
};

const defaultProps = {
    style: [],
};

export {propTypes, defaultProps};
