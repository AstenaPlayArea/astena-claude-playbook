# iFacto review rules — full text
_Generated from CodeReview Nexus by `scripts/export-guidelines.py`. One `## <id>` section per active rule;
open a section only for a rule you are about to fire. Never edit._

## clean-action-tooltip-effect-scope-preconditions
_category: clean · severity: should-fix · confidence: 0 · scope: global · origin: iFacto company standard (BCQuality custom/knowledge/ui/ifacto-action-tooltip-states-effect-and-preconditions.md) / waldo / 2026-09-08_

### Rule
An action's `ToolTip` states what changes, on which records, and what must be true before it may run; it never merely echoes the caption.

### Rationale
iFacto company standard. An action has no source field to inherit a tooltip from, so the `ToolTip` on the action definition is the *only* description that exists for it — in the UI, and in the metadata an AI agent reads before deciding whether to invoke it. A caption alone is not decidable: from `Post` an agent cannot tell whether the operation touches one record or the whole filtered set, whether it can be undone, or what must be true before it is allowed to run.

**Detect:** An action with no `ToolTip`; a tooltip that echoes the caption (`'Posts.'`, `'Executes the Post action.'`, `'Opens the page.'`); field phrasing borrowed for an action (`'Specifies …'` — an action specifies no value); a batch or filter-scoped action described as if it applied to the current record only; an irreversible action whose tooltip does not say so; and a tooltip placed on the `actionref` instead of on the action it references, where the original stays undocumented. See sample: `ifacto-action-tooltip-states-effect-and-preconditions.bad.al`.

### Good / Bad
```al
// Bad
page 50102 "Rental Contract List"
{
    PageType = List;
    ApplicationArea = All;
    UsageCategory = Lists;
    SourceTable = "Rental Contract";
    Caption = 'Rental Contracts';
    layout
    {
        area(Content)
        {
            repeater(Lines)
            {
                field("No."; Rec."No.") { }
                field(Status; Rec.Status) { }
            }
// …
```
```al
// Good
// iFacto standard: every action tooltip says what changes, on which records,
// and what it costs — a precondition, or the fact that it cannot be undone.
// Enough for a person or an agent to decide whether to invoke it.
page 50102 "Rental Contract List"
{
    PageType = List;
    ApplicationArea = All;
    UsageCategory = Lists;
    SourceTable = "Rental Contract";
    Caption = 'Rental Contracts';
    layout
    {
        area(Content)
        {
            repeater(Lines)
            {
// …
```

## clean-al-file-naming-crs
_category: clean · severity: nit · confidence: 0 · scope: global · origin: iFacto company standard (BCQuality custom/knowledge/style/ifacto-al-file-naming.md) / waldo / 2026-09-08_

### Rule
AL files are named `<ObjectNameShort>.<ObjectTypeShortPascalCase>.al`; the object id is not part of the file name.

### Rationale
iFacto company standard, mandatory. AL source files are named after the CRS pattern `<ObjectNameShort>.<ObjectTypeShortPascalCase>.al` — for example `CustomerExtension.TableExt.al`, `CustomerCalculateScoreMeth.Codeunit.al`, `CustomerCard.PageExt.al`, `CustomerManagementTests.Codeunit.al`. The names are produced mechanically by the CRS AL Language Extension, so the convention is enforced by tooling rather than by review.

**Detect:** `Table 50100 Customer Extension.al` and `Codeunit 50190 Customer Management Tests.al` — the retired iFacto format; the ID and the spaces are the signal. Also `CustomerExtension.al` (missing the type segment), `customer_extension.al` (snake_case), `50100.al` (ID only), and `CustomerCard.PageExtension.al` (`Extension` spelled out instead of `Ext`).

### Good / Bad
```al
// Bad
// Non-compliant file names for the object below. The object body is identical
// to the good sample — only the file name is the defect.
//
//     PageExt 50103 Customer Card Ext.al   Retired iFacto format. The object ID
//                                          and the spaces are the signal.
//     Pag21-Ext50103.CustomerCardExt.al    CRS package default. Appears whenever
//                                          the three CRS.FileNamePattern* settings
//                                          are missing from .vscode/settings.json.
//     CustomerCardExt.PageExtension.al     "Extension" spelled out; only Ext is used.
//     CustomerCardExt.al                   Type segment missing entirely.
//     customer_card_ext.al                 snake_case and lower-case.
//     CustomerCardExt.pageext.al           Type segment not PascalCase.
//     Customer Card Ext.PageExt.al         Spaces survive; <ObjectNameShort> strips
//                                          every non-alphanumeric character.
//
// Mixing any of these with the compliant pattern inside one project is itself
// …
```
```al
// Good
// Compliant file name for the object below:
//     CustomerCardExt.PageExt.al
//
// The name is derived mechanically, never typed by hand:
//     <ObjectNameShort>          "Customer Card Ext" -> CustomerCardExt (spaces stripped)
//     <ObjectTypeShortPascalCase> pageextension      -> PageExt
//
// The same pattern across the other object types:
//     table 50100 "Customer Extension"                      -> CustomerExtension.Table.al
//     tableextension 50101 "Customer Ext"                   -> CustomerExt.TableExt.al
//     codeunit 50122 "Customer CalculateScore Meth"         -> CustomerCalculateScoreMeth.Codeunit.al
//     codeunit 50190 "Customer Management Tests"            -> CustomerManagementTests.Codeunit.al
//     enum 50104 "Customer Score Type"                      -> CustomerScoreType.Enum.al
//     pagecustomization "Customer Card Cust"                -> CustomerCardCust.PageCust.al
//     permissionsetextension 50102 "D365FULLACCESS Ext RNT" -> D365FULLACCESSExtRNT.PermissionSetExt.al
pageextension 50103 "Customer Card Ext" extends "Customer Card"
// …
```

## clean-field-tooltip-on-table-field
_category: clean · severity: should-fix · confidence: 7 · scope: global · origin: iFacto company standard (BCQuality custom/knowledge/ui/ifacto-table-field-tooltip-is-canonical-description.md) / waldo / 2026-09-08_

### Rule
A field's `ToolTip` is declared once on the table or tableextension field and says more than the caption; page controls, report and query columns declare no tooltip of their own.

### Rationale
iFacto company standard, from BC 2024 release wave 1 (runtime 13.0), where `ToolTip` became available on table fields. A field's tooltip is declared **once, on the `table` or `tableextension` field**; page controls that bind the field declare no `ToolTip` of their own and inherit it. Tooltips are therefore never written on page fields, report columns, or query columns — only on the table field they originate from.

**Detect:** A table field with no `ToolTip`; a tooltip that only restates the caption (`field("Return Date"; Date) { ToolTip = 'Specifies the return date.'; }`) — it tells an agent nothing it could not read from the field name; the same text duplicated on both the table field and the page control, which silently drifts because the page value wins; and tooltips declared only on page controls, leaving every other page that shows the field undocumented and the metadata empty. See sample: `ifacto-table-field-tooltip-is-canonical-description.bad.al`.

**Never a finding:** a page control, report column or query column that declares **no** `ToolTip` - that is the required state, not a gap. The finding is always on the table field (missing or caption-only tooltip) or on the control that *does* declare one. Reading "the page control has no ToolTip" as a violation inverts this rule.

### Good / Bad
```al
// Bad
table 50101 "Rental Contract"
{
    Caption = 'Rental Contract';
    DataClassification = CustomerContent;
    fields
    {
        // Anti-pattern: no ToolTip at all. Nothing to inherit, nothing in the
        // metadata — an agent can only guess from the field name (AA0234).
        field(1; "No."; Code[20])
        {
            Caption = 'No.';
        }
        // Anti-pattern: the tooltip restates the caption. It adds no information
        // about where the value comes from or what it affects.
        field(10; "Customer No."; Code[20])
        {
// …
```
```al
// Good
// iFacto standard: the tooltip lives on the table field and describes the value,
// its source, and what it drives — enough for a person or an agent to know what
// the field is for. Page controls declare no ToolTip and inherit this text.
table 50101 "Rental Contract"
{
    Caption = 'Rental Contract';
    DataClassification = CustomerContent;
    fields
    {
        field(1; "No."; Code[20])
        {
            Caption = 'No.';
            ToolTip = 'Specifies the unique identifier of the rental contract. Assigned from the number series in Rental Setup when the contract is created.';
        }
        field(10; "Customer No."; Code[20])
        {
// …
```

## clean-honour-isgui-parameter
_category: clean · severity: should-fix · confidence: 1 · scope: global · origin: iFactoApps a customer PR / harvested / 2026-09-08_

### Rule
A procedure that receives an IsGUI/GuiAllowed flag shows no request page, dialog or confirm when the flag is false.

### Rationale
The same print/posting routine runs from the job queue; a request page there hangs the job.

### Good / Bad
```al
// Bad
procedure PrintCopies(…; IsGUI: Boolean; …) — IsGUI passed through but every path still calls Report.RunModal with a request page.
```
```al
// Good
if IsGUI then Report.RunModal(…) else Report.Run(…, false, false, RecVar); job-queue run prints everything in the Print Copy list without UI.
```

