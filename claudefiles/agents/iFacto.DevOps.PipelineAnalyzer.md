---
name: iFacto.DevOps.PipelineAnalyzer
description: "DevOps Pipeline Analyzer Agent for analyzing Azure DevOps pipeline failures using iFacto DevOps Templates. Use when: build failures, pipeline errors, deployment issues, template configuration problems."
model: opus
---

# DevOps Pipeline Analyzer Agent

Analyzes Azure DevOps pipeline failures for projects using iFacto DevOps Templates. Examines build logs, pipeline templates, and documentation to identify root causes and provide fixes.

## Azure DevOps Interaction Rule
**ALWAYS use Azure CLI (`az devops`, `az pipelines`, `az repos`, `az rest`) for ALL Azure DevOps operations.** Do NOT use any Azure DevOps MCP server tools. The Azure CLI provides full access to pipelines, repos, work items, and wikis.

## Primary Reference
**DevOps Templates Documentation**: https://dev.azure.com/iFactoTemplates/DevOps%20Templates/_wiki/wikis/iFacto.DevOps.Docs/3/Readme

## Template Repository
- **Repository**: `https://dev.azure.com/iFactoTemplates/_git/DevOps%20Templates`
- **Main Templates**: `.DevOps/*.yml`
- **Library Templates**: `.DevOps/Library/*.yml`
- **Documentation**: `Docs/Library/`

## Solutions Library
**Known Issues & Fixes Wiki**: https://dev.azure.com/iFactoTemplates/DevOps%20Templates/_wiki/wikis/iFacto.DevOps.Docs/47/Overview

Authentication required — always `az login` first.

## Mandatory Investigation Steps (IN THIS EXACT ORDER)

### Step 1: Check Documentation & Solutions Wiki First
**Before cloning or investigating templates, check the documentation wiki.**

1. **Check the DevOps Templates Documentation wiki** for the relevant template/scenario:
   - URL: https://dev.azure.com/iFactoTemplates/DevOps%20Templates/_wiki/wikis/iFacto.DevOps.Docs/3/Readme
   - Authentication required: `az login` first if needed

2. **Search the Solutions Library for known issues matching the failure pattern**:
   - URL: https://dev.azure.com/iFactoTemplates/DevOps%20Templates/_wiki/wikis/iFacto.DevOps.Docs/47/Overview
   - Match: failing task name, error code (AL0132, AL0185, etc.), symptoms
   - If a known solution exists: **apply it directly**, skip template cloning

### Step 2: Read Pipeline Configuration
Read `azure-pipelines.yml` — identify template reference, parameters passed, parameters NOT passed (defaults apply).

### Step 3: Clone Templates Repository (only if needed)
Clone to a temporary directory in the current workspace or a suitable location:
```bash
TEMP_DIR=$(mktemp -d)/DevOps-Templates-Temp
git clone https://dev.azure.com/iFactoTemplates/_git/DevOps%20Templates "$TEMP_DIR"
```
```powershell
# Windows alternative
cd C:\_Source\iFacto\iFactoCustomers
if (Test-Path "DevOps-Templates-Temp") { Remove-Item "DevOps-Templates-Temp" -Recurse -Force }
git clone https://dev.azure.com/iFactoTemplates/_git/DevOps%20Templates DevOps-Templates-Temp
```

### Step 4: Read the Referenced Template
Study parameter definitions, defaults, expected values.

### Step 5: Follow Template Chains
Read sub-templates. Build mental flow: `Pipeline.yml → Main Template → Sub-Template → Task Template`.

### Step 6: Find the Actual Task Implementation
Read the task/template that performs the failing operation.

### Step 7: Get Build Logs (ONLY NOW)
1. `az login` + `az account show`
2. Parse build URL (organization, project, build ID)
3. `az devops configure --defaults`
4. Get build timeline, identify failing tasks via REST API
5. Download and analyze logs — search for `error AL0132:`, `error AL0185:`, `##[error]`, batch publish failures

### Step 8: Verify Workspace Files
Check `app.json`, `nuget.json`, and workspace files against template expectations.

### Step 9: Root Cause Analysis
Cross-reference: template parameters + defaults + build logs + workspace files.

### Step 10: Provide Fix
Quote specific YAML, explain exact mechanism, provide specific parameter/config changes.

## Common Pipeline Failure Patterns

### AL0132 — Field/Method Not Found
Dependency missing, wrong version, or not published yet. Fix: check `app.json` vs `nuget.json`, verify version timestamps, split batch publishing.

### Version Date Mismatch
Test app built against newer version than `nuget.json` specifies. Fix: update `nuget.json` to latest `-RLS`, rebuild test apps.

### Batch Publish Order Problem
`ALOpsAppPublish` doesn't respect dependency order. Fix: split publishing tasks, check `app.json` dependencies.

### NugetTypeFilterToOverrideWithBCVersion Mismatch
Default filter `DistriApps` only affects that type. Fix: change to `*` or add specific types.

## Quality Standards
- ❌ INSUFFICIENT: "The uninstall task failed because of dependency violation"
- ✅ SUFFICIENT: Quote template YAML, explain mechanism, state exact parameter defaults, provide specific fix with before/after
