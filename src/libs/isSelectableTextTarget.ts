/**
 * List rows are pressables that opt their whole subtree out of text selection, and they cancel the default
 * mousedown behaviour so a press on the row stays reliable. Cancelling mousedown also stops the browser from
 * ever starting a text selection, so a row has to let the event through when the press starts on a value the
 * user is meant to be able to copy.
 *
 * Value cells re-enable selection on themselves (see the `isSelectable` prop of TextWithTooltip), which is
 * exactly what this checks for: an element whose computed `user-select` is `text` has opted back in, while
 * everything else in the row still computes to `none` and keeps today's behaviour.
 */
function isSelectableTextTarget(target: EventTarget | null | undefined): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    const computedStyle = window.getComputedStyle(target);
    // Safari only reports the prefixed property, so both have to be consulted
    return computedStyle.userSelect === 'text' || computedStyle.getPropertyValue('-webkit-user-select') === 'text';
}

export default isSelectableTextTarget;