## clean-no-modify-after-insert
_category: clean · severity: nit · confidence: 2 · scope: global · origin: a customer PR / harvested / 2026-09-08_

### Rule
Do not call `Modify()` on a record right after `Insert()`; set all fields before the insert.

### Rationale
The extra Modify is a second write and a second round of OnModify triggers for nothing.

### Good / Bad
```al
// Bad
FADeprBook.Insert(true); FADeprBook."Depreciation Starting Date" := StartDate; FADeprBook.Modify(true);
```
```al
// Good
FADeprBook."Depreciation Starting Date" := StartDate; FADeprBook.Insert(true);
```

## clean-no-ps1-test-scripts-in-app
_category: clean · severity: should-fix · confidence: 0 · scope: global · origin: DevOps Templates AICodeReview/Rules/ifacto-company-rules.md @88f1359 (CI AI Code Review guidelines) / waldo / 2026-10-07_

### Rule
A PowerShell test script (`.ps1`) lives under `Test/`, never under `App/`.

### Rationale
`App/` is the production app that ships to the customer; `Test/` is the test app. A `.ps1` written to drive an API or a page during testing is development tooling: in `App/` it inflates the production package and may expose internal test logic or credentials to the customer. iFacto repositories keep `App/` and `Test/` as sibling folders at the repo root, each with its own `app.json`.

**Detect:** the PR adds or modifies a `.ps1` file whose path is under `App/` (any depth, e.g. `App/Src/API/BCApiTestScript.ps1`). A `.ps1` under `Test/` is fine. Build or deployment scripts that are not test scripts are not what this rule is about; if one lives under `App/` on purpose, say so in the PR.

### Good / Bad
```al
// Bad
App/Src/API/BCApiTestScript.ps1      -- a test script inside the production app
```
```al
// Good
Test/Src/API/APIItemsPTE.Page.ps1    -- test scripts next to the test codeunits
Test/Src/API/APISlimStock.ps1
```

## clean-progress-dialog-in-long-loops
_category: clean · severity: should-fix · confidence: 1 · scope: global · origin: iFacto company standard (BCQuality custom/knowledge/ui/ifacto-progress-dialog-long-running.md) / waldo / 2026-09-08_

### Rule
A long or unbounded loop opens, updates and closes a progress `Dialog`, with `Dialog.Open`, every `Update` and `Close` guarded by `GuiAllowed()`.

### Rationale
iFacto company standard, mandatory. When code runs a long or unbounded operation — looping over a recordset, batch processing, posting, import/export — and `GuiAllowed()` is true, a `Dialog` progress indicator must be opened, updated inside the loop, and closed afterwards. Without it the BC client freezes silently, users click again or kill the session, and support tickets follow.

**Detect:** A `repeat..until`, `while`, or `for` loop over records with no progress feedback at all; or an early `if not GuiAllowed() then exit` that skips headless runs but still shows no dialog in interactive ones; or `Dialog.Open` without a matching `Dialog.Close`. See sample: `ifacto-progress-dialog-long-running.bad.al`.

### Good / Bad
```al
// Bad
codeunit 50135 "Sales Line Batch Processor"
{
    procedure ProcessEntries(SalesHeader: Record "Sales Header")
    var
        SalesLine: Record "Sales Line";
    begin
        SalesLine.SetRange("Document Type", SalesHeader."Document Type");
        SalesLine.SetRange("Document No.", SalesHeader."No.");
        if SalesLine.FindSet() then
            repeat
                ProcessLine(SalesLine);
            until SalesLine.Next() = 0;
    end;
    local procedure ProcessLine(SalesLine: Record "Sales Line")
    begin
    end;
// …
```
```al
// Good
codeunit 50134 "Sales Line Batch Processor"
{
    procedure ProcessEntries(SalesHeader: Record "Sales Header")
    var
        SalesLine: Record "Sales Line";
        ProgressDialog: Dialog;
        ProcessingMsg: Label 'Processing entries...\Line #1######', Comment = '#1 = record counter';
        LineCount: Integer;
    begin
        if GuiAllowed() then
            ProgressDialog.Open(ProcessingMsg);
        SalesLine.SetRange("Document Type", SalesHeader."Document Type");
        SalesLine.SetRange("Document No.", SalesHeader."No.");
        if SalesLine.FindSet() then
            repeat
                LineCount += 1;
// …
```

## clean-pte-suffix-on-tableextension-members
_category: clean · severity: should-fix · confidence: 0 · scope: global · origin: DevOps Templates AICodeReview/Rules/ifacto-company-rules.md @88f1359 (CI AI Code Review guidelines) / waldo / 2026-10-07_

### Rule
In a PTE app (object ids 50000..99999), every new field and every new procedure on a tableextension carries the suffix `PTE`, exact case.

### Rationale
A Per-Tenant Extension lives on top of the base app and of iFacto's ISV apps; the suffix makes a customization recognisable at a glance in field lists, in code and in upgrade conflicts, and keeps new members from colliding with a future base-app or ISV field of the same name. Only PTE apps carry it: iFacto's own products (ISV, AppSource) use their object-id ranges and are never flagged.

**Detect:** a `tableextension` whose object id is in 50000..99999 adds a `field(...)` or a `procedure` whose name does not end in `PTE` (exact capitalisation; `pte` and `Pte` are wrong too). Only members the diff adds count; modified or renamed existing members, fields on base tables, and members of pages, codeunits, reports and other object types are out of scope.

The PTE range is exactly the five-digit ids 50000..99999. Count the digits of the object id first: 1-4 digits is below the range, 6 or more digits (100000, 1234567, 2039467, 71301237) is an ISV or AppSource app and is never flagged, and a five-digit id below 50000 (40000) is not a PTE either. Only a five-digit id of 50000 or more applies.

### Good / Bad
```al
// Bad - PTE app, new members without the suffix (and one with the wrong case)
tableextension 50100 "Customer Extension" extends Customer
{
    fields
    {
        field(50100; "Loyalty Points"; Integer) { }
        field(50101; "VIP Status pte"; Boolean) { }
    }
    procedure CalculateDiscount(): Decimal
    begin
    end;
}
```
```al
// Good - PTE app
tableextension 50100 "Customer Extension" extends Customer
{
    fields
    {
        field(50100; "Loyalty Points PTE"; Integer) { }
        field(50101; "VIP Status PTE"; Boolean) { }
    }
    procedure CalculateDiscountPTE(): Decimal
    begin
    end;
}
```
```al
// Good - not a PTE (seven-digit id, ISV app): no suffix expected, never flagged
tableextension 2039467 "Customer DistriPlus" extends Customer
{
    fields
    {
        field(2039467; "Carrier Account No."; Code[20]) { }
    }
}
```

## clean-single-object-per-file
_category: clean · severity: should-fix · confidence: 0 · scope: global · origin: iFacto company standard (BCQuality custom/knowledge/style/ifacto-single-object-per-file.md) / waldo / 2026-09-08_

### Rule
Each `.al` file declares exactly one AL object or object extension.

### Rationale
iFacto company standard, mandatory. Each `.al` file declares **exactly one** AL object or object extension. The AL compiler accepts multiple objects per file, and "they belong together" is a tempting reason to bundle a table with its processing codeunit — at iFacto that is a violation regardless of object size, perceived relation, or convenience.

**Detect:** Two or more object declarations in one `.al` file — typically a table followed by its processor codeunit, or an enum bundled with the object that uses it. Also commented-out remnants of a second object left behind after a split.

### Good / Bad
```al
// Bad
table 50127 "Mail Queue"
{
    Caption = 'Mail Queue';
    DataClassification = CustomerContent;
    fields
    {
        field(1; "Entry No."; Integer)
        {
            Caption = 'Entry No.';
        }
    }
}
codeunit 50128 "Mail Queue Processor"
{
    procedure ProcessQueue()
    var
// …
```
```al
// Good
codeunit 50126 "Mail Queue Processor"
{
    procedure ProcessQueue()
    var
        MailQueue: Record "Mail Queue";
    begin
        if MailQueue.FindSet() then
            repeat
                ProcessEntry(MailQueue);
            until MailQueue.Next() = 0;
    end;
    local procedure ProcessEntry(MailQueue: Record "Mail Queue")
    begin
    end;
}
```

## clean-tests-for-business-logic
_category: clean · severity: should-fix · confidence: 5 · scope: global · origin: a customer PR, a customer PR / harvested / 2026-09-08_

### Rule
A PR that adds or changes business logic includes test codeunits covering that logic.

### Rationale
Reviewers ask for tests when they are missing; the CI AI review flags it too. Untested posting/processing logic is where regressions land.

