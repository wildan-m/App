import type {LottieViewProps} from 'lottie-react-native';

type DotLottieAnimation = {
    file: LottieViewProps['source'];
    importPromise?: Promise<any>;
    w: number;
    h: number;
};

export default DotLottieAnimation;
