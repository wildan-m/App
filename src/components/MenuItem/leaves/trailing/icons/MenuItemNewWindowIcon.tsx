import {MENU_ITEM_ACCESSIBILITY_ANNOUNCEMENT, useMenuItemAccessibilityAnnouncement} from '@components/MenuItem/MenuItemAccessibilityContext';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';

import React from 'react';

import MenuItemTrailingIcon from './MenuItemTrailingIcon';

/**
 * The trailing "opens in a new tab" indicator of a `MenuItem.Row`. Unlike the chevron it stays at
 * full opacity and brightens with the row, and it announces that pressing the row leaves the app
 */
function MenuItemNewWindowIcon() {
    const {translate} = useLocalize();
    const icons = useMemoizedLazyExpensifyIcons(['NewWindow']);

    useMenuItemAccessibilityAnnouncement(MENU_ITEM_ACCESSIBILITY_ANNOUNCEMENT.OPENS_IN_NEW_TAB, translate('common.opensInNewTab'));

    return <MenuItemTrailingIcon src={icons.NewWindow} />;
}

export default MenuItemNewWindowIcon;