**Detect:** a codeunit in the PR gains or changes business logic - a procedure that calculates, validates, processes data or implements a business rule - and no test codeunit is added or changed in the same PR. A test codeunit is recognised by `Subtype = Test`, by `[Test]` procedures, or by "Test"/"Tests" in its name. Only codeunits count: changes to tables, pages, reports, xmlports, queries and enums, cosmetic changes (comments, formatting, whitespace), simple getters and setters, and renames without logic changes need no test. A codeunit covered by an exemption (upgrade, install, name patterns - see the exceptions bound to this rule) never produces a finding, not even one that explains the exemption: it is treated exactly like a clean file.

### Good / Bad
```al
// Bad
New codeunit with an import/processing routine; Test/ folder untouched.
```
```al
// Good
Test codeunit in Test/ exercising the new routine (happy path + the error path the code guards).
```

## dependencies-application-test-library
_category: dependencies · severity: should-fix · confidence: 0 · scope: global · origin: Aerts commit ceafc3ff / gunter / 2026-10-19_

### Rule
A test app depends on Microsoft's `Application Test Library` (d852d5d2-a39d-4179-baeb-f99a19e32510), never on `Tests-TestLibraries` or on the separate libraries it replaces (`Library Assert`, `Any`, `Library Variable Storage`, `System Application Test Library`).

### Rationale
The Application Test Library bundles Microsoft's test libraries into one dependency. Five separate entries in `app.json` must each be resolved, version-aligned and kept up to date; one entry cannot drift out of step. iFacto test apps converge on the single dependency (Aerts, 2026-10-19).

**Detect:** an `app.json` whose `dependencies` contains `"name": "Tests-TestLibraries"` (id 5d86850b-0d76-4eca-bd7b-951ad998e997), or one of `Library Assert` (dd0be2ea-f733-4d65-bb34-a28f4624fb14), `Any` (e7320ebb-08b3-4406-b1ec-b4927d3e280b), `Library Variable Storage` (5095f467-0a01-4b99-99d1-9ff1237d286f), `System Application Test Library` (9856ae4f-d1a7-46ef-89bb-6ef056398228), when the diff adds or changes that entry.
**Never a finding:** `Test Runner` (23de40a6-dfe8-4f80-80db-d70f83ce8caf), which stays a separate dependency; an `app.json` the diff does not touch; a production app (`App/`) that has none of these dependencies.

### Good / Bad
```json
// Bad
{ "id": "5d86850b-0d76-4eca-bd7b-951ad998e997", "publisher": "Microsoft", "name": "Tests-TestLibraries", "version": "25.2.0.0" },
{ "id": "dd0be2ea-f733-4d65-bb34-a28f4624fb14", "publisher": "Microsoft", "name": "Library Assert", "version": "25.2.0.0" },
{ "id": "e7320ebb-08b3-4406-b1ec-b4927d3e280b", "publisher": "Microsoft", "name": "Any", "version": "25.2.0.0" }
```
```json
// Good
{ "id": "d852d5d2-a39d-4179-baeb-f99a19e32510", "publisher": "Microsoft", "name": "Application Test Library", "version": "25.2.0.0" },
{ "id": "23de40a6-dfe8-4f80-80db-d70f83ce8caf", "publisher": "Microsoft", "name": "Test Runner", "version": "25.2.0.0" }
```

## deps-app-json-dependency-needs-nuget-json
_category: dependencies · severity: should-fix · confidence: 0 · scope: global · origin: DevOps Templates AICodeReview/Rules/ifacto-company-rules.md @88f1359 (CI AI Code Review guidelines) / waldo / 2026-10-07_

### Rule
A dependency added to or changed in `app.json` is resolvable from `nuget.json` in the same PR: the Offering that contains it is listed there, or, for a third-party app, its package is added.

### Rationale
The build and deploy templates resolve and download every dependency through `nuget.json`, not through `app.json`. A new `app.json` dependency that `nuget.json` cannot resolve fails the pipeline at the first build. Because `nuget.json` lists Offerings rather than individual apps (`deps-nuget-json-offerings-only`), a new dependency on a Distri app that an already-listed Offering contains needs no `nuget.json` change; a dependency on an app outside every listed Offering does: the Offering that carries it, or - only for third-party apps such as Continia (`exc-deps-nuget-json-offerings-only-third-party-apps`) - the package itself.

**Detect:** the PR adds or changes an entry in the `dependencies` array of `app.json` and `nuget.json` is not changed in the same PR, while no Offering already listed in `nuget.json` contains that app. When the Offering contents cannot be verified from the PR alone (the CI review sees only the diff), report the unchanged `nuget.json` as a question - "is this app covered by a listed Offering?" - not as a certainty.

### Good / Bad
```al
// Bad
Modified: App/app.json      (added dependency "DxSteel Core")
(nuget.json not changed, and no listed Offering contains DxSteel Core)
```
```al
// Good
Modified: App/app.json      (added dependency "DxSteel Core")
Modified: nuget.json        (added the Offering "DxSteelAppSource" that contains it)
```
```al
// Good - already covered
Modified: App/app.json      (added dependency "Distri Logistics Carrier")
(nuget.json unchanged: the Offering "Distri Build" listed there already contains it)
```

## deps-nuget-json-offerings-only
_category: dependencies · severity: blocking · confidence: 2 · scope: global · origin: a customer PR, a customer PR / harvested / 2026-09-08_

### Rule
A customer repository's `nuget.json` lists only Offerings (Distri offering packages), never individual apps.

### Rationale
Offerings are the supported deployment unit; listing individual apps bypasses the offering's version alignment and breaks the build/deploy templates.

### Good / Bad
```al
// Bad
"dependencies": [ { "description": "Distri Logistics Carrier", "id": "iFactoBusinessSolutionsNV.DistriLogisticsCarrier.…", "version": "-AS" } ]
```
```al
// Good
"dependencies": [ { "description": "Distri Build", "id": "iFactoBusinessSolutionsNV.DistriBuild.26fb761b-…", "version": "-AS" } ]  // an Offering; the app dependency stays in app.json
```

## deps-nuget-offerings-in-updateappsourceapps
_category: dependencies · severity: should-fix · confidence: 0 · scope: global · origin: DevOps Templates AICodeReview/Rules/ifacto-company-rules.md @88f1359 (CI AI Code Review guidelines) / waldo / 2026-10-07_

### Rule
In a repository that has an `UpdateAppSourceApps.yml`, every Offering added to a `nuget*.json` also appears under `appsource_offerings` in that file, has a `-TEST` twin, and its type is in `NugetTypeFilterToOverrideWithBCVersion`.

### Rationale
The nightly update pipeline (`UpdateAppSourceApps.yml`) installs and maintains the customer's Offerings from its own `appsource_offerings` list; an Offering present in `nuget.json` but absent there is never installed in the customer environment and surfaces as a runtime error. The `-TEST` twin (`DistriAppSource` → `DistriAppSource-TEST`) is what validates the Offering in the test environment before production, and `NugetTypeFilterToOverrideWithBCVersion` must name the type for the BC-version override to apply.

**Detect:** only when the repository contains an `UpdateAppSourceApps.yml`; otherwise the rule does not apply at all. The PR adds or changes an Offering entry in any file matching `nuget*.json` (`nuget.json`, `nugetW1.json`, `nugetBE.json`, ...) and, in the same PR, `UpdateAppSourceApps.yml` does not gain the Offering under `appsource_offerings`, or the `-TEST` type is missing from the nuget file, or `NugetTypeFilterToOverrideWithBCVersion` lacks the type. When `UpdateAppSourceApps.yml` is not part of the fetched context, report the check as unresolved, never as a finding.

### Good / Bad
```al
// Bad
Modified: nuget.json                 (added type "DxSteelAppSource" with the DxSteel Core dependency)
(UpdateAppSourceApps.yml not changed; no "DxSteelAppSource-TEST" type)
```
```al
// Good
Modified: nugetBE.json               (added "DistriAppSource" and "DistriAppSource-TEST" types)
Modified: UpdateAppSourceApps.yml    (Distri Belgium GUID under appsource_offerings; "DistriAppSource" in NugetTypeFilterToOverrideWithBCVersion)
```

## design-api-columns-are-a-contract
_category: design · severity: blocking · confidence: 2 · scope: global · origin: a customer PR / harvested / 2026-09-08_

### Rule
Columns of API pages and queries are never removed or renamed; an obsolete column keeps its name and returns a default.

### Rationale
Consumers bind to the JSON contract; removing a column breaks every integration silently.

### Good / Bad
```al
// Bad
column(lastStatementNo; "Last Statement No.") removed because the base field was obsoleted.
```
```al
// Good
column(lastStatementNo; LastStatementNo) kept, with LastStatementNo a variable defaulting to 0 (or Method = Count where applicable).
```

## design-extensible-enum-implements-interface
_category: design · severity: should-fix · confidence: 1 · scope: global · origin: iFactoApps a customer PR / harvested / 2026-09-08_

### Rule
An enum that models behaviour is `Extensible = true` and implements an interface; callers dispatch through the interface, never through `case`/`if` on the enum value.

### Rationale
Avoids if/case chains and lets PTEs extend the behaviour without touching the base code.

