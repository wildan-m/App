import React from 'react';
import { View, Image, StyleSheet, ImageSourcePropType } from 'react-native';
import Logo from '@assets/images/new-expensify-dark.svg';
import ImageSVG from './ImageSVG';


const SplashScreen = () => {
    return (
        <View style={styles.splash}>
            <View style={styles.splashLogo}>
                <ImageSVG src={Logo} style={styles.logoImage} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    splash: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        top: 0,
        backgroundColor: '#03D47C',
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transitionDuration: '250ms',
        transitionProperty: 'opacity',
    },
    splashLogo: {
        display: 'flex',
    },
    logoImage: {
        width: 104,
        height: 104,
    },
});

export default SplashScreen;