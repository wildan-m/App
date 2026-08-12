import {getActivePolicies} from '@libs/PolicyUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy, Session, TryNewDot} from '@src/types/onyx';

import type {OnyxCollection, OnyxEntry} from 'react-native-onyx';

/**
 * This file contains the logic for sending additional data to Sentry.
 *
 * It uses Onyx.connectWithoutView as nothing here is related to the UI. We only send data to the external provider and want to keep this outside of the render loop.
 */
import * as Sentry from '@sentry/react-native';
import Onyx from 'react-native-onyx';

import {cleanupCrashDiagnostics, initializeCrashDiagnostics} from './crashDiagnostics';
import {initializeDatabaseSizeTelemetry, remeasureDatabaseSize} from './databaseSizeTelemetry';
import {cleanupMemoryTracking, initializeMemoryTracking} from './sendMemoryContext';
import {setSpanAttribute} from './spanAttributes';

/**
 * Connect to Onyx to retrieve information about the user's active policies.
 */
let session: OnyxEntry<Session>;
let activePolicyID: OnyxEntry<string>;
let policies: OnyxCollection<Policy>;
let tryNewDot: OnyxEntry<TryNewDot>;

Onyx.connectWithoutView({
    key: ONYXKEYS.NVP_ACTIVE_POLICY_ID,
    callback: (value) => {
        if (!value) {
            return;
        }
        activePolicyID = value;
        sendPoliciesContext();
    },
});

Onyx.connectWithoutView({
    key: ONYXKEYS.SESSION,
    callback: (value) => {
        if (!value?.email) {
            return;
        }
        session = value;
        sendPoliciesContext();
    },
});

Onyx.connectWithoutView({
    key: ONYXKEYS.COLLECTION.POLICY,
    callback: (value) => {
        if (!value) {
            return;
        }
        policies = value;
        sendPoliciesContext();
    },
});

Onyx.connectWithoutView({
    key: ONYXKEYS.COLLECTION.REPORT,
    callback: (value) => {
        if (!value) {
            return;
        }
        const reportsCount = Object.keys(value).length;
        setSpanAttribute(CONST.TELEMETRY.ATTRIBUTE_REPORTS_COUNT_RAW, reportsCount);
        sendReportsCountTag(reportsCount);
        remeasureDatabaseSize();
    },
});

Onyx.connectWithoutView({
    key: ONYXKEYS.PERSONAL_DETAILS_LIST,
    callback: (value) => {
        if (!value) {
            return;
        }
        const personalDetailsCount = Object.keys(value).length;
        setSpanAttribute(CONST.TELEMETRY.ATTRIBUTE_PERSONAL_DETAILS_COUNT_RAW, personalDetailsCount);
        sendPersonalDetailsCountTag(personalDetailsCount);
    },
});

// This connection powers the transactions_count Sentry tag and the transactions_count_raw span
// attribute. Like the other connections in this file, it only forwards data to the external
// telemetry provider and must stay outside the render loop, so useOnyx does not apply.
Onyx.connectWithoutView({
    key: ONYXKEYS.COLLECTION.TRANSACTION,
    callback: (value) => {
        if (!value) {
            return;
        }
        const transactionsCount = Object.keys(value).length;
        setSpanAttribute(CONST.TELEMETRY.ATTRIBUTE_TRANSACTIONS_COUNT_RAW, transactionsCount);
        sendTransactionsCountTag(transactionsCount);
        remeasureDatabaseSize();
    },
});

Onyx.connectWithoutView({
    key: ONYXKEYS.NVP_TRY_NEW_DOT,
    callback: (value) => {
        tryNewDot = value;
        sendTryNewDotCohortTag();
    },
});

/**
 * Buckets policy count into cohorts for Sentry tagging
 */
function bucketPolicyCount(count: number): string {
    if (count <= 1) {
        return '0-1';
    }
    if (count <= 10) {
        return '2-10';
    }
    if (count <= 50) {
        return '11-50';
    }
    if (count <= 100) {
        return '51-100';
    }
    if (count <= 250) {
        return '101-250';
    }
    if (count <= 500) {
        return '251-500';
    }
    if (count <= 1000) {
        return '501-1000';
    }
    return '1000+';
}