**Precision from the company standard:** `Implementation =` on every value, consumers declare a variable **of the interface type** and never name a concrete codeunit, a Null Object implementation covers the "none" value, and the empty/default enum value is guarded before dispatch. The enum is also the test seam: a Test-app `enumextension` injects doubles without touching production code.

### Good / Bad
```al
// Bad
enum 2036648 "RHE Default Footer Type" { Extensible = false; value(0; Textual) … }  with a case statement on the value in the report helper.
```
```al
// Good
enum "RHE Default Footer Type" implements "IFooterType" { Extensible = true; value(0; Textual) { Implementation = "IFooterType" = "RHE Textual Footer"; } }
```

## design-flowfield-for-derived-values
_category: design · severity: should-fix · confidence: 2 · scope: global · origin: a customer PR, a customer PR / harvested / 2026-09-08_

### Rule
A value derivable from other data is a FlowField; a stored copy requires a stated reason and an upgrade codeunit that fills existing records.

### Rationale
A stored derived field goes stale and forces an upgrade codeunit on every existing record; a FlowField is always right and needs no upgrade.

### Good / Bad
```al
// Bad
field(50004; "Vendor Name PTE"; Text[100]) { DataClassification = CustomerContent; }  // filled in OnValidate of "Vendor No.", plus an upgrade codeunit
```
```al
// Good
field(50004; "Vendor Name PTE"; Text[100]) { FieldClass = FlowField; CalcFormula = Lookup(Vendor.Name where("No." = field("Vendor No."))); Editable = false; }
```

## design-his-mirror-document-fields
_category: design · severity: should-fix · confidence: 4 · scope: global · origin: iFactoApps a customer PR, a customer PR, a customer PR / harvested / 2026-09-08_

### Rule
In an app that depends on a Distri app, a field added to a sales or purchase document table (Header/Line, including table extensions) is also added to the matching HIS history table.

**Applies only to Distri apps:** the app's `app.json` declares a dependency whose name starts with `Distri` and whose publisher is `iFacto Business Solutions NV`. No such dependency: the rule does not apply and is never a finding. A dependency on iFacto Base, iFacto Environments or another iFacto app that is not named `Distri...` does not count (PROJMAN, a ProjectPulse addon, depends on those and has no HIS tables).

### Rationale
iFacto Base's HIS framework archives documents; a field missing on the HIS table is silently lost when the document is archived, and reports on history break.

**Precision from the company standard:** the mirrored field carries the **same field number, data type, length and name** — `TransferFields` matches by number, so a different number silently drops the value. Only **normal (stored) fields** are mirrored; FlowFields (`FieldClass = FlowField;` or a `CalcFormula`) and FlowFilters (`FieldClass = FlowFilter;`) are not. Sales Header mirrors to `HIS Sales Header`, Sales Line to `HIS Sales Line`, Purchase Header to `HIS Purchase Header`, Purchase Line to `HIS Purchase Line`.

**Detect:** first read `app.json` of the app the PR belongs to; stop here if it has no `Distri...` dependency from `iFacto Business Solutions NV`. Otherwise: the PR adds a stored field to `Sales Header`, `Sales Line`, `Purchase Header` or `Purchase Line` (table or tableextension) and the same PR does not add the same field (same number, type, length, name) to the matching HIS table or its extension. A FlowField or FlowFilter on the document table needs no counterpart.

### Good / Bad
```al
// Bad
tableextension "SalesHeader Ext PTE" adds field(50126; "API Sales Order No. PTE"; Code[20]) with no counterpart on "HIS Sales Header".
```
```al
// Good
Same field, same id, added to both "Sales Header" and "HIS Sales Header" extensions in the same PR.
```

## design-logic-in-table-or-codeunit-not-report
_category: design · severity: should-fix · confidence: 2 · scope: global · origin: a customer PR / harvested / 2026-09-08_

### Rule
Business logic lives in table or codeunit procedures that take the working data as `var` parameters; report and report-extension triggers only call them.

### Rationale
Logic inside a report cannot be unit-tested; a procedure on the table with a buffer parameter can.

**iFacto-specific form:** the procedure the report calls is the table's public procedure, which delegates to a `<Table> <Purpose> Meth` codeunit — see `design-table-logic-in-meth-codeunit`.

### Good / Bad
```al
// Bad
Calculation procedure declared in the reportextension's var/trigger section, operating on the report's temp records.
```
```al
// Good
Procedure on the table (or a Meth codeunit) with `var TempSalesLine: Record "Sales Line" temporary` as parameter; the report calls it; a test codeunit calls it too.
```

## design-meth-called-only-from-table
_category: design · severity: should-fix · confidence: 8 · scope: global · origin: iFacto company standard (BCQuality custom/knowledge/style/ifacto-meth-codeunit-table-only-caller.md) / waldo / 2026-09-08_

### Rule
A Meth codeunit is declared and invoked only from the public procedure of its own source table; pages, reports and other codeunits call the table procedure.

### Rationale
iFacto company standard, mandatory. A Meth codeunit may be invoked from **exactly one place**: the table it belongs to. Pages, reports, other codeunits, XMLports and queries must never declare or call a Meth codeunit directly — they call the table's public procedure, which internally delegates to the Meth codeunit.

**Detect:** A variable of a `... Meth` codeunit type declared in any object other than the Meth codeunit's own source table — most commonly a page action or another codeunit calling the Meth entry point directly.

### Good / Bad
```al
// Bad
page 50125 "Customer Score Card"
{
    PageType = Card;
    SourceTable = "Customer Score Setup";
    actions
    {
        area(Processing)
        {
            action(CalculateScore)
            {
                Caption = 'Calculate Score';
                ApplicationArea = All;
                trigger OnAction()
                var
                    CustomerCalculateScoreMeth: Codeunit "Customer CalculateScore Meth";
                begin
// …
```
```al
// Good
page 50124 "Customer Score Card"
{
    PageType = Card;
    SourceTable = "Customer Score Setup";
    actions
    {
        area(Processing)
        {
            action(CalculateScore)
            {
                Caption = 'Calculate Score';
                ApplicationArea = All;
                trigger OnAction()
                begin
                    Rec.CalculateCustomScore();
                end;
// …
```

## design-meth-single-public-procedure
_category: design · severity: should-fix · confidence: 3 · scope: global · origin: iFacto company standard (BCQuality custom/knowledge/style/ifacto-meth-codeunit-single-public-procedure.md) / waldo / 2026-09-08_

### Rule
A Meth codeunit exposes exactly one public procedure, wrapped in `OnBefore`/`OnAfter` integration events with an `IsHandled` guard; every helper is `local`.

### Rationale
iFacto company standard, mandatory. A Meth codeunit (name ending in `Meth`) exposes **exactly one** non-local procedure: the entry point for the single business operation it implements. Every helper procedure must be declared `local`.

**Detect:** A Meth codeunit with two or more non-local procedures, or with helper procedures left public by omitting the `local` keyword. Also missing `OnBefore`/`OnAfter` events on the entry point, which blocks per-customer extensibility.

### Good / Bad
```al
// Bad
codeunit 50123 "Customer CalculateScore Meth"
{
    procedure CalculateScore(CustomerNo: Code[20]) Score: Integer
    var
        Customer: Record Customer;
    begin
        if not Customer.Get(CustomerNo) then
            exit(0);
        Score := CalculateBaseScore(Customer);
    end;
    procedure ValidateCustomer(CustomerNo: Code[20]): Boolean
    var
        Customer: Record Customer;
    begin
        exit(Customer.Get(CustomerNo));
    end;
// …
```
```al
// Good
codeunit 50122 "Customer CalculateScore Meth"
{
    procedure CalculateScore(CustomerNo: Code[20]) Score: Integer
    var
        IsHandled: Boolean;
    begin
        OnBeforeCalculateScore(CustomerNo, Score, IsHandled);
        DoCalculateScore(CustomerNo, Score, IsHandled);
        OnAfterCalculateScore(CustomerNo, Score);
    end;
    local procedure DoCalculateScore(CustomerNo: Code[20]; var Score: Integer; IsHandled: Boolean)
    var
        Customer: Record Customer;
    begin
        if IsHandled then
            exit;
// …
```

## design-meth-takes-data-as-parameters
_category: design · severity: should-fix · confidence: 14 · scope: global · origin: iFacto company standard (BCQuality custom/knowledge/testing/ifacto-meth-takes-data-as-parameter-not-lookup.md) / waldo / 2026-09-08_

### Rule
A Meth procedure receives every record and value it needs as parameters; it does not `Get` its setup, `SetRange`/`FindSet` its own lines or `CalcFields` inside the unit.

### Rationale
The production-side counterpart to iFacto's no-database test rule. A Meth codeunit's public procedure receives every record and value its logic needs as **parameters**; it does not `Get` its own setup singleton and it does not `SetRange`/`FindSet` its own lines. A procedure that fetches its own input is welded to the database — the only way any caller, test included, can vary that input is to write a row, which is exactly what `ifacto-test-data-in-memory-never-inserted.md` forbids.

