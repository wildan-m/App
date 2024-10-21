import { requireNativeComponent } from 'react-native';
import React from 'react';
import { ViewProps } from 'react-native';

const MyCustomView = requireNativeComponent('MyCustomView');

const MyWrapper = (props: ViewProps) => {
  return <MyCustomView {...props} />;
};

export default MyWrapper;
