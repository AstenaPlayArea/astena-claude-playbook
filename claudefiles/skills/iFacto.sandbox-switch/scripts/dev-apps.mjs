#!/usr/bin/env node
// dev-apps.mjs — find the DEV extensions in the SDD sandbox that do not belong to this
// workspace, and uninstall them once the developer has agreed.
//
// Part of the iFacto.sandbox-switch skill. Zero dependencies, Node 18+.
//
// Reads  <project>/app.json for every --project (the App and the Test project)
//        the first "environmentType": "Sandbox" configuration in .vscode/launch.json
// Calls  the Business Central Automation API v2.0 with the developer's own token —
//        from the Azure CLI, or BC_ACCESS_TOKEN when that is set.
//
// Usage:  node dev-apps.mjs check     --project App --project Test
//         node dev-apps.mjs uninstall --project App --project Test --ids <appId>[,<appId>] [--delete-data]
//
// Prints one JSON document on stdout. Exit 0 = done (read "status": clean, foreign, skipped,
// uninstalled), 1 = the sandbox could not be checked or an uninstall did not complete,
// 2 = usage error.

import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const BC_RESOURCE = 'https://api.businesscentral.dynamics.com';
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TENANT = /^[A-Za-z0-9.-]+$/;

const USAGE = `Usage:
  node dev-apps.mjs check     --project <dir> [--project <dir>] [--launch <file>] [--company <name>]
  node dev-apps.mjs uninstall --project <dir> [--project <dir>] --ids <appId>[,<appId>] [--delete-data]
`;

export class UsageError extends Error {}

/** The developer has no account in the sandbox's tenant — they reach it as a delegated admin (GDAP). */
export class TenantAccessError extends Error {}

export class ApiError extends Error {
    constructor(status, detail, request) {
        super(`${request} failed with ${status}${detail ? `: ${detail}` : ''}`);
        this.status = status;
    }
}

/* ==================================================================== */
/* CLI                                                                   */
/* ==================================================================== */

const VALUE_OPTS = new Set(['project', 'launch', 'company', 'ids']);

export function parseArgs(argv) {
    const cfg = { command: null, projects: [], launch: null, company: null, ids: [], deleteData: false, help: false };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (!arg.startsWith('--')) {
            if (cfg.command) { throw new UsageError(`unexpected argument: ${arg}`); }
            cfg.command = arg;
            continue;
        }

        const [name, inlineValue] = arg.slice(2).split(/=(.*)/s);
        if (name === 'help') { cfg.help = true; continue; }
        if (name === 'delete-data') { cfg.deleteData = true; continue; }
        if (!VALUE_OPTS.has(name)) { throw new UsageError(`unknown option: --${name}`); }

        const value = inlineValue ?? argv[++i];
        if (!value || value.startsWith('--')) { throw new UsageError(`--${name} needs a value`); }
        if (name === 'project') { cfg.projects.push(value); }
        else if (name === 'ids') { cfg.ids.push(...value.split(',').map((s) => s.trim()).filter(Boolean)); }
        else { cfg[name] = value; }
    }

    if (cfg.help) { return cfg; }
    if (cfg.command !== 'check' && cfg.command !== 'uninstall') {
        throw new UsageError('the command must be "check" or "uninstall"');
    }
    if (cfg.projects.length === 0) {
        throw new UsageError('pass every AL project of the workspace with --project (the App and the Test project)');
    }
    if (cfg.command === 'check' && (cfg.ids.length > 0 || cfg.deleteData)) {
        throw new UsageError('--ids and --delete-data belong to uninstall');
    }
    if (cfg.command === 'uninstall' && cfg.ids.length === 0) {
        throw new UsageError('uninstall needs --ids <appId>[,<appId>] — the ids from the foreign list of check');
    }
    for (const id of cfg.ids) {
        if (!GUID.test(id)) { throw new UsageError(`not an app id: ${id}`); }
    }
    cfg.ids = cfg.ids.map((id) => id.toLowerCase());
    return cfg;
}

/* ==================================================================== */
/* Workspace: launch.json and app.json                                   */
/* ==================================================================== */

/** Copy `text` with every character outside a JSON string passed through `keep(text, i)`. */
function scanOutsideStrings(text, keep) {
    let out = '';
    let inString = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inString) {
            out += ch;
            if (ch === '\\') { out += text[++i] ?? ''; }
            else if (ch === '"') { inString = false; }
            continue;
        }
        if (ch === '"') { inString = true; out += ch; continue; }
        const step = keep(text, i);
        out += step.emit;
        i = step.next;
    }
    return out;
}