**Detect:** A `… Meth` procedure whose signature carries only keys and flags (`ShipmentNo: Code[20]`, `Post: Boolean`) and whose body opens with record retrieval. Detection signals: `<Setup>.Get()` as the first statement of a Meth procedure; `SetRange` plus `FindSet` over a persisted table inside the unit under test; `CalcFields` on a record the procedure fetched itself.

### Good / Bad
```al
// Bad
codeunit 50430 "Shipment CalcFreight Meth Bad"
{
    // The signature carries a key and nothing else, so the unit fetches its
    // own setup and its own lines. Nothing can vary the input except a
    // database row: every test of the minimum-charge rule has to insert a
    // "Freight Rate Setup" singleton and a shipment with lines first, which
    // drags the number series, the TableRelation checks and the OnInsert
    // triggers of three tables into what is one multiplication and one
    // comparison. The caller already had the shipment in hand and pays for a
    // second read of it.
    procedure CalculateCharge(ShipmentNo: Code[20]) Charge: Decimal
    var
        FreightRateSetup: Record "Freight Rate Setup";
        FreightShipment: Record "Freight Shipment";
        FreightShipmentLine: Record "Freight Shipment Line";
    begin
// …
```
```al
// Good
// Two objects are shown together for contrast only; in a real project each
// lives in its own file, per ifacto-single-object-per-file.
// The table owns the lookups and is the only production caller of its Meth
// codeunit. One read of the setup singleton happens HERE, outside the unit.
table 50428 "Freight Shipment"
{
    fields
    {
        field(1; "No."; Code[20]) { }
        field(10; "Freight Charge"; Decimal) { }
    }
    keys
    {
        key(PK; "No.") { Clustered = true; }
    }
    procedure CalculateFreightCharge(): Decimal
// …
```

## design-no-namespace
_category: design · severity: blocking · confidence: 0 · scope: global · origin: a customer PR / Gunter Peeters / 2026-09-10_

### Rule
AL source files declare no `namespace`; the feature is not adopted at iFacto yet.

### Rationale
iFacto has not agreed a company-wide approach to AL namespaces. Adopting them per PR
fragments the codebase: some objects become namespace-qualified while the rest stay global,
so references, `using` statements and tooling behave differently per file, and every partial
adoption has to be undone once a company convention is set. Until that decision exists, a
namespace declaration is a change that cannot be merged, however correct the surrounding
code is.

**Detect:** any `namespace <Name>;` declaration at the top of an `.al` file, and any `using`
statement that depends on one.

### Good / Bad
```al
// Bad
namespace Heytec.Sales.Items;

using Microsoft.Inventory.Item;

pageextension 50100 "Item Card Ext PTE" extends "Item Card" { }
```
```al
// Good
pageextension 50100 "Item Card Ext PTE" extends "Item Card" { }
```

## design-no-singleinstance-cache-across-posting
_category: design · severity: should-fix · confidence: 1 · scope: global · origin: iFactoApps a customer PR / harvested / 2026-09-08_

### Rule
Values needed later in a posting flow are carried on the document (extra fields on Sales Header transferred in CU 80 subscribers), not in a SingleInstance cache codeunit.

### Rationale
A SingleInstance cache is session state: invisible in data, lost on error, wrong in background sessions, and untestable. A field is durable and shows up in HIS.

### Good / Bad
```al
// Bad
codeunit "SLMF Cache SMSPIFC" { SingleInstance = true; var CashrApplNoByEntryNo: Dictionary of [Integer, Code[20]]; }  read back in an OnAfterPost subscriber.
```
```al
// Good
"CASHR Application No." field on Sales Header and Sales Invoice Header; subscriber on Codeunit 80 "Sales-Post" OnBeforeSalesInvHeaderInsert copies it.
```

## design-reference-lines-by-systemid
_category: design · severity: nit · confidence: 1 · scope: global · origin: iFactoApps a customer PR / harvested / 2026-09-08_

### Rule
A record that references a line of another table stores the line's SystemId plus a type enum, not the Line No.

### Rationale
Line No. is renumbered and reused; SystemId is stable and the enum makes the reference universal across line tables.

### Good / Bad
```al
// Bad
"Route Line No." : Integer referencing the POD route line by Line No.
```
```al
// Good
"Line Type" : Enum "Route Line Type" + "Line System Id" : Guid.
```

## design-standard-controls-before-control-addin
_category: design · severity: nit · confidence: 2 · scope: global · origin: iFactoApps a customer PR / harvested / 2026-09-08_

### Rule
Use a standard page control (Blob/Media field in a group) before building a control add-in.

### Rationale
A control add-in is extra JavaScript, extra permissions and extra maintenance for what a page field already does.

### Good / Bad
```al
// Bad
controladdin "RHE Footer Image Addin" to show and upload a footer image.
```
```al
// Good
page 2036712 "RHE Report Footer Image": field("Footer Image"; Rec."Footer Image") inside a group.
```

## design-table-logic-in-meth-codeunit
_category: design · severity: should-fix · confidence: 3 · scope: global · origin: iFacto company standard (BCQuality custom/knowledge/style/ifacto-meth-codeunit-business-logic.md) / waldo / 2026-09-08_

### Rule
Table triggers and table procedures contain no business logic; they delegate to a `<Table Name> <Purpose> Meth` codeunit.

### Rationale
iFacto company standard, mandatory for all table business logic. Standard BC permits business logic inside table triggers and table procedures; iFacto forbids it. Any procedure on a table that contains business logic must delegate to a dedicated **Meth codeunit** named `<Table Name> <Function Purpose> Meth` (for example `Customer CalculateScore Meth`, `Sales Order ApplyDiscount Meth`).

**Detect:** Business logic written directly in a table trigger (`OnInsert`, `OnModify`, `OnDelete`, `OnValidate`) or in the body of a table procedure — record lookups, calculations, validations inline in the table object. The logic is untestable in isolation, offers no extensibility events, and mixes data structure with behaviour.

### Good / Bad
```al
// Bad
table 50121 "Customer Score Setup"
{
    Caption = 'Customer Score Setup';
    DataClassification = CustomerContent;
    fields
    {
        field(1; "Customer No."; Code[20])
        {
            Caption = 'Customer No.';
            TableRelation = Customer."No.";
        }
        field(2; "Custom Score"; Integer)
        {
            Caption = 'Custom Score';
            trigger OnValidate()
            var
// …
```
```al
// Good
table 50120 "Customer Score Setup"
{
    Caption = 'Customer Score Setup';
    DataClassification = CustomerContent;
    fields
    {
        field(1; "Customer No."; Code[20])
        {
            Caption = 'Customer No.';
            TableRelation = Customer."No.";
        }
        field(2; "Custom Score"; Integer)
        {
            Caption = 'Custom Score';
        }
    }
// …
```

## design-upgrade-codeunit-for-install-data
_category: design · severity: should-fix · confidence: 1 · scope: global · origin: a customer PR / harvested / 2026-09-08_

### Rule
Data registered by the install codeunit (captions, default setup) is also registered by the upgrade codeunit under an upgrade tag, so existing tenants receive it.

### Rationale
Install runs once on new tenants only; without the upgrade counterpart every existing customer misses the new data.

**The iFacto pattern, stated in its canonical direction:** the data work is a **public procedure on the per-company Upgrade codeunit** (one per feature, named after it), `OnUpgradePerCompany` contains one call per feature, and the **Install codeunit calls those same procedures** from `OnInstallAppPerCompany`. The logic exists once; install only dispatches to it.

### Good / Bad
```al
// Bad
RegisterSalesProformaExportCaption added to the install codeunit only.
```
```al
// Good
Same registration in TimstorUpgradePTE with its own upgrade tag, following the existing UpdateGrossTotalAmountCaption pattern.
```

## perf-external-calls-via-page-background-task
_category: performance · severity: should-fix · confidence: 1 · scope: global · origin: a customer PR / harvested / 2026-09-08_

### Rule
A page or factbox that calls an external service does so in a page background task, never in OnAfterGetRecord / OnAfterGetCurrRecord.

### Rationale
A synchronous call blocks the UI on every record change; users feel it while scrolling.

### Good / Bad
```al
// Bad
trigger OnAfterGetCurrRecord() begin GetExternalStock(Rec."No."); end;
```
```al
// Good
CurrPage.EnqueueBackgroundTask(PollTaskId, Codeunit::"AED Stock Poll", Params); results handled in OnPageBackgroundTaskCompleted, errors in OnPageBackgroundTaskError.
```

## perf-job-queue-touch-each-record-once
_category: performance · severity: should-fix · confidence: 1 · scope: global · origin: a customer PR / harvested / 2026-09-08_

### Rule
Related periodic updates run in one job queue entry, and each record is updated at most once per run.

### Rationale
Two job queues over the same table update the same items several times and lock them twice.

### Good / Bad
```al
// Bad
Two job queue codeunits (advice prices, unit prices) each looping all items; worst case four updates per item.
```
```al
// Good
One job queue codeunit that computes both values and issues one Modify per item.
```

