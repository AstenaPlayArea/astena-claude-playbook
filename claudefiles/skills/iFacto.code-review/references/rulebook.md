# iFacto review rulebook — 42 active rules, 11 exceptions
_Generated from CodeReview Nexus by `scripts/export-guidelines.py` (Nexus commit in `MANIFEST.json`). Never edit; a rule changes only in the Nexus._

**How to use this.** Read this file once. It is the complete active rulebook in short form,
followed by every exception in full. Open the matching `## <id>` section of `references/rules.md`
ONLY for a rule you are about to fire or seriously considered; never read that file whole.
`conf` is how many times a devlead confirmed a hit of that rule on a real PR; 0 means seeded
from the company standard and not yet confirmed in review. Severity: blocking > should-fix > nit.
The CI pipeline's AI Code Review checks the same rules on every PR build as warnings; a rule
marked `pipeline: off` is not checked there, `pipeline: error` fails the PR build there.

## clean

- **`clean-action-tooltip-effect-scope-preconditions`** · ⚠️ should-fix · conf 0
  - An action's `ToolTip` states what changes, on which records, and what must be true before it may run; it never merely echoes the caption.
  - _Detect:_ An action with no `ToolTip`; a tooltip that echoes the caption (`'Posts.'`, `'Executes the Post action.'`, `'Opens the page.'`); field phrasing borrowed for an action (`'Specifies …'` — an action specifies no value); a batch or filter-scoped action described as if it applied to the current record only; an irreversible action whose tooltip does not say so; and a tooltip placed on the `actionref` instead of on the action it references, where the original stays undocumented. See sample: `ifacto-action-tooltip-states-effect-and-preconditions.bad.al`.
- **`clean-al-file-naming-crs`** · ℹ️ nit · conf 0
  - AL files are named `<ObjectNameShort>.<ObjectTypeShortPascalCase>.al`; the object id is not part of the file name.
  - _Detect:_ `Table 50100 Customer Extension.al` and `Codeunit 50190 Customer Management Tests.al` — the retired iFacto format; the ID and the spaces are the signal. Also `CustomerExtension.al` (missing the type segment), `customer_extension.al` (snake_case), `50100.al` (ID only), and `CustomerCard.PageExtension.al` (`Extension` spelled out instead of `Ext`).
- **`clean-field-tooltip-on-table-field`** · ⚠️ should-fix · conf 3
  - A field's `ToolTip` is declared once on the table or tableextension field and says more than the caption; page controls, report and query columns declare no tooltip of their own.
  - _Detect:_ A table field with no `ToolTip`; a tooltip that only restates the caption (`field("Return Date"; Date) { ToolTip = 'Specifies the return date.'; }`) — it tells an agent nothing it could not read from the field name; the same text duplicated on both the table field and the page control, which silently drifts because the page value wins; and tooltips declared only on page controls, leaving every other page that shows the field undocumented and the metadata empty. See sample: `ifacto-table-field-tooltip-is-canonical-description.bad.al`.
- **`clean-honour-isgui-parameter`** · ⚠️ should-fix · conf 1
  - A procedure that receives an IsGUI/GuiAllowed flag shows no request page, dialog or confirm when the flag is false.
- **`clean-no-modify-after-insert`** · ℹ️ nit · conf 1
  - Do not call `Modify()` on a record right after `Insert()`; set all fields before the insert.
- **`clean-no-ps1-test-scripts-in-app`** · ⚠️ should-fix · conf 0
  - A PowerShell test script (`.ps1`) lives under `Test/`, never under `App/`.
  - _Detect:_ the PR adds or modifies a `.ps1` file whose path is under `App/` (any depth, e.g. `App/Src/API/BCApiTestScript.ps1`). A `.ps1` under `Test/` is fine. Build or deployment scripts that are not test scripts are not what this rule is about; if one lives under `App/` on purpose, say so in the PR.
- **`clean-progress-dialog-in-long-loops`** · ⚠️ should-fix · conf 1
  - A long or unbounded loop opens, updates and closes a progress `Dialog`, with `Dialog.Open`, every `Update` and `Close` guarded by `GuiAllowed()`.
  - _Detect:_ A `repeat..until`, `while`, or `for` loop over records with no progress feedback at all; or an early `if not GuiAllowed() then exit` that skips headless runs but still shows no dialog in interactive ones; or `Dialog.Open` without a matching `Dialog.Close`. See sample: `ifacto-progress-dialog-long-running.bad.al`.