/** JSON with comments and trailing commas — the way VS Code writes launch.json. */
export function parseJsonc(text) {
    const noComments = scanOutsideStrings(text.replace(/^﻿/, ''), (s, i) => {
        if (s[i] === '/' && s[i + 1] === '/') {
            const end = s.indexOf('\n', i);
            return end < 0 ? { emit: '', next: s.length } : { emit: '\n', next: end };
        }
        if (s[i] === '/' && s[i + 1] === '*') {
            const end = s.indexOf('*/', i + 2);
            return { emit: ' ', next: end < 0 ? s.length : end + 1 };
        }
        return { emit: s[i], next: i };
    });
    const noTrailingCommas = scanOutsideStrings(noComments, (s, i) => {
        if (s[i] !== ',') { return { emit: s[i], next: i }; }
        let j = i + 1;
        while (j < s.length && /\s/.test(s[j])) { j++; }
        return { emit: s[j] === '}' || s[j] === ']' ? '' : ',', next: i };
    });
    return JSON.parse(noTrailingCommas);
}

const readJson = (file) => parseJsonc(readFileSync(file, 'utf8'));

/**
 * The first "environmentType": "Sandbox" configuration — the same rule as
 * iFacto.bc-saas-test-runner. launch.json sits in a project folder or in the
 * workspace root above it; `explicit` (--launch) overrides the search.
 */
export function loadSandbox(projects, explicit = null) {
    const candidates = explicit
        ? [resolve(explicit)]
        : [...new Set(projects.flatMap((p) => [resolve(p), dirname(resolve(p))]))].map((dir) => join(dir, '.vscode', 'launch.json'));

    const found = candidates.filter((file) => existsSync(file));
    if (found.length === 0) {
        throw new UsageError(`no .vscode/launch.json found (looked in ${candidates.join(', ')})`);
    }

    for (const file of found) {
        const config = (readJson(file).configurations ?? []).find((c) => c?.environmentType === 'Sandbox');
        if (!config) { continue; }
        if (!config.environmentName) {
            throw new UsageError(`the Sandbox configuration in ${file} has no "environmentName"`);
        }
        const tenant = config.tenant ? String(config.tenant) : null;
        if (tenant && !TENANT.test(tenant)) {
            throw new UsageError(`"tenant" in ${file} is not a tenant id or domain: ${tenant}`);
        }
        return { launchFile: file, environmentName: String(config.environmentName), tenant };
    }
    throw new UsageError(`no configuration with "environmentType": "Sandbox" in ${found.join(', ')}`);
}

/**
 * The app ids this workspace publishes, plus every dependency they declare. A library
 * developed alongside can itself be published as DEV — it is a dependency, not foreign.
 */
export function expectedApps(projects) {
    const apps = new Map();
    const add = (id, name, role, source) => {
        if (!id) { return; }
        const key = String(id).toLowerCase();
        if (apps.get(key)?.role === 'workspace') { return; }
        apps.set(key, { id: key, name: name ?? null, role, source });
    };

    for (const project of projects) {
        const file = join(resolve(project), 'app.json');
        if (!existsSync(file)) {
            throw new UsageError(`no app.json in ${project} — pass the AL project folders (App, Test)`);
        }
        const app = readJson(file);
        const source = `${project}/app.json`;
        add(app.id, app.name, 'workspace', source);
        for (const dep of app.dependencies ?? []) { add(dep.id ?? dep.appId, dep.name, 'dependency', source); }
    }
    return [...apps.values()];
}

/* ==================================================================== */
/* Extensions                                                            */
/* ==================================================================== */

/** `publishedAs` is documented, its values are not — accept "Dev" in any case, padded or not. */
export function isDev(ext) {
    return String(ext?.publishedAs ?? '').trim().toLowerCase() === 'dev';
}

export function summarize(ext) {
    const version = [ext.versionMajor, ext.versionMinor, ext.versionBuild, ext.versionRevision].map((v) => v ?? 0).join('.');
    return { id: String(ext.id).toLowerCase(), packageId: ext.packageId, name: ext.displayName, publisher: ext.publisher, version };
}

/** Installed DEV extensions, and the ones among them this workspace does not publish or depend on. */
export function classify(extensions, expected) {
    const expectedIds = new Set(expected.map((a) => a.id));
    const dev = extensions.filter((e) => e.isInstalled && isDev(e)).map(summarize);
    return { dev, foreign: dev.filter((e) => !expectedIds.has(e.id)) };
}

/**
 * Uninstall every app in `targets`. The Automation API does not expose dependents, so an app
 * another target still depends on fails first; retry the failures until a round removes nothing.
 */