## perf-no-rereading-loop-temp-via-integer
_category: performance · severity: should-fix · confidence: 1 · scope: global · origin: a customer PR / harvested / 2026-09-08_

### Rule
Records already collected in a temporary table are processed from that buffer (Integer dataitem or FindSet on the temp record), never re-read from the database.

### Rationale
Reading the same rows three times (collect, mark, process) triples the SQL load of a report for nothing.

### Good / Bad
```al
// Bad
dataitem(Item; Item) { trigger OnAfterGetRecord() … if not TempItem.Get("No.") then CurrReport.Skip(); }
```
```al
// Good
dataitem(Item; Integer) { DataItemTableView = sorting(Number); trigger OnPreDataItem() begin SetRange(Number, 1, TempItem.Count()); end; trigger OnAfterGetRecord() begin if Number = 1 then TempItem.FindSet() else TempItem.Next(); … }
```

## perf-readisolation-on-processing-reads
_category: performance · severity: should-fix · confidence: 4 · scope: global · origin: a customer PR / harvested / 2026-09-08_

### Rule
Record reads in batch or processing methods set `ReadIsolation` explicitly (ReadUncommitted for non-critical reads, ReadCommitted where consistency matters).

### Rationale
Default isolation in processing loops takes and holds locks that block posting and other sessions; explicit isolation documents the intent and removes the contention.

### Good / Bad
```al
// Bad
Clear(SalesLine); SalesLine.SetRange("Document Type", SalesLine."Document Type"::Order); SalesLine.FindSet();
```
```al
// Good
Clear(SalesLine); SalesLine.ReadIsolation := IsolationLevel::ReadUncommitted; SalesLine.SetRange(…); SalesLine.FindSet();
```

## perf-setloadfields-on-every-read
_category: performance · severity: should-fix · confidence: 6 · scope: global · origin: a customer PR / harvested / 2026-09-08_

### Rule
Every read operation on a record (`Get`, `Find`, `FindFirst`, `FindLast`, `FindSet`, `Next` loops) is preceded by `SetLoadFields` naming the fields the code actually uses.

### Rationale
Wide tables such as Sales Header, Item and Customer carry hundreds of columns and BLOB/Media fields; without SetLoadFields every read pulls the full row across SQL and the service tier. The cost multiplies in loops and in code that runs per document line. Making it unconditional keeps reviews simple: a read without SetLoadFields is a finding, not a judgment call.

**Never a finding:** reads in test code - test codeunits (`Subtype = Test`), test libraries, spies, stubs and doubles under `Test/`. A test's one-off `Get` or `FindLast` costs nothing anyone pays for; the rule is about production code that runs per document, per line or per message.

### Good / Bad
```al
// Bad
if not SalesHeader.Get(SalesHeader."Document Type"::Order, OrderNo) then exit;  CopyFromSalesDocument(…, SalesHeader."Salesperson Code", …);
```
```al
// Good
SalesHeader.SetLoadFields("Salesperson Code", "Shortcut Dimension 1 Code", "Sell-to Customer No.", "Quote No.");  if not SalesHeader.Get(…) then exit;
```

## perm-admin-and-user-pair
_category: permissions · severity: should-fix · confidence: 1 · scope: global · origin: iFacto company standard (BCQuality custom/knowledge/security/ifacto-permissionset-admin-and-user-pair.md) / waldo / 2026-09-08_

### Rule
An extension ships exactly two assignable permission sets, Admin and User, listing the same tables: Admin grants RIMD everywhere, User grants R on setup tables and RIMD on the rest.

### Rationale
iFacto company standard, mandatory. Every extension ships **exactly two** assignable `permissionset` objects: an **Admin** set and a **User** set, both listing the same tables. Admin grants `RIMD` on every table in the extension.

**Detect:** Shipping one permission set for everyone; granting `RIMD` on setup tables in the User set; granting only `R` (or omitting the table entirely) on transactional tables in the User set, so normal work fails with a permission error; adding a third or fourth set (viewer, read-only, per-module role) — the standard is exactly two; or letting the two sets drift so a table added later appears in Admin only. See sample: `ifacto-permissionset-admin-and-user-pair.bad.al`.

### Good / Bad
```al
// Bad
// Anti-pattern 1: a single permission set for everyone.
// The end user gets write access to configuration data.
permissionset 50100 "Rental Permissions"
{
    Assignable = true;
    Caption = 'Rental Permissions';
    Permissions =
        tabledata "Rental Setup" = RIMD,
        tabledata "Rental Contract" = RIMD,
        tabledata "Rental Contract Line" = RIMD;
}
// Anti-pattern 2: a User set that grants RIMD on the setup table.
// Same defect as above, only with the pair in place.
permissionset 50111 "Rental User"
{
    Assignable = true;
// …
```
```al
// Good
// iFacto standard: exactly two assignable permission sets per extension.
// Both list the same tables; only the rights on the setup table differ.
table 50100 "Rental Setup"
{
    Caption = 'Rental Setup';
    DataClassification = CustomerContent;
    fields
    {
        field(1; "Primary Key"; Code[10]) { Caption = 'Primary Key'; }
        field(10; "Default Rental Period"; Integer) { Caption = 'Default Rental Period'; }
    }
    keys
    {
        key(PK; "Primary Key") { Clustered = true; }
    }
}
// …
```

## perm-admin-included-in-d365-full-access
_category: permissions · severity: should-fix · confidence: 0 · scope: global · origin: iFacto company standard (BCQuality custom/knowledge/security/ifacto-permissionset-admin-in-d365-full-access.md) / waldo / 2026-09-08_

### Rule
An extension with an Admin permission set also ships a `permissionsetextension` on `D365 FULL ACCESS` whose only content is `IncludedPermissionSets = <Admin set>`.

### Rationale
iFacto company standard, mandatory. Every extension that ships an **Admin** permission set must also ship a `permissionsetextension` that extends the Microsoft `D365 FULL ACCESS` permission set and pulls the Admin set in through `IncludedPermissionSets`. `D365 FULL ACCESS` is the role that full-access users already hold; a permission set extension is *additive* and is applied automatically when the app is installed and withdrawn when it is uninstalled.

**Detect:** An extension that defines an Admin permission set but contains no `permissionsetextension ... extends "D365 FULL ACCESS"` — the primary miss, and the one to detect first: if the app has an Admin set, the extension object must exist.

### Good / Bad
```al
// Bad
// Anti-pattern 1: the app ships an Admin set and stops there — no
// permissionsetextension anywhere in the extension. This is the default
// output of tooling and LLMs. Existing full-access users get no rights on
// the app's tables until someone assigns "Rental Admin" on every user by
// hand, so the app fails with a permission error right after install.
permissionset 50100 "Rental Admin"
{
    Assignable = true;
    Caption = 'Rental Admin';
    Permissions =
        tabledata "Rental Setup" = RIMD,
        tabledata "Rental Contract" = RIMD,
        tabledata "Rental Contract Line" = RIMD;
}
permissionset 50101 "Rental User"
{
// …
```
```al
// Good
// iFacto standard: the Admin set is pulled into "D365 FULL ACCESS" so every
// full-access user gets rights on the app's tables the moment it is installed.
// The extension is applied on install and withdrawn on uninstall — no manual
// per-user assignment, ever.
permissionset 50100 "Rental Admin"
{
    Assignable = true;
    Caption = 'Rental Admin';
    Permissions =
        tabledata "Rental Setup" = RIMD,
        tabledata "Rental Contract" = RIMD,
        tabledata "Rental Contract Line" = RIMD;
}
permissionset 50101 "Rental User"
{
    Assignable = true;
// …
```

## perm-setup-table-inherentpermissions-rx
_category: permissions · severity: should-fix · confidence: 1 · scope: global · origin: iFacto company standard (BCQuality custom/knowledge/security/ifacto-setup-table-inherentpermissions-rx.md) / waldo / 2026-09-08_

### Rule
Every setup (configuration/singleton) table declares `InherentPermissions = RX;`, in addition to its lines in both permission sets.

### Rationale
iFacto company standard, mandatory. Every setup table in the extension declares the object-level `InherentPermissions = RX;` property (available from runtime 11.0 / BC 22). A setup table is read from almost every code path in the extension — a feature toggle checked in a subscriber, a number series fetched during posting, a default value read while a page opens — and those reads happen in contexts the extension does not control: another extension's code path, an API call, a job queue session, a user assigned only a base-app role.

**Detect:** Three findings, all detectable by reading the table's property block:

- A setup table with no `InherentPermissions` property at all — the default state of every table produced by the `ttable` snippet or by an LLM. - `InherentPermissions = RIMDX;` (or any value containing `I`, `M`, or `D`) on a setup table — every user and every code path may now rewrite configuration, and no administrator can take that away.