/**
 * Buckets transaction count into cohorts for Sentry tagging. Labels carry an ordering prefix
 * because Sentry sorts tag values alphabetically; borders are provisional and can be revised
 * once the raw transactions_count_raw distribution has been collected.
 */
function bucketTransactionCount(count: number): string {
    if (count <= 100) {
        return '1_0-100';
    }
    if (count <= 1000) {
        return '2_101-1000';
    }
    if (count <= 5000) {
        return '3_1001-5000';
    }
    if (count <= 20000) {
        return '4_5001-20000';
    }
    if (count <= 50000) {
        return '5_20001-50000';
    }
    return '6_50000+';
}

/**
 * Buckets report count into cohorts for Sentry tagging
 */
function bucketReportCount(count: number): string {
    if (count <= 60) {
        return '0-60';
    }
    if (count <= 300) {
        return '61-300';
    }
    if (count <= 1000) {
        return '301-1000';
    }
    if (count <= 2500) {
        return '1001-2500';
    }
    if (count <= 5000) {
        return '2501-5000';
    }
    if (count <= 10000) {
        return '5001-10000';
    }
    return '10000+';
}

function sendPoliciesContext() {
    if (!policies || !session?.email || !activePolicyID) {
        return;
    }
    const activePolicies = getActivePolicies(policies, session.email).map((policy) => policy.id);

    let userRole: string = CONST.POLICY.ROLE.USER;
    for (const policy of Object.values(policies)) {
        if (policy?.role === CONST.POLICY.ROLE.ADMIN) {
            userRole = CONST.POLICY.ROLE.ADMIN;
            break;
        }
        if (policy?.role === CONST.POLICY.ROLE.AUDITOR) {
            userRole = CONST.POLICY.ROLE.AUDITOR;
        }
    }

    setSpanAttribute(CONST.TELEMETRY.ATTRIBUTE_POLICIES_COUNT_RAW, activePolicies.length);
    const policiesCountBucket = bucketPolicyCount(activePolicies.length);
    Sentry.setTag(CONST.TELEMETRY.TAGS.ACTIVE_POLICY, activePolicyID);
    Sentry.setTag(CONST.TELEMETRY.TAGS.POLICIES_COUNT, policiesCountBucket);
    Sentry.setTag(CONST.TELEMETRY.TAGS.USER_ROLE, userRole);
    Sentry.setContext(CONST.TELEMETRY.CONTEXT_POLICIES, {activePolicyID, activePolicies});
}

function sendTryNewDotCohortTag() {
    const cohort = tryNewDot?.nudgeMigration?.cohort;
    if (!cohort) {
        return;
    }
    Sentry.setTag(CONST.TELEMETRY.TAGS.NUDGE_MIGRATION_COHORT, cohort);
}

function sendReportsCountTag(reportsCount: number) {
    const reportsCountBucket = bucketReportCount(reportsCount);
    Sentry.setTag(CONST.TELEMETRY.TAGS.REPORTS_COUNT, reportsCountBucket);
}

function sendPersonalDetailsCountTag(personalDetailsCount: number) {
    const personalDetailsCountBucket = bucketReportCount(personalDetailsCount);
    Sentry.setTag(CONST.TELEMETRY.TAGS.PERSONAL_DETAILS_COUNT, personalDetailsCountBucket);
}

function sendTransactionsCountTag(transactionsCount: number) {
    const transactionsCountBucket = bucketTransactionCount(transactionsCount);
    Sentry.setTag(CONST.TELEMETRY.TAGS.TRANSACTIONS_COUNT, transactionsCountBucket);
}

function initializeTelemetryTrackers() {
    initializeMemoryTracking();
    initializeCrashDiagnostics();
    initializeDatabaseSizeTelemetry();
}

function cleanupTelemetryTrackers() {
    cleanupMemoryTracking();
    cleanupCrashDiagnostics();
}

export {initializeTelemetryTrackers, cleanupTelemetryTrackers};