export async function uninstallAll(targets, uninstallOne) {
    const uninstalled = [];
    const errors = new Map();
    let pending = [...targets];

    while (pending.length > 0) {
        const failed = [];
        for (const app of pending) {
            try {
                await uninstallOne(app);
                uninstalled.push(app);
            } catch (err) {
                errors.set(app.id, err.message);
                failed.push(app);
            }
        }
        if (failed.length === pending.length) { break; }
        pending = failed;
    }
    return { uninstalled, failed: pending.map((app) => ({ ...app, error: errors.get(app.id) })) };
}

/* ==================================================================== */
/* Business Central Automation API                                       */
/* ==================================================================== */

export function apiBase({ tenant, environmentName }) {
    const segments = [tenant, environmentName].filter(Boolean).map(encodeURIComponent);
    return `${BC_RESOURCE}/v2.0/${segments.join('/')}/api/microsoft/automation/v2.0`;
}

/** What unblocks a failed call, by status code. */
export function hintFor(status, sandbox) {
    const login = `az login${sandbox.tenant ? ` --tenant ${sandbox.tenant}` : ''}`;
    if (status === 401) { return `the token was rejected — run \`${login}\` and retry`; }
    if (status === 403) {
        return `your user has no extension-management permission in "${sandbox.environmentName}" (permission set EXTEN. MGT. - ADMIN or SUPER)`;
    }
    if (status === 404) {
        return `environment "${sandbox.environmentName}" not found${sandbox.tenant ? ` in tenant ${sandbox.tenant}` : ''} — check environmentName and tenant in launch.json`;
    }
    return null;
}

async function errorDetail(res) {
    try {
        const text = await res.text();
        try { return JSON.parse(text)?.error?.message ?? text.slice(0, 300); } catch { return text.slice(0, 300); }
    } catch {
        return '';
    }
}