### Good / Bad
```al
// Bad
// Finding 1: setup table with no InherentPermissions property — the default
// output of the ttable snippet. Any session whose permission set misses
// tabledata "Rental Setup" = R fails deep inside business logic, for example
// while a subscriber reads the number series during posting.
table 50100 "Rental Setup"
{
    Caption = 'Rental Setup';
    DataClassification = CustomerContent;
    fields
    {
        field(1; "Primary Key"; Code[10])
        {
            Caption = 'Primary Key';
            ToolTip = 'Specifies the key of the single setup record. Always blank.';
        }
        field(10; "Contract Nos."; Code[20])
// …
```
```al
// Good
// iFacto standard: the setup (singleton configuration) table declares
// InherentPermissions = RX, so every code path can read configuration without a
// permission set grant, while insert/modify/delete stay under the Admin set.
table 50100 "Rental Setup"
{
    Caption = 'Rental Setup';
    DataClassification = CustomerContent;
    InherentPermissions = RX;
    fields
    {
        field(1; "Primary Key"; Code[10])
        {
            Caption = 'Primary Key';
            ToolTip = 'Specifies the key of the single setup record. Always blank, because the table holds exactly one record.';
        }
        field(10; "Contract Nos."; Code[20])
// …
```

## perm-tabledata-only
_category: permissions · severity: should-fix · confidence: 4 · scope: global · origin: a customer PR, a customer PR / harvested / 2026-09-08_

### Rule
Permission sets grant `tabledata` permissions only; they do not list codeunits, pages, reports or other objects individually.

### Rationale
iFacto convention (SALESPURCH: 116 grants, BASE: 142, all tabledata). Object-level grants add noise, drift from the base sets and hide what actually matters: data access.

**Precision from the company standard:** also no `IncludedPermissionSets` reaching into another extension's objects, and no `tabledata * = R` wildcard — one explicit `tabledata` line per table. AppSourceCop AS0103 is satisfied by tabledata grants alone.

### Good / Bad
```al
// Bad
Permissions = tabledata "TDO Transaction" = RIMD, codeunit "EDI Order Import PTE" = X, page "EDI Orders PTE" = X;
```
```al
// Good
Permissions = tabledata "TDO Transaction" = RIMD, tabledata "TDO Transaction Header" = RIMD, tabledata "TDO Transaction Line" = RIMD;
```

## security-no-hardcoded-secrets
_category: security · severity: blocking · confidence: 0 · scope: global · origin: DevOps Templates AICodeReview/Rules/ifacto-company-rules.md @88f1359 (CI AI Code Review guidelines) / waldo / 2026-10-07_

### Rule
AL code never contains a literal secret: no password, API key, bearer token, client secret or connection string with embedded credentials; secrets are read from IsolatedStorage, a setup table or a Key Vault wrapper.

### Rationale
A secret committed to source is public the moment it is pushed and stays in the git history after rotation; customer environments require that shipped extensions carry no production credentials; and a secret that lives in code cannot be rotated by operations without a code change. The supported surface is IsolatedStorage (`DataScope::Module`), a setup table field (typed `SecretText` where the platform allows it) or the Key Vault wrapper.

**Detect:** an added or changed line assigns a non-empty literal to something named like a secret - `password`, `pwd`, `secret`, `apikey`, `api_key`, `api-key`, `token`, `bearer`, `authorization`, `client_secret`, `accountkey`, `sharedaccesskey`, `connectionstring` - or contains a connection string with `Password=`, `Pwd=`, `AccountKey=` or `SharedAccessKey=`, or a literal that looks like a real key (`sk-...`, `ghp_...`, `xox[abp]-...`, a base64 string longer than 32 characters assigned to an auth-looking variable). Applies to every object type, including captions and comments.

Not a violation: an empty literal (`Password := '';`, a placeholder), a field or parameter declaration that merely carries the word (`Password: Text[250]` on a setup table), reading the value from IsolatedStorage, a setup record or Key Vault, and test fixtures with obviously fake values (`'dummy'`, `'test'`, `'changeme'`, `'xxxxx'`) - flag a fixture only when the value looks like a real credential.

### Good / Bad
```al
// Bad
ApiKey := 'sk-prod-1a2b3c4d5e6f7g8h9i0j';
ConnStr := 'Server=db01;Database=BC;User Id=svc;Password=Hunter2!;';
Headers.Add('Authorization', 'Bearer ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789');
```
```al
// Good
if not IsolatedStorage.Get('MyApiKey', DataScope::Module, ApiKey) then
    Error(ApiKeyNotConfiguredErr);

Setup.Get();
Setup.TestField("API Key");
ApiKey := Setup."API Key";
```

## testing-data-in-memory-never-inserted
_category: testing · severity: should-fix · confidence: 0 · scope: global · origin: iFacto company standard (BCQuality custom/knowledge/testing/ifacto-test-data-in-memory-never-inserted.md) / waldo / 2026-09-08_

### Rule
A business-logic test builds its records in memory with `Init()` and passes them in; it never calls `Insert`, `Modify`, `Delete` on a real table or a `Library…Create…` helper.

### Rationale
iFacto company standard from the SDD (Red-Green-Mutate) workflow: a business-logic test must complete in milliseconds, so it never writes to the database. No `Insert`, no `Modify`, no `Delete`, and no `Library…Create…` fixture helper — every record the unit under test reads is built in memory with `Init()` plus the few fields the behaviour actually touches, then injected as a parameter. This works because an un-inserted record variable is a complete, usable value in AL: it can be passed, read and asserted on without ever reaching SQL, and because nothing is inserted, no `TableRelation` check, `OnInsert` trigger, or number series runs.

**Detect:** A test codeunit that writes to the database to set up a calculation or validation test. Detection signals: `Insert`, `Insert(true)`, `Modify`, or `Delete` on a **non-temporary** record inside a `Subtype = Test` codeunit or one of its local helpers; a call to a `Library…Create…` helper in a test whose asserts cover a single calculation; an assert that re-reads the record with `Get` or `FindFirst` instead of reading the returned value.

### Good / Bad
```al
// Bad
codeunit 50427 "Freight Charge Calc Tests Bad"
{
    Subtype = Test;
    // Every input to a multiplication is a database row: a hand-inserted
    // setup singleton, a Library helper that creates a real shipment, and a
    // re-read to get the answer back. Each write is a SQL round trip plus
    // number-series and TableRelation work, so a test that should take
    // milliseconds takes seconds — and the second test in the suite that
    // inserts "Freight Rate Setup" fails on a duplicate primary key instead
    // of on the behaviour it was written to verify.
    [Test]
    procedure ChargeIsWeightTimesRate()
    var
        FreightRateSetup: Record "Freight Rate Setup";
        FreightShipment: Record "Freight Shipment";
        LibraryFreight: Codeunit "Library - Freight";
// …
```
```al
// Good
codeunit 50426 "Freight Charge Calc Tests"
{
    Subtype = Test;
    // The setup record is built with Init() and never inserted: no SQL round
    // trip, no number series, no OnInsert trigger, and nothing left behind
    // for the next test in the suite to trip over.
    [Test]
    procedure ChargeIsWeightTimesRate()
    var
        FreightRateSetup: Record "Freight Rate Setup";
        TempFreightShipmentLine: Record "Freight Shipment Line" temporary;
        ShipmentCalcFreightMeth: Codeunit "Shipment CalcFreight Meth";
        Charge: Decimal;
    begin
        // [GIVEN] a 5/kg rate with no floor — injected as data, not written
        FreightRateSetup.Init();
// …
```

## testing-doubles-replace-all-dependencies
_category: testing · severity: should-fix · confidence: 0 · scope: global · origin: iFacto company standard (BCQuality custom/knowledge/testing/ifacto-test-doubles-replace-all-dependencies.md) / waldo / 2026-09-08_

### Rule
Every dependency of the unit under test (lookups, posting, dialogs, external services, branching rules) is replaced by a Stub, Spy, Mock or Fake living in the Test app.

### Rationale
iFacto company standard from the SDD (Red-Green-Mutate) workflow. A business-logic test verifies one unit's behaviour, so **every** dependency of that unit — database lookups, posting routines, dialogs, external services, branching rules — must be replaced by a test double living in the Test app. Calling real codeunits that touch the database from a business-logic test is forbidden at iFacto: the test becomes slow, order-dependent, and flaky, and a failure anywhere in the dragged-in machinery reports as a failure of the behaviour under test.

**Detect:** A "unit" test that drives the behaviour through the database: inserting real setup records, posting real documents, then asserting on posted entries. Detection signals: a business-logic test codeunit that calls posting codeunits (`Sales-Post`, journal posting), performs `Insert`/`Modify` on real setup tables, or asserts on ledger-entry tables while claiming to test one calculation or validation.

