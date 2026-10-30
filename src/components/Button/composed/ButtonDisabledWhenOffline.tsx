import useNetwork from '@hooks/useNetwork';

import type {ButtonProps} from '..';

import Button from '..';

function ButtonDisabledWhenOffline({children, ...props}: ButtonProps) {
    const {isOffline} = useNetwork();
    return (
        <Button
            sentryLabel={props.sentryLabel}
            {...props}
            isDisabled={isOffline}
        >
            {children}
        </Button>
    );
}
export default ButtonDisabledWhenOffline;
