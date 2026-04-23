#!/bin/bash

# Lints files that have been added, modified, or renamed on the current branch
# relative to origin/main.

set -euo pipefail

TOP="$(realpath "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)/..")"
readonly TOP
# shellcheck source=./shellUtils.sh
source "${TOP}/scripts/shellUtils.sh"

info "Fetching origin/main"
git fetch origin main --no-tags

MERGE_BASE_SHA_HASH="$(git merge-base origin/main HEAD)"
readonly MERGE_BASE_SHA_HASH

if [[ -z "${MERGE_BASE_SHA_HASH}" ]] || ! [[ "${MERGE_BASE_SHA_HASH}" =~ ^[a-fA-F0-9]{40}$ ]]; then
    error "git merge-base returned unexpected output: ${MERGE_BASE_SHA_HASH}"
    exit 1
fi

declare -a CHANGED_FILES=()
while IFS= read -r CHANGED_FILE; do
    CHANGED_FILES+=("${CHANGED_FILE}")
done < <(
    git diff --diff-filter=AMR --name-only "${MERGE_BASE_SHA_HASH}" HEAD \
        -- '*.js' '*.jsx' '*.ts' '*.tsx' '*.mjs' '*.cjs'
)

if [[ "${#CHANGED_FILES[@]}" -eq 0 ]]; then
    info "No lintable files changed on this branch"
    exit 0
fi

info "Linting ${#CHANGED_FILES[@]} changed file(s):"
printf '    %s\n' "${CHANGED_FILES[@]}"

exec "${TOP}/scripts/lint.sh" "${CHANGED_FILES[@]}"
