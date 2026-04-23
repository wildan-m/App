# `eslint-seatbelt` patches

### [eslint-seatbelt+0.1.3+001+thread-safety.patch](eslint-seatbelt+0.1.3+001+thread-safety.patch)

- Reason:

    ```
    Without this, running `npm run lint` with `--concurrency=auto` races on
    the atomic rename of the TSV and crashes with:
      ENOENT: no such file or directory, rename '.../eslint.seatbelt.tsv.wip*.tmp'
      -> 'config/eslint/eslint.seatbelt.tsv'
    Falling back to `--concurrency=1` is too slow for this repo.
    ```

- Upstream PR/issue: https://github.com/justjake/eslint-seatbelt/pull/27
- E/App issue: N/A
- PR introducing patch: https://github.com/Expensify/App/pull/88566