- **`clean-pte-suffix-on-tableextension-members`** · ⚠️ should-fix · conf 0
  - In a PTE app (object ids 50000..99999), every new field and every new procedure on a tableextension carries the suffix `PTE`, exact case.
  - _Detect:_ a `tableextension` whose object id is in 50000..99999 adds a `field(...)` or a `procedure` whose name does not end in `PTE` (exact capitalisation; `pte` and `Pte` are wrong too). Only members the diff adds count; modified or renamed existing members, fields on base tables, and members of pages, codeunits, reports and other object types are out of scope.
- **`clean-single-object-per-file`** · ⚠️ should-fix · conf 0
  - Each `.al` file declares exactly one AL object or object extension.
  - _Detect:_ Two or more object declarations in one `.al` file — typically a table followed by its processor codeunit, or an enum bundled with the object that uses it. Also commented-out remnants of a second object left behind after a split.
- **`clean-tests-for-business-logic`** · ⚠️ should-fix · conf 2
  - A PR that adds or changes business logic includes test codeunits covering that logic.
  - _Detect:_ a codeunit in the PR gains or changes business logic - a procedure that calculates, validates, processes data or implements a business rule - and no test codeunit is added or changed in the same PR. A test codeunit is recognised by `Subtype = Test`, by `[Test]` procedures, or by "Test"/"Tests" in its name. Only codeunits count: changes to tables, pages, reports, xmlports, queries and enums, cosmetic changes (comments, formatting, whitespace), simple getters and setters, and renames without logic changes need no test. A codeunit covered by an exemption (upgrade, install, name patterns - see the exceptions bound to this rule) never produces a finding, not even one that explains the exemption: it is treated exactly like a clean file.
## dependencies

- **`deps-app-json-dependency-needs-nuget-json`** · ⚠️ should-fix · conf 0
  - A dependency added to or changed in `app.json` is resolvable from `nuget.json` in the same PR: the Offering that contains it is listed there, or, for a third-party app, its package is added.
  - _Detect:_ the PR adds or changes an entry in the `dependencies` array of `app.json` and `nuget.json` is not changed in the same PR, while no Offering already listed in `nuget.json` contains that app. When the Offering contents cannot be verified from the PR alone (the CI review sees only the diff), report the unchanged `nuget.json` as a question - "is this app covered by a listed Offering?" - not as a certainty.
- **`deps-nuget-json-offerings-only`** · 🛑 blocking · conf 2
  - A customer repository's `nuget.json` lists only Offerings (Distri offering packages), never individual apps.
- **`deps-nuget-offerings-in-updateappsourceapps`** · ⚠️ should-fix · conf 0
  - In a repository that has an `UpdateAppSourceApps.yml`, every Offering added to a `nuget*.json` also appears under `appsource_offerings` in that file, has a `-TEST` twin, and its type is in `NugetTypeFilterToOverrideWithBCVersion`.
  - _Detect:_ only when the repository contains an `UpdateAppSourceApps.yml`; otherwise the rule does not apply at all. The PR adds or changes an Offering entry in any file matching `nuget*.json` (`nuget.json`, `nugetW1.json`, `nugetBE.json`, ...) and, in the same PR, `UpdateAppSourceApps.yml` does not gain the Offering under `appsource_offerings`, or the `-TEST` type is missing from the nuget file, or `NugetTypeFilterToOverrideWithBCVersion` lacks the type. When `UpdateAppSourceApps.yml` is not part of the fetched context, report the check as unresolved, never as a finding.
## design

- **`design-api-columns-are-a-contract`** · 🛑 blocking · conf 1
  - Columns of API pages and queries are never removed or renamed; an obsolete column keeps its name and returns a default.
- **`design-extensible-enum-implements-interface`** · ⚠️ should-fix · conf 1
  - An enum that models behaviour is `Extensible = true` and implements an interface; callers dispatch through the interface, never through `case`/`if` on the enum value.
- **`design-flowfield-for-derived-values`** · ⚠️ should-fix · conf 2
  - A value derivable from other data is a FlowField; a stored copy requires a stated reason and an upgrade codeunit that fills existing records.
