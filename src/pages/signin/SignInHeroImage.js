import PropTypes from 'prop-types';
import React, {useState, useEffect} from 'react';
import Lottie from '@components/Lottie';
import LottieAnimations from '@components/LottieAnimations';
import withWindowDimensions, {windowDimensionsPropTypes} from '@components/withWindowDimensions';
import useThemeStyles from '@hooks/useThemeStyles';
import variables from '@styles/variables';
const propTypes = {
    ...windowDimensionsPropTypes,

    shouldShowSmallScreen: PropTypes.bool,
};

const defaultProps = {
    shouldShowSmallScreen: false,
};

function SignInHeroImage(props) {
    
    const styles = useThemeStyles();
    let imageSize;
    if (props.isSmallScreenWidth || props.shouldShowSmallScreen) {
        imageSize = {
            height: variables.signInHeroImageMobileHeight,
            width: variables.signInHeroImageMobileWidth,
        };
    } else if (props.isMediumScreenWidth) {
        imageSize = {
            height: variables.signInHeroImageTabletHeight,
            width: variables.signInHeroImageTabletWidth,
        };
    } else {
        imageSize = {
            height: variables.signInHeroImageDesktopHeight,
            width: variables.signInHeroImageDesktopWidth,
        };
    }

    const [animationData, setAnimationData] = useState();

    useEffect(() => {
        import('../../../assets/animations/Hands.json').then((res) => setAnimationData(res.default));
    }, []);

    return (
        <Lottie
            source={{file: animationData, w: 375, h: 375}}
            loop
            autoPlay
            style={[styles.alignSelfCenter, imageSize]}
            webStyle={{...styles.alignSelfCenter, ...imageSize}}
        />
    );
}

SignInHeroImage.displayName = 'SignInHeroImage';
SignInHeroImage.propTypes = propTypes;
SignInHeroImage.defaultProps = defaultProps;

export default withWindowDimensions(SignInHeroImage);
