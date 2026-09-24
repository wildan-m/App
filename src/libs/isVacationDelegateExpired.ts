/**
 * Whether the vacation delegate's clear after date has already passed. The backend clears the delegate at that point,
 * so an expired delegate is treated as unset until the cleared NVP arrives.
 */
function isVacationDelegateExpired(clearAfter?: string): boolean {
    if (!clearAfter) {
        return false;
    }

    const clearAfterTime = new Date(clearAfter).getTime();
    if (Number.isNaN(clearAfterTime)) {
        return false;
    }

    return clearAfterTime <= Date.now();
}

export default isVacationDelegateExpired;