- **`design-his-mirror-document-fields`** · ⚠️ should-fix · conf 4
  - In an app that depends on a Distri app, a field added to a sales or purchase document table (Header/Line, including table extensions) is also added to the matching HIS history table. **Applies only to Distri apps:** the app's `app.json` declares a dependency whose name starts with `Distri` and whose publisher is `iFacto Business Solutions NV`. No such dependency: the rule does not apply and is never a finding. A dependency on iFacto Base, iFacto Environments or another iFacto app that is not named `Distri...` does not count (PROJMAN, a ProjectPulse addon, depends on those and has no HIS tables).
  - _Detect:_ first read `app.json` of the app the PR belongs to; stop here if it has no `Distri...` dependency from `iFacto Business Solutions NV`. Otherwise: the PR adds a stored field to `Sales Header`, `Sales Line`, `Purchase Header` or `Purchase Line` (table or tableextension) and the same PR does not add the same field (same number, type, length, name) to the matching HIS table or its extension. A FlowField or FlowFilter on the document table needs no counterpart.
- **`design-logic-in-table-or-codeunit-not-report`** · ⚠️ should-fix · conf 2
  - Business logic lives in table or codeunit procedures that take the working data as `var` parameters; report and report-extension triggers only call them.
- **`design-meth-called-only-from-table`** · ⚠️ should-fix · conf 4
  - A Meth codeunit is declared and invoked only from the public procedure of its own source table; pages, reports and other codeunits call the table procedure.
  - _Detect:_ A variable of a `... Meth` codeunit type declared in any object other than the Meth codeunit's own source table — most commonly a page action or another codeunit calling the Meth entry point directly.
- **`design-meth-single-public-procedure`** · ⚠️ should-fix · conf 1
  - A Meth codeunit exposes exactly one public procedure, wrapped in `OnBefore`/`OnAfter` integration events with an `IsHandled` guard; every helper is `local`.
  - _Detect:_ A Meth codeunit with two or more non-local procedures, or with helper procedures left public by omitting the `local` keyword. Also missing `OnBefore`/`OnAfter` events on the entry point, which blocks per-customer extensibility.
- **`design-meth-takes-data-as-parameters`** · ⚠️ should-fix · conf 5
  - A Meth procedure receives every record and value it needs as parameters; it does not `Get` its setup, `SetRange`/`FindSet` its own lines or `CalcFields` inside the unit.
  - _Detect:_ A `… Meth` procedure whose signature carries only keys and flags (`ShipmentNo: Code[20]`, `Post: Boolean`) and whose body opens with record retrieval. Detection signals: `<Setup>.Get()` as the first statement of a Meth procedure; `SetRange` plus `FindSet` over a persisted table inside the unit under test; `CalcFields` on a record the procedure fetched itself.
- **`design-no-namespace`** · 🛑 blocking · conf 0
  - AL source files declare no `namespace`; the feature is not adopted at iFacto yet.
  - _Detect:_ any `namespace <Name>;` declaration at the top of an `.al` file, and any `using` statement that depends on one.
- **`design-no-singleinstance-cache-across-posting`** · ⚠️ should-fix · conf 1
  - Values needed later in a posting flow are carried on the document (extra fields on Sales Header transferred in CU 80 subscribers), not in a SingleInstance cache codeunit.
- **`design-reference-lines-by-systemid`** · ℹ️ nit · conf 1
  - A record that references a line of another table stores the line's SystemId plus a type enum, not the Line No.
- **`design-standard-controls-before-control-addin`** · ℹ️ nit · conf 1
  - Use a standard page control (Blob/Media field in a group) before building a control add-in.
- **`design-table-logic-in-meth-codeunit`** · ⚠️ should-fix · conf 2
  - Table triggers and table procedures contain no business logic; they delegate to a `<Table Name> <Purpose> Meth` codeunit.
  - _Detect:_ Business logic written directly in a table trigger (`OnInsert`, `OnModify`, `OnDelete`, `OnValidate`) or in the body of a table procedure — record lookups, calculations, validations inline in the table object. The logic is untestable in isolation, offers no extensibility events, and mixes data structure with behaviour.
- **`design-upgrade-codeunit-for-install-data`** · ⚠️ should-fix · conf 1
  - Data registered by the install codeunit (captions, default setup) is also registered by the upgrade codeunit under an upgrade tag, so existing tenants receive it.