### Good / Bad
```al
// Bad
codeunit 50412 "Freight Charge Tests Bad"
{
    Subtype = Test;
    // A "business-logic" test that drives everything through the database:
    // it inserts real setup, creates and posts a real document, and asserts
    // on posted entries. It is slow, depends on whatever data earlier tests
    // left behind, and a failure anywhere inside Sales-Post surfaces as a
    // "freight charge" failure. The one calculation this test claims to
    // verify is buried under the entire posting stack.
    [Test]
    procedure ChargeIsWeightTimesRate()
    var
        FreightRateSetup: Record "Freight Rate Setup";
        SalesHeader: Record "Sales Header";
        SalesInvoiceLine: Record "Sales Invoice Line";
        SalesPost: Codeunit "Sales-Post";
// …
```
```al
// Good
codeunit 50410 "Double - Freight Rate Stub"
{
    // Stub: feeds the unit a canned rate through the production seam, so the
    // test needs no "Freight Rate Setup" record and never touches the DB.
    EventSubscriberInstance = Manual;
    internal procedure SetRate(NewRate: Decimal)
    begin
        _rate := NewRate;
    end;
    [EventSubscriber(ObjectType::Codeunit, Codeunit::"Freight Charge Meth", 'OnBeforeGetRate', '', false, false)]
    local procedure FreightChargeMeth_OnBeforeGetRate(var Rate: Decimal; var IsHandled: Boolean)
    begin
        IsHandled := true; // short-circuit the real rate lookup
        Rate := _rate;
    end;
    var
// …
```

## testing-enum-extension-doubles-in-test-app-only
_category: testing · severity: should-fix · confidence: 0 · scope: global · origin: iFacto company standard (BCQuality custom/knowledge/testing/ifacto-enum-extension-doubles-test-app-only.md) / waldo / 2026-09-08_

### Rule
Interface doubles are injected through an `enumextension` in the Test app whose values point at Mock/Fake codeunits; no test-only enum value or double codeunit exists in the App.

### Rationale
When a dependency is an interface selected by an enum (see `ifacto-di-interface-enum-seam.md`), the iFacto way to inject a test double is an `enumextension` **in the Test app** that adds test-only values whose `Implementation =` points at a Mock or Fake codeunit. The production consumer then dispatches to the double simply because the record under test carries the test enum value — zero edits to production code. This only works when the production enum declares `Extensible = true`; a closed enum blocks the whole strategy, so testability must be considered when the enum is designed.

**Detect:** Test-only enum values or double codeunits declared in the App (production) project. Detection signals: an App-project enum value named `Mock…`/`Fake…`/`Test…`, an App-project codeunit whose name marks it as a double (`Double - …`, `…-Mock`, `…-Fake`), or a production `enumextension` whose `Implementation =` targets such a codeunit.

### Good / Bad
```al
// Bad
// App (production) project — the test double is baked into the shipping enum.
// "MockTier" shows up in every customer-facing option list bound to this
// enum, and the mock codeunit below ships to production as dead,
// unreviewed behaviour.
enum 50420 "Loyalty Tier Bad" implements ILoyaltyTier
{
    Extensible = true;
    value(0; Standard)
    {
        Implementation = ILoyaltyTier = "ILoyaltyTier-Standard";
    }
    value(1; Gold)
    {
        Implementation = ILoyaltyTier = "ILoyaltyTier-Gold";
    }
    value(90; MockTier) // test artifact in the production app
// …
```
```al
// Good
// Test app — the production enum and its consumers stay untouched; the test
// injects its double by adding test-only enum values.
enumextension 50417 "Loyalty Tier Test Ext" extends "Loyalty Tier"
{
    value(50417; MockTier)
    {
        Implementation = ILoyaltyTier = "ILoyaltyTier-Mock";
    }
}
// Test app — Mock: minimal canned answers for the scenario, no business logic.
codeunit 50418 "ILoyaltyTier-Mock" implements ILoyaltyTier
{
    procedure GetDiscountPct(): Decimal
    begin
        exit(10);
    end;
// …
```

## testing-exercise-production-code-not-a-copy
_category: testing · severity: blocking · confidence: 1 · scope: global · origin: a customer PR (GW-548) / waldo / 2026-09-09_

### Rule
A test calls the production procedure it claims to cover. It never re-implements that logic in the test codeunit and asserts against the re-implementation.

### Rationale
A test that asserts against a copy cannot fail when the production code changes, so it is worse than no test: it produces a coverage claim that is false. On a customer PR the copy was the only cover for a newly added parameter, and the defect that parameter introduced (cancelled external carriers becoming transport lines) shipped with a green build and a CI "test coverage verified" tick.

Two related smells travel with it and are part of this rule:
- **The copy drifts from the original.** In 23033 the production query also skipped carriers that already carried a transport order number and applied a selection check; the copy had neither, so it tested a strictly simpler predicate than the one that runs.
- **The fixture is a state production cannot produce.** The same suite asserted the requirement using a carrier row whose status and document-number combination is never written by any production path, so the test passed on an impossible premise.

**Detect:** a `Subtype = Test` codeunit containing a local procedure whose body duplicates a filter chain, calculation or branch found in the object under test; an assert whose argument is that local procedure rather than the production call; a test comment explaining why the real procedure was *not* invoked. When the duplicated logic is the very thing the PR changes, the test is not cover at all.

### Good / Bad
```al
// Bad - asserts against a copy of the production query; passes forever
local procedure IsCreateTransportLinesCandidate(WhseDocumentNo: Code[20]; ShippedCarriersOnly: Boolean): Boolean
var
    ExternalCarrier: Record "PnS External Carrier IFC";
begin
    if ShippedCarriersOnly then
        ExternalCarrier.SetRange(Status, ExternalCarrier.Status::Shipped);
    ExternalCarrier.SetRange("Whse. Document No.", WhseDocumentNo);
    ExternalCarrier.SetRange("Parent ID", 0);
    exit(not ExternalCarrier.IsEmpty());
end;
// ...
assert.IsTrue(IsCreateTransportLinesCandidate(Carrier."Whse. Document No.", false), '...');
```
```al
// Good - drives the real procedure and asserts its observable effect.
// Two carriers on one shipment, because the defect is a widening of a set:
// one Shipped (makes the shipment eligible) and one Cancelled (must not become a line).
TransportHeader.CreateTransportLines(WhseShipmentNo, TempSelectedCarriers, false, false);
TransportLine.SetRange("Transport Order No.", TransportHeader."No.");
assert.AreEqual(1, TransportLine.Count(), 'Only the Shipped carrier may become a transport line');
```

## testing-manual-subscriber-bind-unbind
_category: testing · severity: should-fix · confidence: 0 · scope: global · origin: iFacto company standard (BCQuality custom/knowledge/testing/ifacto-manual-subscriber-doubles-bind-unbind.md) / waldo / 2026-09-08_

### Rule
A subscriber double declares `EventSubscriberInstance = Manual`, and every `BindSubscription` in a test has a matching `UnbindSubscription` on every code path.

### Rationale
iFacto test doubles that attach through integration events must declare `EventSubscriberInstance = Manual` and be activated with `BindSubscription` only for the shortest window around the action under test, then deactivated with `UnbindSubscription`. Both halves matter and both fail silently when wrong: a subscriber codeunit without `Manual` uses the default static binding and fires in **every** test in the suite the moment the test app is published — short-circuiting behaviour other tests believe is real — while a `Manual` double that is bound but never unbound stays active for the rest of the session and produces ghost failures in later tests that are near-impossible to trace back. The double itself requires an integration-event seam (`OnBefore…` with `var IsHandled` / `OnAfter…`) in the production object; if no seam exists, add one in production rather than testing through the database.

**Detect:** A double codeunit whose `[EventSubscriber]` methods carry no `EventSubscriberInstance = Manual` property (it is live globally and silently), or a test that calls `BindSubscription` with no matching `UnbindSubscription` on any code path (the double leaks into every subsequent test). Detection signals: a codeunit in the Test app with `[EventSubscriber]` attributes but no `EventSubscriberInstance = Manual`; a `BindSubscription` call whose codeunit variable never appears in an `UnbindSubscription` in the same method or helper.

### Good / Bad
```al
// Bad
codeunit 50415 "Double - Release Spy Bad"
{
    // Missing "EventSubscriberInstance = Manual": the default binding is
    // static, so this subscriber is live in EVERY test in the suite from the
    // moment the test app is published. The IsHandled short-circuit below
    // silently disables the real release logic for tests that believe they
    // are exercising it.
    [EventSubscriber(ObjectType::Codeunit, Codeunit::"Release Order Meth", 'OnBeforeRelease', '', false, false)]
    local procedure ReleaseOrderMeth_OnBeforeRelease(var IsHandled: Boolean)
    begin
        IsHandled := true;
        _invocationCount += 1;
    end;
    var
        _invocationCount: Integer;
}
// …
```
```al
// Good
codeunit 50413 "Double - Release Spy"
{
    // Manual: this spy is inert until a test binds it, and affects nothing
    // after the test unbinds it.
    EventSubscriberInstance = Manual;
    procedure IsInvoked_OnAfterRelease(): Boolean
    begin
        exit(_isInvoked_OnAfterRelease);
    end;
    [EventSubscriber(ObjectType::Codeunit, Codeunit::"Release Order Meth", 'OnAfterRelease', '', false, false)]
    local procedure ReleaseOrderMeth_OnAfterRelease(OrderNo: Code[20])
    begin
        _isInvoked_OnAfterRelease := true;
        _releasedOrderNo := OrderNo;
    end;
    var
// …
```
