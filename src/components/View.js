import React, { useState } from 'react';
import { View as RNView } from 'react-native';
import PropTypes from 'prop-types';

const propTypes = {
  /**
   * Content to render
   */
  children: PropTypes.node.isRequired,

  /**
   * Array of style objects
   * @default []
   */
  // eslint-disable-next-line react/forbid-prop-types
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

const defaultProps = {
  style: [],
  shouldKeepMinHeight: false,
};

const View = ({ shouldKeepMinHeight, style, children, ...props }) => {
  const [minHeight, setMinHeight] = useState(undefined);

  const handleLayout = (event) => {
    if (!shouldKeepMinHeight || minHeight !== undefined) {
      return;
    }

    const { height } = event.nativeEvent.layout;
    setMinHeight(height);
  };

  const minHeightStyle = shouldKeepMinHeight ? { minHeight } : {};
  const combinedStyle = [style, minHeightStyle];

  return (
    <RNView style={combinedStyle} onLayout={handleLayout} {...props}>
      {children}
    </RNView>
  );
};

View.displayName = 'View';
View.propTypes = propTypes;
View.defaultProps = defaultProps;

export default View;