## performance

- **`perf-external-calls-via-page-background-task`** · ⚠️ should-fix · conf 1
  - A page or factbox that calls an external service does so in a page background task, never in OnAfterGetRecord / OnAfterGetCurrRecord.
- **`perf-job-queue-touch-each-record-once`** · ⚠️ should-fix · conf 1
  - Related periodic updates run in one job queue entry, and each record is updated at most once per run.
- **`perf-no-rereading-loop-temp-via-integer`** · ⚠️ should-fix · conf 1
  - Records already collected in a temporary table are processed from that buffer (Integer dataitem or FindSet on the temp record), never re-read from the database.
- **`perf-readisolation-on-processing-reads`** · ⚠️ should-fix · conf 4
  - Record reads in batch or processing methods set `ReadIsolation` explicitly (ReadUncommitted for non-critical reads, ReadCommitted where consistency matters).
- **`perf-setloadfields-on-every-read`** · ⚠️ should-fix · conf 5
  - Every read operation on a record (`Get`, `Find`, `FindFirst`, `FindLast`, `FindSet`, `Next` loops) is preceded by `SetLoadFields` naming the fields the code actually uses.
## permissions

- **`perm-admin-and-user-pair`** · ⚠️ should-fix · conf 0
  - An extension ships exactly two assignable permission sets, Admin and User, listing the same tables: Admin grants RIMD everywhere, User grants R on setup tables and RIMD on the rest.
  - _Detect:_ Shipping one permission set for everyone; granting `RIMD` on setup tables in the User set; granting only `R` (or omitting the table entirely) on transactional tables in the User set, so normal work fails with a permission error; adding a third or fourth set (viewer, read-only, per-module role) — the standard is exactly two; or letting the two sets drift so a table added later appears in Admin only. See sample: `ifacto-permissionset-admin-and-user-pair.bad.al`.
- **`perm-admin-included-in-d365-full-access`** · ⚠️ should-fix · conf 0
  - An extension with an Admin permission set also ships a `permissionsetextension` on `D365 FULL ACCESS` whose only content is `IncludedPermissionSets = <Admin set>`.
  - _Detect:_ An extension that defines an Admin permission set but contains no `permissionsetextension ... extends "D365 FULL ACCESS"` — the primary miss, and the one to detect first: if the app has an Admin set, the extension object must exist.
- **`perm-setup-table-inherentpermissions-rx`** · ⚠️ should-fix · conf 1
  - Every setup (configuration/singleton) table declares `InherentPermissions = RX;`, in addition to its lines in both permission sets.
  - _Detect:_ Three findings, all detectable by reading the table's property block:
- **`perm-tabledata-only`** · ⚠️ should-fix · conf 4
  - Permission sets grant `tabledata` permissions only; they do not list codeunits, pages, reports or other objects individually.
## security

- **`security-no-hardcoded-secrets`** · 🛑 blocking · conf 0 · pipeline: error
  - AL code never contains a literal secret: no password, API key, bearer token, client secret or connection string with embedded credentials; secrets are read from IsolatedStorage, a setup table or a Key Vault wrapper.
  - _Detect:_ an added or changed line assigns a non-empty literal to something named like a secret - `password`, `pwd`, `secret`, `apikey`, `api_key`, `api-key`, `token`, `bearer`, `authorization`, `client_secret`, `accountkey`, `sharedaccesskey`, `connectionstring` - or contains a connection string with `Password=`, `Pwd=`, `AccountKey=` or `SharedAccessKey=`, or a literal that looks like a real key (`sk-...`, `ghp_...`, `xox[abp]-...`, a base64 string longer than 32 characters assigned to an auth-looking variable). Applies to every object type, including captions and comments.
## testing

- **`testing-data-in-memory-never-inserted`** · ⚠️ should-fix · conf 0 · pipeline: off
  - A business-logic test builds its records in memory with `Init()` and passes them in; it never calls `Insert`, `Modify`, `Delete` on a real table or a `Library…Create…` helper.
  - _Detect:_ A test codeunit that writes to the database to set up a calculation or validation test. Detection signals: `Insert`, `Insert(true)`, `Modify`, or `Delete` on a **non-temporary** record inside a `Subtype = Test` codeunit or one of its local helpers; a call to a `Library…Create…` helper in a test whose asserts cover a single calculation; an assert that re-reads the record with `Get` or `FindFirst` instead of reading the returned value.