export function createClient({ base, token, fetchImpl = globalThis.fetch }) {
    async function call(method, urlOrPath) {
        const url = urlOrPath.startsWith('https://') ? urlOrPath : `${base}${urlOrPath}`;
        const res = await fetchImpl(url, {
            method,
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        if (!res.ok) { throw new ApiError(res.status, await errorDetail(res), `${method} ${urlOrPath}`); }
        return res.status === 204 ? null : res.json();
    }

    async function list(path) {
        const rows = [];
        let next = path;
        while (next) {
            const body = await call('GET', next);
            rows.push(...(body?.value ?? []));
            next = body?.['@odata.nextLink'] ?? null;
        }
        return rows;
    }

    return {
        /** Extensions are per environment; the company in the URL only routes the call. */
        async company(name) {
            const companies = await list('/companies');
            if (companies.length === 0) { throw new Error('the sandbox has no company to route the API call through'); }
            if (!name) { return companies[0]; }
            const wanted = name.toLowerCase();
            const match = companies.find((c) => c.name?.toLowerCase() === wanted || c.id?.toLowerCase() === wanted);
            if (!match) { throw new UsageError(`no company "${name}" in the sandbox`); }
            return match;
        },
        extensions: (companyId) => list(`/companies(${companyId})/extensions`),
        async uninstall(companyId, packageId, deleteData) {
            const action = deleteData ? 'uninstallAndDeleteExtensionData' : 'uninstall';
            await call('POST', `/companies(${companyId})/extensions(${packageId})/Microsoft.NAV.${action}`);
        },
    };
}

/* ==================================================================== */
/* Token                                                                 */
/* ==================================================================== */

/** The developer's own token: BC_ACCESS_TOKEN when set, otherwise the Azure CLI login. */
export function acquireToken(tenant, env = process.env, run = execSync) {
    if (env.BC_ACCESS_TOKEN?.trim()) { return env.BC_ACCESS_TOKEN.trim(); }

    // One command string, not an argument array: on Windows `az` is a .cmd that only starts
    // through a shell. `tenant` is validated against TENANT before it gets here.
    const command = `az account get-access-token --resource ${BC_RESOURCE}${tenant ? ` --tenant ${tenant}` : ''} --query accessToken -o tsv`;
    const login = `az login${tenant ? ` --tenant ${tenant}` : ''}`;
    let output;
    try {
        output = run(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
        const stderr = String(err.stderr ?? err.message ?? '');
        // A customer tenant reached through GDAP: VS Code publishes there with the AL extension's
        // own app, but the Azure CLI gets no token — the account is neither member nor guest.
        if (/AADSTS50020/.test(stderr)) {
            throw new TenantAccessError(`the Azure CLI gets no token in tenant ${tenant ?? '(default)'}: your account is neither member nor guest there (AADSTS50020) — you reach this sandbox as a delegated admin`);
        }
        if (/not recognized|not found|ENOENT/i.test(stderr)) {
            throw new Error('the Azure CLI (az) is not installed — install it (`winget install Microsoft.AzureCLI`), run `' + login + '`, and retry');
        }
        throw new Error(`could not get a Business Central token from the Azure CLI — run \`${login}\` and retry (${stderr.trim().split('\n')[0]})`);
    }
    const token = String(output).trim();
    if (!token) { throw new Error(`the Azure CLI returned no token — run \`${login}\` and retry`); }
    return token;
}

/* ==================================================================== */
/* Commands                                                              */
/* ==================================================================== */

async function connect(cfg, deps) {
    const sandbox = loadSandbox(cfg.projects, cfg.launch);
    const expected = expectedApps(cfg.projects);
    let token;
    try {
        token = deps.token ?? acquireToken(sandbox.tenant, deps.env, deps.run);
    } catch (err) {
        err.sandbox = sandbox;
        throw err;
    }
    const client = createClient({ base: apiBase(sandbox), token, fetchImpl: deps.fetchImpl });
    try {
        const company = await client.company(cfg.company);
        return { sandbox, expected, client, company };
    } catch (err) {
        throw withHint(err, sandbox);
    }
}

function withHint(err, sandbox) {
    const hint = err instanceof ApiError ? hintFor(err.status, sandbox) : null;
    if (hint) { err.message = `${err.message} — ${hint}`; }
    return err;
}

function environmentOf({ sandbox, company }) {
    return { ...sandbox, company: company.name };
}

export async function runCheck(cfg, deps = {}) {
    let ctx;
    try {
        ctx = await connect(cfg, deps);
    } catch (err) {
        // Not a failed check: a customer's own tenant holds no other customer's partner-sandbox
        // leftovers, and the developer cannot get an Azure CLI token there at all.
        if (!(err instanceof TenantAccessError)) { throw err; }
        return { code: 0, report: { status: 'skipped', reason: err.message, environment: err.sandbox } };
    }
    let extensions;
    try { extensions = await ctx.client.extensions(ctx.company.id); } catch (err) { throw withHint(err, ctx.sandbox); }
    const { dev, foreign } = classify(extensions, ctx.expected);
    return {
        code: 0,
        report: {
            status: foreign.length === 0 ? 'clean' : 'foreign',
            environment: environmentOf(ctx),
            expected: ctx.expected,
            devInstalled: dev,
            foreign,
        },
    };
}

export async function runUninstall(cfg, deps = {}) {
    const ctx = await connect(cfg, deps);
    const { client, company, sandbox, expected } = ctx;

    let before;
    try { before = classify(await client.extensions(company.id), expected); } catch (err) { throw withHint(err, sandbox); }

    // Only what check reports as foreign can go — never this workspace, never a PTE or Global app.
    const expectedIds = new Set(expected.map((a) => a.id));
    const targets = [];
    for (const id of cfg.ids) {
        if (expectedIds.has(id)) { throw new UsageError(`${id} belongs to this workspace or its dependencies — refusing to uninstall it`); }
        const app = before.foreign.find((e) => e.id === id);
        if (!app) { throw new UsageError(`${id} is not an installed DEV extension in "${sandbox.environmentName}" — run check again`); }
        targets.push(app);
    }

    const result = await uninstallAll(targets, (app) => client.uninstall(company.id, app.packageId, cfg.deleteData));

    let after;
    try { after = classify(await client.extensions(company.id), expected); } catch (err) { throw withHint(err, sandbox); }
    const stillInstalled = after.dev.filter((e) => cfg.ids.includes(e.id));
    const complete = result.failed.length === 0 && stillInstalled.length === 0;

    return {
        code: complete ? 0 : 1,
        report: {
            status: complete ? 'uninstalled' : 'partial',
            environment: environmentOf(ctx),
            deleteData: cfg.deleteData,
            uninstalled: result.uninstalled,
            failed: result.failed,
            stillInstalled,
        },
    };
}

export async function main(argv = process.argv.slice(2), deps = {}) {
    const write = deps.write ?? ((text) => process.stdout.write(text));
    const print = (doc) => write(`${JSON.stringify(doc, null, 2)}\n`);

    let cfg;
    try {
        cfg = parseArgs(argv);
    } catch (err) {
        print({ status: 'usage', error: err.message, usage: USAGE });
        return 2;
    }
    if (cfg.help) { write(USAGE); return 0; }

    try {
        const { code, report } = cfg.command === 'check' ? await runCheck(cfg, deps) : await runUninstall(cfg, deps);
        print(report);
        return code;
    } catch (err) {
        if (err instanceof UsageError) { print({ status: 'usage', error: err.message, usage: USAGE }); return 2; }
        print({ status: 'error', error: err.message });
        return 1;
    }
}

/* Run only when invoked directly, so tests can import the functions above. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    process.exitCode = await main();
}
