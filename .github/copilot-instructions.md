<!-- treegress:workflow-rule -->
## Feature development — use the Treegress workflow

Every feature must be developed through the Treegress verification workflow, not ad hoc:

1. `treegress_start_feature` — capture the intent.
2. `treegress_generate_test_plan` → `treegress_approve_test_plan` — fix expected behaviour before coding.
3. `treegress_generate_test_strategy` → `treegress_approve_test_strategy` — turn it into test obligations.
4. Implement the feature, then `treegress_report_implementation_done`.
5. Author the tests: `treegress_author_tests` gives the per-obligation spec — write each pending test, stamp the given marker verbatim, assert EXACTLY the listed then-clauses, and reuse the existing tests' fixtures (don't re-inline mocks). Then `treegress_verify` (it runs your tests + reviews; it does not generate them in the default delegated mode).
6. Fix findings and `treegress_verify` again until green (a REVIEWED PARTIAL can be re-verified after editing tests), then `treegress_review` → `treegress_close_feature` (→ VERIFIED).

Do not consider a feature done until Treegress reports VERIFIED with evidence.
<!-- /treegress:workflow-rule -->
