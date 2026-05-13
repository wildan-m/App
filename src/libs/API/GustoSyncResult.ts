type GustoSyncResult = {
    addedEmployeesCount?: number;
    removedEmployeesCount?: number;
    skippedEmployees?: Array<{name: string; id: string; reason: string}>;
};

export type {GustoSyncResult};
