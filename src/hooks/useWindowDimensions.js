import {useContext} from 'react';
import {WindowDimensionsContext} from '../components/withWindowDimensions';

/**
 * Hook for getting current state of keyboard
 * whether or not the keyboard is open
 * @returns {Object}
 */
export default function useWindowDimensions() {
    return useContext(WindowDimensionsContext);
}
