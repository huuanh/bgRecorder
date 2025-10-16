import React from 'react';
import { Text as RNText } from 'react-native';
import { FONTS } from '../constants';

// Custom Text component that automatically applies the default font
const AppText = ({ style, children, ...props }) => {
  const defaultStyle = {
    fontFamily: FONTS.PRIMARY,
  };
  
  const combinedStyle = Array.isArray(style) 
    ? [defaultStyle, ...style]
    : [defaultStyle, style];
    
  return (
    <RNText style={combinedStyle} {...props}>
      {children}
    </RNText>
  );
};

export default AppText;