- **`testing-doubles-replace-all-dependencies`** · ⚠️ should-fix · conf 0 · pipeline: off
  - Every dependency of the unit under test (lookups, posting, dialogs, external services, branching rules) is replaced by a Stub, Spy, Mock or Fake living in the Test app.
  - _Detect:_ A "unit" test that drives the behaviour through the database: inserting real setup records, posting real documents, then asserting on posted entries. Detection signals: a business-logic test codeunit that calls posting codeunits (`Sales-Post`, journal posting), performs `Insert`/`Modify` on real setup tables, or asserts on ledger-entry tables while claiming to test one calculation or validation.
- **`testing-enum-extension-doubles-in-test-app-only`** · ⚠️ should-fix · conf 0 · pipeline: off
  - Interface doubles are injected through an `enumextension` in the Test app whose values point at Mock/Fake codeunits; no test-only enum value or double codeunit exists in the App.
  - _Detect:_ Test-only enum values or double codeunits declared in the App (production) project. Detection signals: an App-project enum value named `Mock…`/`Fake…`/`Test…`, an App-project codeunit whose name marks it as a double (`Double - …`, `…-Mock`, `…-Fake`), or a production `enumextension` whose `Implementation =` targets such a codeunit.
- **`testing-exercise-production-code-not-a-copy`** · 🛑 blocking · conf 1
  - A test calls the production procedure it claims to cover. It never re-implements that logic in the test codeunit and asserts against the re-implementation.
  - _Detect:_ a `Subtype = Test` codeunit containing a local procedure whose body duplicates a filter chain, calculation or branch found in the object under test; an assert whose argument is that local procedure rather than the production call; a test comment explaining why the real procedure was *not* invoked. When the duplicated logic is the very thing the PR changes, the test is not cover at all.
- **`testing-manual-subscriber-bind-unbind`** · ⚠️ should-fix · conf 0 · pipeline: off
  - A subscriber double declares `EventSubscriberInstance = Manual`, and every `BindSubscription` in a test has a matching `UnbindSubscription` on every code path.
  - _Detect:_ A double codeunit whose `[EventSubscriber]` methods carry no `EventSubscriberInstance = Manual` property (it is live globally and silently), or a test that calls `BindSubscription` with no matching `UnbindSubscription` on any code path (the double leaks into every subsequent test). Detection signals: a codeunit in the Test app with `[EventSubscriber]` attributes but no `EventSubscriberInstance = Manual`; a `BindSubscription` call whose codeunit variable never appears in an `UnbindSubscription` in the same method or helper.

# Exceptions

A finding that matches one of these is suppressed and listed under "Suppressed by exception"
with the exception id. `rule: opinion` exceptions suppress whole classes of opinion findings.

## exc-clean-tests-for-business-logic-data-migrations
_rule: clean-tests-for-business-logic · scope: global_

## Looks like
A new or changed procedure in an upgrade codeunit (registered against an `OnGetPerCompanyUpgradeTags` / `OnGetPerDatabaseUpgradeTags` tag, or otherwise a one-shot data migration copying/backfilling field values) with no test codeunit covering it - the shape `clean-tests-for-business-logic` normally fires on.

## Accepted because
"We don't test data migrations" (devlead verdict). Matches the CI AI review's own long-standing "upgrade codeunit exemption," which this rulebook previously had no stated position on (flagged as a `miss` in that PR's retro).

