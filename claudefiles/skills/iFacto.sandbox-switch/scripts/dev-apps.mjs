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
//         node dev-apps.mjs login     --project App --project Test
//         node dev-apps.mjs compare   --project App --project Test --list <file>
//         node dev-apps.mjs uninstall --project App --project Test --ids <appId>[,<appId>] [--delete-data]
//
// login is what follows a "no-token": a device-code sign-in to the sandbox's tenant, after
// which the default az account goes back to what it was. compare is the manual route when
// there is still no token: the developer copies the DEV extensions from Extension Management
// ("Show and copy" — a JSON array with app ids) into <file>.
//
// Prints one JSON document on stdout; login prints one JSON object per line (the device code
// while az waits, then the result). Exit 0 = done (read "status": clean, foreign, signed-in,
// uninstalled), 1 = the sandbox could not be checked ("no-token": sign in with login, or check
// it by hand with compare; "error") or an uninstall did not complete, 2 = usage error.

import { readFileSync, existsSync } from 'node:fs';
import { execSync, spawn } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const BC_RESOURCE = 'https://api.businesscentral.dynamics.com';
const BC_WEB = 'https://businesscentral.dynamics.com';
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TENANT = /^[A-Za-z0-9.-]+$/;

const USAGE = `Usage:
  node dev-apps.mjs check     --project <dir> [--project <dir>] [--launch <file>] [--company <name>]
  node dev-apps.mjs login     --project <dir> [--project <dir>] [--launch <file>]
  node dev-apps.mjs compare   --project <dir> [--project <dir>] [--launch <file>] --list <file>
  node dev-apps.mjs uninstall --project <dir> [--project <dir>] --ids <appId>[,<appId>] [--delete-data]
`;

export class UsageError extends Error {}

/**
 * No Business Central token for the sandbox's tenant. `signIn`: login can still get one (az is
 * installed and no sign-in was tried yet); otherwise the developer checks it by hand (compare).
 */
export class TokenError extends Error {
    constructor(message, { signIn = true } = {}) {
        super(message);
        this.signIn = signIn;
    }
}

export class ApiError extends Error {
    constructor(status, detail, request) {
        super(`${request} failed with ${status}${detail ? `: ${detail}` : ''}`);
        this.status = status;
    }
}

/* ==================================================================== */
/* CLI                                                                   */
/* ==================================================================== */

const VALUE_OPTS = new Set(['project', 'launch', 'company', 'ids', 'list']);
const COMMANDS = ['check', 'login', 'compare', 'uninstall'];

