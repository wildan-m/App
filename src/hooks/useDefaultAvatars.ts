import {useMemoizedLazyExpensifyIcons} from './useLazyAsset';

export default function useDefaultAvatars() {
    const {ConciergeAvatar, NotificationsAvatar, FallbackAvatar} = useMemoizedLazyExpensifyIcons(['ConciergeAvatar', 'NotificationsAvatar', 'FallbackAvatar']);
    return {ConciergeAvatar, NotificationsAvatar, FallbackAvatar};
}