## Applies when
`/review` is about to raise a `clean-tests-for-business-logic` finding whose substance is missing test coverage for an **upgrade/migration codeunit's** own migration logic (tag-guarded, run once per company/database to move or backfill data). Suppress it. Does not extend to business logic that happens to live in the same file but isn't the migration itself, nor to runtime logic the migrated feature exposes going forward (that logic's own tests are unaffected).

## exc-clean-tests-for-business-logic-install-codeunits
_rule: clean-tests-for-business-logic · scope: global_

## Looks like
A new or changed procedure in an install codeunit (`Subtype = Install`, or - when only the diff is visible and the Subtype property is not in it - a codeunit whose name contains "Install") with no test codeunit covering it.

## Accepted because
Install codeunits run once at installation to seed setup data; the CI AI Code Review has exempted them from the test requirement since its first version, as it does upgrade codeunits (`exc-clean-tests-for-business-logic-data-migrations`). The exemption is absolute: every procedure of the codeunit is exempt, public or not, however it is called from elsewhere.

## Applies when
`/review` is about to raise a `clean-tests-for-business-logic` finding on an install codeunit's own installation logic. Suppress it, and do not emit a finding to explain the exemption. Business logic that merely lives in the same file but is not installation logic, and runtime logic the installed feature exposes afterwards, keep their own test expectation.

## exc-clean-tests-for-business-logic-rhe-caption-codeunits
_rule: clean-tests-for-business-logic · scope: global_

## Looks like
A new or changed procedure in a codeunit whose name contains "RHE" or "Caption", with no test codeunit covering it.

## Accepted because
RHE (the report layout engine of the Distri product: `codeunit 2036821 "RHE Create Layout Meth"`, `2036764 "RHE Default Captions"`, `2037264 "RHE Sales Captions"`, ...) and the Caption codeunits that feed it are part of the iFacto product itself, and the guideline that they need no per-PR tests lives with that product (waldo, 2026-10-07: "RHE/Caption is part of our product. The guideline is IN our product. In a way, this guideline should be moved to the codereviewbrain, so it can be moved back to the pipeline"). This exception is that guideline's home in the brain, from where the export carries it to the pipeline; the CI AI Code Review had exempted the same name patterns since its first version ("additional prefixes may be added to this list in the future").

## Applies when
`/review` is about to raise a `clean-tests-for-business-logic` finding on a codeunit whose name contains "RHE" or "Caption". Suppress it, and do not emit a finding to explain the exemption.

## exc-deps-nuget-json-offerings-only-third-party-apps
_rule: deps-nuget-json-offerings-only · scope: global_

## Looks like
An individual app entry in a customer repo's `nuget.json` or a localized variant
(`nuget.BE.json`, ...), e.g. `ContiniaSoftware.ContiniaKYC.<guid>` in the Continia feed block.

## Accepted because
The rule is about iFacto (Distri) apps, which ship as Offerings. Third-party vendors such as
Continia have no offering: their apps are declared individually, and in the correct dependency
order. When the vendor adds a new dependency app (ContiniaKYC, new since Continia 28.5), the
customer repo must add it or the "Update AppSource Apps" pipeline breaks.

## Applies when
The entry's id belongs to a third-party publisher (not `iFactoBusinessSolutionsNV.*`) and it
sits in that vendor's feed block. The rule still fires for an individual iFacto app.

## exc-design-table-logic-validation-on-table-is-allowed
_rule: design-table-logic-in-meth-codeunit · scope: global_

## Looks like
A table trigger (`OnInsert`, `OnModify`, `OnDelete`, `OnValidate`) containing validation
directly: `TestField(...)` on a mandatory field, or a guard that raises an `Error` when the
record is in a state the operation is not allowed in — instead of delegating to a
`<Table Name> Check Meth` codeunit. Typically noticed because a sibling table in the same
feature *does* route its triggers through a Check Meth.

## Accepted because
"F3 = no issue for me, validation code is allowed on table" (Tom De Causmaeker, 2026-09-16,
a customer PR, on `Table 50017 "Commission Entry PTE"` OnInsert/OnDelete). Validation is not the
business logic the rule is aimed at, and a devlead does not want it raised.

## Applies when
`/review` is about to raise a `design-table-logic-in-meth-codeunit` finding whose substance is
**validation** in a table trigger or table procedure — `TestField`, a state guard with an
`Error`, a field-level consistency check. Suppress it. It does not extend to calculations,
record lookups against other tables, posting or document creation in a table trigger: that is
still the logic the rule exists for.

## exc-no-finding-for-analyzer-required-overflow-guards
_rule: opinion · scope: global_

## Looks like
`Validate`/assignment calls wrapped in `CopyStr(<expr>, 1, MaxStrLen(<targetfield>))` (or similar length clamps) to silence a CodeCop / analyzer possible-overflow warning such as AA0139 - often several across otherwise-unrelated files, not mentioned in the PR description, and looking like scope creep bundled into a feature PR.

## Accepted because
These clamps are required to keep the analyzer (CodeCop / PerTenantExtensionCop / iFacto.ALCop) green; the build gate already enforces zero warnings, so they *have* to be in the PR that trips the warning. Analyzer territory is CI's job, not code review (see the review skill's hard rule: "Analyzer AA*/AS* is not reviewed; CI does that"). A devlead does not want them raised as findings - not as scope creep, not as "silent truncation", not as "document them". They come along with whatever code touched those lines.

