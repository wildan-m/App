/**
 * This migration is no longer needed — the backend now sends chatReportIDAdmins and
 * chatReportIDAnnounce as strings for all users, and sufficient time has passed for
 * all existing client data to have been migrated.
 */
export default function (): Promise<void> {
    return Promise.resolve();
}
