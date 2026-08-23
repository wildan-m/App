import RenderHTML from '@components/RenderHTML';

import useAccessibilityAnnouncement from '@hooks/useAccessibilityAnnouncement';
import useLocalize from '@hooks/useLocalize';

import DateUtils from '@libs/DateUtils';

import CONST from '@src/CONST';

import React, {useEffect, useImperativeHandle, useRef, useState} from 'react';

import type {ValidateCodeCountdownProps} from './types';

function ValidateCodeCountdown({onCountdownFinish, requestedAt, ref}: ValidateCodeCountdownProps) {
    const {translate} = useLocalize();

    // Seed from the time the code was actually requested so a reload mid-countdown resumes at the correct value instead of restarting at the full delay.
    const [timeRemaining, setTimeRemaining] = useState<number>(
        () => DateUtils.getRemainingSecondsInWindow(requestedAt, CONST.REQUEST_CODE_DELAY * CONST.MILLISECONDS_PER_SECOND) || CONST.REQUEST_CODE_DELAY,
    );
    const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);

    // Callers that don't stamp a request timestamp anywhere still need a wall-clock anchor to measure against. Without one
    // the only way to count down is to assume every scheduled callback fires once per second, which is false in a hidden
    // browser tab (timers are throttled) and on native while the app is backgrounded (the JS thread is suspended).
    const localRequestedAtRef = useRef<number | undefined>(undefined);

    useImperativeHandle(ref, () => ({
        resetCountdown: () => {
            // Re-anchor so a resend measures the new window from this moment.
            localRequestedAtRef.current = Date.now();
            setTimeRemaining(CONST.REQUEST_CODE_DELAY);
        },
    }));

    useEffect(() => {
        if (timeRemaining <= 0) {
            onCountdownFinish();
            return;
        }

        localRequestedAtRef.current ??= Date.now();

        // Align the next tick to the wall-clock second boundary of the request so every tab/reload flips the
        // displayed second at the same instant instead of drifting by each tab's own mount offset.
        const msUntilNextTick = CONST.MILLISECONDS_PER_SECOND - ((Date.now() - (requestedAt ?? localRequestedAtRef.current)) % CONST.MILLISECONDS_PER_SECOND);

        timerRef.current = setTimeout(() => {
            // Re-derive from the wall clock so the countdown self-corrects against setTimeout drift, background-tab
            // throttling and a suspended JS thread instead of trusting how many callbacks actually ran.
            setTimeRemaining(DateUtils.getRemainingSecondsInWindow(requestedAt ?? localRequestedAtRef.current, CONST.REQUEST_CODE_DELAY * CONST.MILLISECONDS_PER_SECOND));
        }, msUntilNextTick);

        return () => {
            clearTimeout(timerRef.current);
        };
    }, [onCountdownFinish, timeRemaining, requestedAt]);

    // Announce countdown start/reset/expiration for screen readers.
    // We check timeRemaining === 1 (not 0) because the component unmounts immediately at 0s, so the expired announcement wouldn't be spoken.
    // We use timeRemaining % 10 === 1 to announce every 10 seconds (at 21s, 11s, 1s) to avoid overwhelming screen reader users.
    useAccessibilityAnnouncement(
        timeRemaining === 1 ? translate('validateCodeForm.timeExpiredAnnouncement') : translate('validateCodeForm.timeRemainingAnnouncement', {timeRemaining: timeRemaining - 1}),
        timeRemaining % 10 === 1,
        {
            shouldAnnounceOnNative: true,
            shouldAnnounceOnWeb: true,
        },
    );

    return (
        <RenderHTML
            html={translate('validateCodeForm.requestNewCode', {
                timeRemaining: `00:${String(timeRemaining).padStart(2, '0')}`,
            })}
        />
    );
}

export default ValidateCodeCountdown;
