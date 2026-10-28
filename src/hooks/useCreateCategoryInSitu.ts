import {createPolicyCategory, setWorkspaceCategoryEnabled} from '@libs/actions/Policy/Category';
import {getDecodedCategoryName} from '@libs/CategoryUtils';
import {hasTags} from '@libs/PolicyUtils';
import StringUtils from '@libs/StringUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type * as OnyxTypes from '@src/types/onyx';

import useCurrentUserPersonalDetails from './useCurrentUserPersonalDetails';
import useOnboardingTaskInformation from './useOnboardingTaskInformation';
import useOnyx from './useOnyx';
import usePermissions from './usePermissions';
import usePolicyData from './usePolicyData';
import useReviewWorkspaceSettingsTaskCompletion from './useReviewWorkspaceSettingsTaskCompletion';

type CreatedCategory = {
    /** Name of the category to write onto the expense */
    categoryName: string;

    /** The policy's categories with the created or re-enabled one included, so violations can be recomputed before Onyx catches up */
    policyCategories: OnyxTypes.PolicyCategories;
};

/**
 * Adds a category to a workspace from within an expense flow and returns what the caller needs to apply it to the
 * expense. A disabled category with the same name is hidden from the picker but would still fail as a duplicate,
 * so it is turned back on instead of being created again.
 */
function useCreateCategoryInSitu(policyID: string | undefined): (name: string) => CreatedCategory | undefined {
    const currentUserPersonalDetails = useCurrentUserPersonalDetails();
    const {isBetaEnabledOrUnknown} = usePermissions();
    const policyData = usePolicyData(policyID);
    const [policyCategories] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY_CATEGORIES}${policyID}`);
    const [policyTags] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY_TAGS}${policyID}`);
    const getReviewWorkspaceSettingsTaskCompletion = useReviewWorkspaceSettingsTaskCompletion();

    const {
        taskReport: setupCategoryTaskReport,
        taskParentReport: setupCategoryTaskParentReport,
        isOnboardingTaskParentReportArchived: isSetupCategoryTaskParentReportArchived,
        hasOutstandingChildTask,
        parentReportAction,
    } = useOnboardingTaskInformation(CONST.ONBOARDING_TASK_TYPE.SETUP_CATEGORIES);

    const {
        taskReport: setupCategoriesAndTagsTaskReport,
        taskParentReport: setupCategoriesAndTagsTaskParentReport,
        isOnboardingTaskParentReportArchived: isSetupCategoriesAndTagsTaskParentReportArchived,
        hasOutstandingChildTask: setupCategoriesAndTagsHasOutstandingChildTask,
        parentReportAction: setupCategoriesAndTagsParentReportAction,
    } = useOnboardingTaskInformation(CONST.ONBOARDING_TASK_TYPE.SETUP_CATEGORIES_AND_TAGS);

    return (name: string) => {
        const categoryName = StringUtils.sanitizeName(name);

        if (!policyID) {
            return undefined;
        }

        const onboardingTaskParams = {
            isSetupCategoriesTaskParentReportArchived: isSetupCategoryTaskParentReportArchived,
            setupCategoryTaskReport,
            setupCategoryTaskParentReport,
            currentUserAccountID: currentUserPersonalDetails.accountID,
            hasOutstandingChildTask,
            parentReportAction,
            setupCategoriesAndTagsTaskReport,
            setupCategoriesAndTagsTaskParentReport,
            isSetupCategoriesAndTagsTaskParentReportArchived,
            setupCategoriesAndTagsHasOutstandingChildTask,
            setupCategoriesAndTagsParentReportAction,
            policyHasTags: hasTags(policyTags),
            reviewWorkspaceSettingsTaskData: getReviewWorkspaceSettingsTaskCompletion(),
        };

        // Category keys may be HTML-encoded, so match on the decoded name like the duplicate check in getCategoryNameError.
        const existingCategory = Object.values(policyCategories ?? {}).find((category) => getDecodedCategoryName(category.name) === categoryName);

        if (existingCategory) {
            if (!existingCategory.enabled) {
                setWorkspaceCategoryEnabled({
                    ...onboardingTaskParams,
                    isVendorMatchingBetaEnabled: isBetaEnabledOrUnknown(CONST.BETAS.VENDOR_MATCHING),
                    policyData,
                    categoriesToUpdate: {[existingCategory.name]: {name: existingCategory.name, enabled: true}},
                });
            }

            return {
                categoryName: existingCategory.name,
                policyCategories: {...policyCategories, [existingCategory.name]: {...existingCategory, enabled: true}},
            };
        }

        createPolicyCategory({...onboardingTaskParams, policyID, categoryName});

        return {
            categoryName,
            policyCategories: {
                ...policyCategories,
                [categoryName]: {
                    name: categoryName,
                    enabled: true,
                    errors: null,
                    pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.ADD,
                },
            },
        };
    };
}

export default useCreateCategoryInSitu;
export type {CreatedCategory};
