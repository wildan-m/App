import Onyx from 'react-native-onyx';
import Sound from 'react-native-sound';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {ValueOf} from 'type-fest';
import ONYXKEYS from '@src/ONYXKEYS';
import config from './config';

let isMuted = false;

Onyx.connect({
    key: ONYXKEYS.USER,
    callback: (val) => (isMuted = !!val?.isMutedAllSounds),
});

const SOUNDS = {
    DONE: 'done',
    SUCCESS: 'success',
    ATTENTION: 'attention',
    RECEIVE: 'receive',
} as const;

const SOUND_CACHE_KEY = 'SOUND_CACHE';

async function cacheSound(soundFile: string) {
    try {
        const cachedSoundsString = await AsyncStorage.getItem(SOUND_CACHE_KEY);
        const cachedSounds = cachedSoundsString ? JSON.parse(cachedSoundsString) : {};

        if (!cachedSounds[soundFile]) {
            const sound = new Sound(`${config.prefix}${soundFile}.mp3`, Sound.MAIN_BUNDLE, (error) => {
                if (!error) {
                    cachedSounds[soundFile] = `${config.prefix}${soundFile}.mp3`;
                    AsyncStorage.setItem(SOUND_CACHE_KEY, JSON.stringify(cachedSounds));
                }
            });
        }
    } catch (error) {
        console.error('Error caching sound:', error);
    }
}
async function loadCachedSounds() {
    try {
        const cachedSoundsString = await AsyncStorage.getItem(SOUND_CACHE_KEY);
        const cachedSounds = cachedSoundsString ? JSON.parse(cachedSoundsString) : {};
        Object.keys(cachedSounds).forEach((soundFile) => {
            new Sound(cachedSounds[soundFile], Sound.MAIN_BUNDLE, (error) => {
                if (error) {
                    console.error('Error loading cached sound:', error);
                }
            });
        });
    } catch (error) {
        console.error('Error loading cached sounds:', error);
    }
}

loadCachedSounds();

/**
 * Creates a version of the given function that, when called, queues the execution and ensures that
 * calls are spaced out by at least the specified `minExecutionTime`, even if called more frequently. This allows
 * for throttling frequent calls to a function, ensuring each is executed with a minimum `minExecutionTime` between calls.
 * Each call returns a promise that resolves when the function call is executed, allowing for asynchronous handling.
 */
function withMinimalExecutionTime<F extends (...args: Parameters<F>) => ReturnType<F>>(func: F, minExecutionTime: number) {
    const queue: Array<[() => ReturnType<F>, (value?: unknown) => void]> = [];
    let timerId: NodeJS.Timeout | null = null;

    function processQueue() {
        if (queue.length > 0) {
            const next = queue.shift();

            if (!next) {
                return;
            }

            const [nextFunc, resolve] = next;
            nextFunc();
            resolve();
            timerId = setTimeout(processQueue, minExecutionTime);
        } else {
            timerId = null;
        }
    }

    return function (...args: Parameters<F>) {
        return new Promise((resolve) => {
            queue.push([() => func(...args), resolve]);

            if (!timerId) {
                // If the timer isn't running, start processing the queue
                processQueue();
            }
        });
    };
}

const playSound = (soundFile: ValueOf<typeof SOUNDS>) => {
    cacheSound(soundFile);
    const sound = new Sound(`${config.prefix}${soundFile}.mp3`, Sound.MAIN_BUNDLE, (error) => {
        if (error || isMuted) {
            return;
        }

        sound.play();
    });
};

export {SOUNDS};
export default withMinimalExecutionTime(playSound, 300);