## Applies when
`/review` is about to raise a finding whose substance is a `CopyStr(..., MaxStrLen(...))` (or equivalent length clamp) added to satisfy an analyzer overflow warning. Suppress it, full stop - including when the clamp targets the wrong field or truncates a genuine business key in a way that is observably wrong in the diff. Do not reframe it as a scope/hygiene, reviewability, or "wrong target field" finding either. CodeCop's job is to require the guard exists; whether it clamps the *right* field is analyzer/CI territory too, not code review's, per waldo.

## exc-no-finding-for-dataclassification-on-obsoleted-fields
_rule: opinion · scope: global_

## Looks like
A field being set `ObsoleteState = Pending` (kept, not dropped, ahead of a later drop release) also loses its `DataClassification = CustomerContent` (or similar) property, falling back to `ToBeClassified`, while the field still holds real customer data until the drop.

## Accepted because
"We don't care" (devlead verdict). Data-classification metadata on a field already marked for removal is not something a devlead wants raised as a finding.

## Applies when
`/review` is about to raise an `opinion` finding whose substance is a `DataClassification` (or equivalent classification metadata) change on a field being obsoleted in the same diff. Suppress it. Does not extend to classification changes on fields that are not being obsoleted.

## exc-no-finding-for-manual-test-coverage
_rule: opinion · scope: global_

## Looks like
A remark about which cases, scenarios or requirement items the author's manual or functional test
covered - in the client, in Jira comments, in the PR description ("the author tested the unknown
sticker only", "not clicked through", "functional test covers X only", "not yet tested by QA",
"status To be tested").

## Accepted because
A code review judges the code and its automated tests, not which cases someone clicked through by
hand (waldo, 2026-10-13: "I don't care about 'clicked through by hand' in a code review. So never
take this into account"). Manual testing is QA's job, after the review.

## Applies when
Always, with one fact the review does check (waldo, same day: "make sure you check the fact it's
tested"): **whether** a functional test was confirmed - the PR description's or a Jira comment's
"✅ Functional test confirmed" (who, when) - is stated in one line of the Overview, yes or no.
**What** that test covered is never graded: never a finding, never on the Jira
`Missing / deviating` line, never a Note, never a reason to recommend anything but what the code
earns. Do not infer "not tested" from a short list of tested items. Whether a requirement item is
delivered is judged from the code and the automated tests alone. A requirement item with no code is
still a gap; a missing automated test on a changed branch is still judged under
`clean-tests-for-business-logic`.

## exc-no-finding-for-missing-telemetry
_rule: opinion · scope: global_

## Looks like
Code with no `Session.LogMessage`, `Session.LogError` or `FeatureTelemetry` call — in a new feature, a bug fix, or an upgrade routine that `exit`s on unexpected data.

## Accepted because
Telemetry is opt-in at iFacto. Introducing a first emission needs an owned event-ID catalogue, a DataClassification and a TelemetryScope decision; an agent or reviewer has none of those inputs unless the task asked for observability. An upgrade routine that exits on missing data with a comment is complete.

## Applies when
`/review` is about to raise an `opinion` finding of the form "add telemetry", "log this", or "the upgrade should emit an event". It must not. This exception does not cover *how* existing telemetry is written; once an app emits telemetry, the usual rules apply.

## exc-no-finding-for-translation-content
_rule: opinion · scope: global_

#### Looks like
A PR whose diff touches only translation files (`.xlf` or similar) - wording that looks
wrong, missing, or inconsistent, incomplete coverage of a term, anything about translation
*content*.

#### Accepted because
"Never review translations, just approve" (waldo, 2026-09-24, PR iFactoApps-8108). Translation
content is out of scope for code review; a PR that touches only translation files gets
`approve` outright, no content-level scrutiny.

#### Applies when
`/review` is about to raise an `opinion` finding about translation wording/content, or is
about to recommend anything other than `approve` for a PR whose diff is translation files
only. Suppress the finding and recommend `approve`. Does not extend to a PR that mixes
translation files with AL changes - those AL changes still get reviewed normally.
