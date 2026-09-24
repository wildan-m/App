type SetVacationDelegateParams = {
    creator: string;
    vacationerEmail?: string;
    vacationDelegateEmail: string;
    clearAfter?: string;
    overridePolicyDiffWarning: boolean;
    domainAccountID?: number;
};

export default SetVacationDelegateParams;