export function parseArgs(argv) {
    const cfg = { command: null, projects: [], launch: null, company: null, list: null, ids: [], deleteData: false, help: false };

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
    if (!COMMANDS.includes(cfg.command)) {
        throw new UsageError('the command must be "check", "login", "compare" or "uninstall"');
    }
    if (cfg.projects.length === 0) {
        throw new UsageError('pass every AL project of the workspace with --project (the App and the Test project)');
    }
    if (cfg.command !== 'uninstall' && (cfg.ids.length > 0 || cfg.deleteData)) {
        throw new UsageError('--ids and --delete-data belong to uninstall');
    }
    if ((cfg.command === 'compare') !== (cfg.list !== null)) {
        throw new UsageError(cfg.list ? '--list belongs to compare' : 'compare needs --list <file> — the list pasted from Extension Management');
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
 * The DEV extensions the developer copied from Extension Management with "Show and copy"
 * (Develop in VS Code → Get selected as dependencies): a JSON array of {id, name, publisher,
 * version}. Text around the array — a dialog caption — is ignored.
 */
export function parsePastedList(text) {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start < 0 || end < start) {
        throw new UsageError('the pasted list holds no JSON array — copy it with "Show and copy" in Extension Management (Develop in VS Code → Get selected as dependencies)');
    }
    let rows;
    try {
        rows = JSON.parse(text.slice(start, end + 1));
    } catch (err) {
        throw new UsageError(`the pasted list is not valid JSON (${err.message}) — copy the whole "Show and copy" dialog text`);
    }
    if (!Array.isArray(rows)) { throw new UsageError('the pasted list is not a JSON array'); }

    const apps = rows.map((row) => ({
        id: String(row?.id ?? '').replace(/[{}]/g, '').trim().toLowerCase(),
        name: row?.name ?? null,
        publisher: row?.publisher ?? null,
        version: row?.version ?? null,
    }));
    const noId = apps.find((a) => !GUID.test(a.id));
    if (noId) { throw new UsageError(`an entry of the pasted list has no app id: ${JSON.stringify(noId)}`); }
    // Microsoft publishes no DEV extensions — a Microsoft app means the Published As = Dev filter was off.
    const microsoft = apps.find((a) => String(a.publisher ?? '').trim().toLowerCase() === 'microsoft');
    if (microsoft) {
        throw new UsageError(`the pasted list holds Microsoft apps (${microsoft.name}) — filter Extension Management on Published As = Dev before selecting the rows`);
    }
    return apps;
}

/** Pasted DEV extensions this workspace does not publish or depend on. */
export function classifyPasted(apps, expected) {
    const expectedIds = new Set(expected.map((a) => a.id));
    return { dev: apps, foreign: apps.filter((a) => !expectedIds.has(a.id)) };
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

/** Extension Management (page 2500) of the sandbox, filtered on DEV extensions — for the manual check. */
export function extensionManagementUrl({ tenant, environmentName }) {
    const segments = [tenant, environmentName].filter(Boolean).map(encodeURIComponent);
    return `${BC_WEB}/${segments.join('/')}/?page=2500&filter=${encodeURIComponent("'Published As' IS 'Dev'")}`;
}

/** What unblocks a failed call, by status code. */
export function hintFor(status, sandbox) {
    if (status === 401) { return `the token was rejected — run \`${azLogin(sandbox.tenant)}\` with the account you publish with from VS Code, and retry`; }
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

export function azLogin(tenant) {
    return `az login${tenant ? ` --tenant ${tenant} --allow-no-subscriptions` : ''}`;
}

/** What login runs: a device-code sign-in works from an agent's shell, where az cannot open a browser. */
export function azDeviceLogin(tenant) {
    return `az login --use-device-code --allow-no-subscriptions${tenant ? ` --tenant ${tenant}` : ''} -o json`;
}

const firstLine = (err) => String(err?.stderr || err?.message || '').trim().split('\n')[0];
const azMissing = (detail) => /not recognized|not found|ENOENT/i.test(detail);
const INSTALL_AZ = 'the Azure CLI (az) is not installed — install it (`winget install Microsoft.AzureCLI`)';

// One command string, not an argument array: on Windows `az` is a .cmd that only starts
// through a shell. `tenant` is validated against TENANT, account ids against GUID.
const azWith = (run) => (args) => String(run(`az ${args}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));

/** The az logins in `tenant`, one per user. A tenant-level login has the tenant id as its subscription id. */
function accountsIn(accounts, tenant) {
    const wanted = tenant.toLowerCase();
    const users = new Set();
    const found = [];
    for (const account of Array.isArray(accounts) ? accounts : []) {
        const inTenant = [account?.tenantId, account?.tenantDefaultDomain].some((v) => String(v ?? '').toLowerCase() === wanted);
        const user = String(account?.user?.name ?? '').toLowerCase();
        if (!inTenant || !GUID.test(String(account.id)) || users.has(user)) { continue; }
        users.add(user);
        found.push({ id: account.id, user: account.user?.name ?? null });
    }
    return found;
}

/**
 * The developer's own token: BC_ACCESS_TOKEN when set, otherwise the Azure CLI.
 *
 * `get-access-token --tenant X` asks with the *active* az account — the iFacto account —
 * and the tenant that holds the dev sandboxes refuses that one (AADSTS50020): the developer
 * publishes there with another account. So every account az has signed in to that tenant
 * is tried first, selected with --subscription, and the active account last.
 */
export function acquireToken(tenant, env = process.env, run = execSync) {
    if (env.BC_ACCESS_TOKEN?.trim()) { return env.BC_ACCESS_TOKEN.trim(); }

    const az = azWith(run);
    const fix = `sign in with the account you publish with from VS Code — \`dev-apps.mjs login\` starts a device-code sign-in; in a terminal: \`${azLogin(tenant)}\` — then retry`;
    const fail = (detail) => {
        const missing = azMissing(detail);
        return new TokenError(missing
            ? `${INSTALL_AZ}, then ${fix}`
            : `no Business Central token from the Azure CLI for tenant ${tenant ?? '(default)'} — ${fix} (${detail})`, { signIn: !missing });
    };

    const attempts = [];
    if (tenant) {
        let accounts;
        try { accounts = JSON.parse(az('account list --all -o json')); } catch (err) { throw fail(firstLine(err)); }
        for (const { id, user } of accountsIn(accounts, tenant)) { attempts.push({ who: user ?? id, args: ` --subscription ${id}` }); }
    }
    attempts.push({ who: 'the active az account', args: tenant ? ` --tenant ${tenant}` : '' });

    const failures = [];
    for (const { who, args } of attempts) {
        try {
            const token = az(`account get-access-token --resource ${BC_RESOURCE}${args} --query accessToken -o tsv`).trim();
            if (token) { return token; }
            failures.push(`${who}: no token returned`);
        } catch (err) {
            failures.push(`${who}: ${firstLine(err)}`);
        }
    }
    throw fail(failures.join('; '));
}

/* ==================================================================== */
/* Sign-in                                                               */
/* ==================================================================== */

/**
 * The prompt az prints on stderr for a device-code sign-in: "To sign in, use a web browser to
 * open the page <url> and enter the code <code> to authenticate." Entra words it, so `message`
 * carries it whole; `code` is null when the wording does not match.
 */
export function parseDevicePrompt(line) {
    const message = String(line).replace(/\x1b\[[0-9;]*m/g, '').replace(/^WARNING:\s*/, '').trim();
    const url = /https:\/\/[^\s"']+/.exec(message)?.[0].replace(/[.,;:)]+$/, '');
    if (!url || !/\bcode\b/i.test(message)) { return null; }
    return { url, code: /\b[Cc]ode\s+([A-Z0-9]{6,})\b/.exec(message)?.[1] ?? null, message };
}

/** Run az and hand every stderr line to `onLine` as it comes: the device code is needed while az waits. */
function streamAz(command, onLine, spawnImpl = spawn) {
    return new Promise((done) => {
        const child = spawnImpl(command, { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
        const lines = [];
        let stdout = '';
        let rest = '';
        const take = (chunk, final = false) => {
            rest += chunk;
            const parts = rest.split(/\r?\n/);
            rest = final ? '' : parts.pop();
            for (const part of parts.filter((p) => p.trim())) { lines.push(part); onLine(part); }
        };
        child.stdout.on('data', (data) => { stdout += data; });
        child.stderr.on('data', (data) => take(String(data)));
        child.on('error', (err) => done({ code: -1, stdout, stderr: [...lines, err.message] }));
        child.on('close', (code) => { take('', true); done({ code, stdout, stderr: lines }); });
    });
}

/**
 * `az login` makes the new login the default az account, and Azure DevOps calls run as the
 * default — `az rest` creates the PR in /iFacto.Pullrequest. Put back the one from before.
 */
function restoreDefault(before, az) {
    if (!before) { return null; }
    const account = { user: before.user?.name ?? null, subscription: before.name ?? before.id };
    const fix = `az account set --subscription ${before.id}`;
    const isBefore = (now) => now?.id === before.id && now?.user?.name === before.user?.name;
    try {
        if (isBefore(JSON.parse(az('account show -o json')))) { return { ...account, status: 'kept' }; }
        if (!GUID.test(String(before.id))) { throw new Error(`not a subscription id: ${before.id}`); }
        az(`account set --subscription ${before.id}`);
        if (isBefore(JSON.parse(az('account show -o json')))) { return { ...account, status: 'restored' }; }
        return { ...account, status: 'not-restored', error: `${account.user} is still not the default az account`, fix };
    } catch (err) {
        return { ...account, status: 'not-restored', error: firstLine(err), fix };
    }
}

function signedInAs(stdout, tenant) {
    let logins;
    try { logins = JSON.parse(stdout); } catch { return null; }
    const inTenant = tenant ? accountsIn(logins, tenant) : [];
    return (inTenant[0]?.user ?? (Array.isArray(logins) ? logins[0]?.user?.name : null)) ?? null;
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
        Object.assign(err, { sandbox, expected });
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
    const ctx = await connect(cfg, deps);
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

/** The manual route: compare what the developer copied from Extension Management. No API, no token. */
export function runCompare(cfg) {
    const sandbox = loadSandbox(cfg.projects, cfg.launch);
    const expected = expectedApps(cfg.projects);
    if (!existsSync(cfg.list)) { throw new UsageError(`no file ${cfg.list} — save the pasted list there first`); }
    const { dev, foreign } = classifyPasted(parsePastedList(readFileSync(cfg.list, 'utf8')), expected);
    return {
        code: 0,
        report: {
            status: foreign.length === 0 ? 'clean' : 'foreign',
            source: 'pasted',
            environment: sandbox,
            expected,
            devListed: dev,
            foreign,
        },
    };
}

/**
 * No token: sign in with a device code. The developer opens the url and enters the code; this
 * waits until they have (az gives up after about 15 minutes), puts the default az account
 * back, and fetches the token the way check does. A failed sign-in ends in no-token without
 * `signIn`: the next step is the manual check, not another code.
 */
export async function runLogin(cfg, deps = {}) {
    const sandbox = loadSandbox(cfg.projects, cfg.launch);
    const expected = expectedApps(cfg.projects);
    const az = azWith(deps.run ?? execSync);
    const emit = deps.emit ?? (() => {});
    const noToken = (message, extra = {}) => Object.assign(new TokenError(message, { signIn: false }), { sandbox, expected, ...extra });

    let before = null;
    try {
        before = JSON.parse(az('account show -o json'));
    } catch (err) {
        if (azMissing(firstLine(err))) { throw noToken(INSTALL_AZ); }
        // Not signed in anywhere yet: there is no default to put back.
    }
    let known = [];
    if (sandbox.tenant) {
        try { known = accountsIn(JSON.parse(az('account list --all -o json')), sandbox.tenant); } catch { /* only used for the hint */ }
    }
    const account = known.map((a) => a.user).filter(Boolean).join(' or ') || null;

    let promptLine = null;
    const login = await streamAz(azDeviceLogin(sandbox.tenant), (line) => {
        const prompt = promptLine ? null : parseDevicePrompt(line);
        if (!prompt) { return; }
        promptLine = line;
        emit({ status: 'device-code', ...prompt, account, environment: sandbox });
    }, deps.spawn);

    // Also after a failed sign-in: az may have switched the default before it gave up.
    const defaultAccount = restoreDefault(before, az);
    if (login.code !== 0) {
        const detail = login.stderr.filter((line) => line !== promptLine).at(-1)?.trim() ?? `az exited with ${login.code}`;
        throw noToken(`the sign-in did not complete (${detail})`, { defaultAccount });
    }
    try {
        acquireToken(sandbox.tenant, deps.env, deps.run);
    } catch (err) {
        if (err instanceof TokenError) { throw Object.assign(err, { signIn: false, sandbox, expected, defaultAccount }); }
        throw err;
    }
    return {
        code: 0,
        report: { status: 'signed-in', environment: sandbox, signedInAs: signedInAs(login.stdout, sandbox.tenant), defaultAccount },
    };
}

/** No token: the check is not skipped — login first when it can help, else Extension Management and compare. */
function noTokenReport(err) {
    return {
        status: 'no-token',
        error: err.message,
        signIn: err.signIn,
        environment: err.sandbox,
        extensionManagement: extensionManagementUrl(err.sandbox),
        expected: err.expected,
        ...(err.defaultAccount ? { defaultAccount: err.defaultAccount } : {}),
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
    // login prints one object per line: the device code while az waits, then the result.
    let perLine = false;
    const print = (doc) => write(`${perLine ? JSON.stringify(doc) : JSON.stringify(doc, null, 2)}\n`);

    let cfg;
    try {
        cfg = parseArgs(argv);
    } catch (err) {
        print({ status: 'usage', error: err.message, usage: USAGE });
        return 2;
    }
    if (cfg.help) { write(USAGE); return 0; }
    perLine = cfg.command === 'login';

    const commands = { check: runCheck, login: runLogin, compare: runCompare, uninstall: runUninstall };
    try {
        const { code, report } = await commands[cfg.command](cfg, { ...deps, emit: print });
        print(report);
        return code;
    } catch (err) {
        if (err instanceof UsageError) { print({ status: 'usage', error: err.message, usage: USAGE }); return 2; }
        if (err instanceof TokenError) { print(noTokenReport(err)); return 1; }
        print({ status: 'error', error: err.message });
        return 1;
    }
}

/* Run only when invoked directly, so tests can import the functions above. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    process.exitCode = await main();
}
