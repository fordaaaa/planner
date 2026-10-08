/** Node kind this block creates. Mirrors WorkflowNodeData['kind'] but kept local so this file has zero imports and can be synced into mcp-server as-is. */
export type BlockKind = 'start' | 'agent' | 'subagent' | 'tool' | 'decision' | 'end';

/**
 * Building blocks library.
 *
 * Each block is a single planner node pre-filled with a copy-paste-ready
 * prompt distilled from ECC (Everything Claude Code / affaan-m/ecc) and
 * edited to work standalone — no ECC install, no slash-command runtime,
 * no ~/.claude paths required. Placeholders use [brackets].
 *
 * Sources (edited, not verbatim):
 *  - prd      ← commands/plan-prd.md
 *  - plan     ← commands/plan.md + agents/planner.md
 *  - architect← agents/architect.md
 *  - tdd      ← agents/tdd-guide.md + skills/tdd-workflow
 *  - build-fix← commands/build-fix.md + agents/build-error-resolver.md
 *  - review   ← commands/code-review.md + agents/code-reviewer.md
 *  - security ← agents/security-reviewer.md
 *  - verify   ← skills/verification-loop
 *  - e2e      ← skills/e2e-testing + agents/e2e-runner.md
 *  - refactor ← agents/refactor-cleaner.md
 *  - docs     ← agents/doc-updater.md
 *  - ship     ← pre-launch + handoff pattern (claudecodeclub 15-prompt flow)
 */

export type BlockCategory = 'Spec & Plan' | 'Build' | 'Review & Verify' | 'Ship';

export interface BlockDef {
  id: string;
  title: string;
  category: BlockCategory;
  /** Planner node kind this block creates. */
  kind: BlockKind;
  /** Default node label when inserted. */
  label: string;
  /** Short one-liner shown in the palette. */
  blurb: string;
  /** Full copy-paste prompt stored in node.description. */
  prompt: string;
}

export const BLOCK_CATEGORIES: BlockCategory[] = ['Spec & Plan', 'Build', 'Review & Verify', 'Ship'];

export const BLOCKS: BlockDef[] = [
  {
    id: 'triage',
    title: 'Triage — Repro & Scope',
    category: 'Spec & Plan',
    kind: 'start',
    label: 'Triage [bug/symptom]',
    blurb: 'Expected vs actual, repro steps, blast radius. Evidence before fixes.',
    prompt: `Triage this bug before anyone fixes it: [symptom in one line].

1. Expected vs actual (one line each). Repro steps (numbered, from a clean state). Error text/logs (paste verbatim).
2. Blast radius: who/what is affected, since when, workaround if any.
3. Hypotheses ranked by likelihood with the single fastest check for each (a query, a log line, a flag — not a fix).
4. Minimal repro: smallest case that still triggers it. Scope: what is explicitly NOT part of this bug.

Rules: no fixes yet, no guessing without a check. End with: confirmed repro (yes/no) + the ordered hypothesis list for the build-fix step.`,
  },
  {
    id: 'release-scope',
    title: 'Release Scope — Ship List',
    category: 'Spec & Plan',
    kind: 'start',
    label: 'Release [vX] scope',
    blurb: 'What ships, what waits, migrations, rollback, owners.',
    prompt: `Define the ship list for release [vX].

1. In: the exact changes shipping (link specs/plans). Out: explicitly deferred items + why.
2. Risk per item (Low/Medium/High) + migration steps in order. Rollback plan for each risky item (command or revert commit).
3. Freeze: what nobody touches during harden + who owns go/no-go per area.
4. Entry gate: verification status right now (build/types/tests/coverage/security) — what's already green, what's known-red.

End with a table: item | risk | migration | rollback | owner. The harden steps that follow must not expand this scope.`,
  },
  {
    id: 'prd',
    title: 'PRD — Problem Framer',
    category: 'Spec & Plan',
    kind: 'start',
    label: 'PRD for [feature]',
    blurb: 'Problem, users, hypothesis, MVP scope. No implementation detail.',
    prompt: `Write a lean PRD for: [feature in 1-2 sentences].

Rules:
- Requirements only. NO file paths, libraries, or task breakdowns — that belongs in the plan step.
- If information is missing, write "TBD — needs validation via {method}". Never invent plausible requirements.

Interview me first (one round, all questions at once):
1. Who has this problem? (specific role/segment, not "users")
2. What is the observable pain? (behavior, not assumed needs)
3. Why can't they solve it with what exists today? Why now?
4. What evidence is there (quotes, tickets, metrics)? If none, flag as assumption.
5. Hypothesis: "We believe {capability} will {solve problem} for {users}. We'll know when {measurable outcome}."
6. MVP = minimum to test the hypothesis. Explicit "Out of scope" list.
7. Open questions that could change scope. Risks (likelihood × impact + mitigation).

Then write SPEC.md with: Problem, Evidence, Users (+ Not-for), Hypothesis, Success metrics (metric/target/how-measured), Scope (MVP + Out of scope), Delivery milestones (business outcomes, status pending), Open questions, Risks.
End with: validation status (problem validated|assumption, users concrete|generic, metrics defined|TBD) + suggested next step: plan from this SPEC.`,
  },
  {
    id: 'plan',
    title: 'Plan — Implementation Blueprint',
    category: 'Spec & Plan',
    kind: 'agent',
    label: 'Plan [feature]',
    blurb: 'Restate, ground in codebase patterns, phase, risk. Wait for approval.',
    prompt: `Don't write code yet. Read SPEC.md (or: [paste requirements]) and explore the codebase, then write PLAN.md.

1. Restate requirements in your own words (bullets).
2. Pattern grounding — search the codebase first and record the top example per category with file:line refs (naming, error handling, logging, data access, tests). If no similar code exists, say so. Do not invent a pattern.
3. Break v1 into phases, each independently testable and small enough for one session. Riskiest phase first. For every phase: goal (1 sentence), files to CREATE/UPDATE/DELETE + why, ordered steps, tests to add + the exact command proving the phase works, risks/open questions.
4. Dependencies between phases. Complexity Small|Medium|Large with hour estimate.
5. Validation section: exact commands (typecheck, lint, test, build).

Output format: Summary, Patterns to Mirror (table), Files to Change (table), Tasks (Phase → steps with Action/Mirror/Validate), Validation (bash block), Risks (table), Acceptance checklist.
CRITICAL: stop after the plan and WAIT for explicit approval ("yes" / "modify: ..."). Do not write implementation code until approved.`,
  },
  {
    id: 'architect',
    title: 'Architect — Design & Trade-offs',
    category: 'Spec & Plan',
    kind: 'decision',
    label: 'Architecture for [feature]',
    blurb: 'Options with pros/cons, decision, ADR-lite, NFR checklist.',
    prompt: `Act as software architect for: [feature]. Context: [stack, constraints, SPEC.md summary].

1. Current state: existing patterns, conventions, tech debt, scalability limits (with file refs).
2. Propose 2-3 approaches. For each: components + responsibilities, data model, API contracts, data flow, integration points.
3. Trade-off table per decision: Pros / Cons / Alternatives considered / Decision + rationale.
4. Non-functionals: performance targets (latency/throughput), scalability (10x plan), security (auth boundaries, input validation), availability, ops (deploy, monitoring, rollback).
5. If the decision is significant, write a mini-ADR: Context / Decision / Consequences (+/-) / Alternatives / Status / Date.
6. Red-flag check: big ball of mud, tight coupling, god object, premature optimization, magic behavior.

End with a recommended approach + what the plan step should change because of it. No implementation code.`,
  },
  {
    id: 'tdd',
    title: 'TDD Build — One Phase',
    category: 'Build',
    kind: 'agent',
    label: 'Implement Phase [N]',
    blurb: 'Red → Green → Refactor. Tests first, 80%+ coverage, evidence.',
    prompt: `Implement Phase [N] from PLAN.md and nothing else. Follow codebase patterns and SPEC.md.

Red-Green-Refactor, no exceptions:
1. RED: write failing tests first covering the phase's acceptance criteria + edge cases (null/undefined, empty, invalid types, boundaries, error paths, concurrency, large data, special chars). Run them and show they FAIL.
2. GREEN: write the minimal implementation to pass. Run tests + typecheck + lint and show they PASS.
3. REFACTOR: remove duplication, improve names. Tests stay green.
4. Coverage: 80%+ lines/branches on touched code. Unit (pure logic) + integration (API/DB) always; E2E only if the phase is a critical user flow.

Rules: never skip/disable/delete a test to get green. Mock external deps (DB, APIs, AI). Keep diffs minimal — no drive-by refactors.
When done, report: test command output as evidence, every file changed, how to try the feature manually, tick the phase off in PLAN.md + one line learned.`,
  },
  {
    id: 'build-fix',
    title: 'Build Fix — One Error at a Time',
    category: 'Build',
    kind: 'tool',
    label: 'Fix build errors',
    blurb: 'Detect runner, group errors, minimal diffs, stop-loss rules.',
    prompt: `The build is broken. Get it green with minimal safe changes — no refactoring, no features.

1. Detect: package.json build script / tsc --noEmit / cargo / go build / pytest — run it, capture full output.
2. Group errors by file, fix in dependency order (imports/types before logic). Count total for progress.
3. Loop, one error at a time: read ~10 lines around the error → diagnose root cause → smallest edit that resolves it → re-run build → confirm no new errors.
4. STOP and ask me if: a fix creates more errors than it resolves, the same error survives 3 attempts, the fix needs architecture changes, or deps are missing (tell me the install command, don't guess versions).

Common fixes: missing type annotation, optional chaining/null check, interface field, import path/alias, generic constraint, hook order, missing async.
Report: errors fixed (files), remaining, new (must be zero), lines changed (<5% of file), tests still passing.`,
  },
  {
    id: 'review',
    title: 'Review — Fresh Eyes',
    category: 'Review & Verify',
    kind: 'subagent',
    label: 'Review [scope]',
    blurb: 'Clean-context diff review. Proof-backed findings only. Zero is OK.',
    prompt: `Act as a reviewer with NO memory of how this was built. You see only the diff + SPEC.md/PLAN.md. Judge the work on its own terms — do not rewrite code.

1. Gather: git diff --stat + full diff. If empty, say "Nothing to review" and stop.
2. Read each changed file in FULL (not just hunks): callers, imports, tests.
3. Findings only if >80% confident it's real. For every HIGH/CRITICAL include: exact file:line + snippet, concrete failure (input → state → bad outcome), and why existing guards (types/validation/framework) don't catch it. Otherwise downgrade or drop.
4. Skip: style nits not violating project conventions, "consider X" without a trigger, issues in unchanged code (unless CRITICAL security), magic-number complaints about 200/404/1000/60/1024/indexes, Math.random in non-crypto use.

Check: correctness (off-by-one, null, races), type safety (no new any), pattern compliance, security (secrets, injection, XSS, auth gaps, SSRF, traversal), performance (N+1, unbounded queries, leaks), completeness (tests? error handling? docs?).
End with table CRITICAL|HIGH|MEDIUM|LOW counts + verdict: APPROVE (clean counts too — zero findings is valid) / WARNING / BLOCK. Never approve with unresolved CRITICAL.`,
  },
  {
    id: 'security',
    title: 'Security Gap Hunt',
    category: 'Review & Verify',
    kind: 'subagent',
    label: 'Security audit [scope]',
    blurb: 'OWASP Top 10, secrets, auth, deps. Report first, no code changes.',
    prompt: `Act as security reviewer for: [app/scope]. Don't change code yet — report first.

1. Scan: npm audit (or equiv), grep for hardcoded secrets (sk-, api_key, tokens), console.log of PII, innerHTML=userInput, string-concatenated SQL, fetch(userUrl), plaintext password compare, routes without auth checks.
2. OWASP Top 10 pass: injection (parameterized?), broken auth (bcrypt/argon2? JWT validated? sessions secure?), sensitive data (HTTPS? env secrets? PII encrypted? logs sanitized?), XXE, broken access (auth on every route? CORS?), misconfig (debug off? headers?), XSS (escaped? CSP?), deserialization, vulnerable deps, logging/alerting gaps.
3. Verify context before flagging (env.example/test fixtures/public keys/checksums are not secrets).

Severity: CRITICAL (fix before merge: secrets, injection, auth bypass, SSRF, traversal) / HIGH / MEDIUM / LOW with file:line + exploit scenario + secure example.
End with: counts, whether anything needs immediate secret rotation, and top 3 fixes ordered by risk.`,
  },
  {
    id: 'verify',
    title: 'Verify — Full Gate',
    category: 'Review & Verify',
    kind: 'tool',
    label: 'Verify [scope]',
    blurb: 'Build → types → lint → tests → security → diff. PASS/FAIL report.',
    prompt: `Run the full verification gate and report PASS/FAIL. Fix nothing yet unless I say so.

Phase 1 Build: [npm run build / project equiv] — if FAIL, stop here.
Phase 2 Types: [tsc --noEmit / pyright] — list errors (first 30).
Phase 3 Lint: [npm run lint / ruff] — list warnings (first 30).
Phase 4 Tests: run suite with coverage — report total/passed/failed + coverage % (target 80%+).
Phase 5 Security grep: secrets (sk-, api_key), console.log in src, TODO/FIXME without ticket.
Phase 6 Diff: git diff --stat — flag unintended files, missing error handling, untested paths.

Output exactly:
VERIFICATION REPORT — Build: PASS/FAIL, Types: PASS/FAIL (n), Lint: PASS/FAIL (n), Tests: PASS/FAIL (x/y, z%), Security: PASS/FAIL (n), Diff: (n files). Overall: READY / NOT READY. Issues to fix (numbered).
For long sessions, repeat this gate after every major change.`,
  },
  {
    id: 'e2e',
    title: 'E2E — Critical Flows',
    category: 'Review & Verify',
    kind: 'tool',
    label: 'E2E for [flow]',
    blurb: 'Playwright journeys, page objects, seeds, flake quarantine.',
    prompt: `Add/run E2E tests for critical flow(s): [flow, e.g. signup → checkout]. Stack: Playwright + [baseURL].

1. Journeys first: write "As a [role], I want [action] so that [benefit]" for each flow. Cover happy path + one failure path (e.g. no results, validation error, offline).
2. Structure: tests/e2e/<area>/<name>.spec.ts, page objects with data-testid locators (no brittle CSS/XPath), fixtures for auth + seed data, isolated state per test (no shared accounts).
3. Stability: auto-wait + waitForResponse/waitForLoadState, never raw sleeps; trace on-first-retry, screenshot only-on-failure; retry 2x in CI only.
4. Run: npx playwright test [file] — report passed/failed/skipped + artifacts (screenshots/traces). Quarantine flakes (tag + ticket) instead of deleting; never commit .only.

Deliver: journey list, files created, command output, how to view the HTML report.`,
  },
  {
    id: 'refactor',
    title: 'Refactor — Safe Cleanup',
    category: 'Ship',
    kind: 'agent',
    label: 'Refactor [area]',
    blurb: 'Dead code + duplicates, one batch at a time, tests green.',
    prompt: `Clean up [area] without changing behavior. No features, no deploys in flight.

1. Analyze: run dead-code detection (knip/depcheck/ts-prune or equiv) + grep for duplicates. Classify: SAFE (unused exports/deps) / CAREFUL (dynamic imports, re-exports) / RISKY (public API) — touch SAFE first.
2. Verify each removal: grep all refs incl. dynamic string imports, check public API surface + git history. When in doubt, keep it.
3. Remove in small batches (deps → exports → files → duplicates): one batch = one commit with descriptive message. Run build + tests after EVERY batch.
4. Consolidate duplicates: keep the best-tested implementation, update all imports, delete the rest, verify tests pass.

Report: bytes/lines removed, bundle delta if relevant, batches committed, tests+build status. Never remove code you don't understand or without green tests.`,
  },
  {
    id: 'docs',
    title: 'Docs — Sync with Code',
    category: 'Ship',
    kind: 'agent',
    label: 'Document [area]',
    blurb: 'Update README/codemaps from code reality, not memory.',
    prompt: `Update docs for: [area/feature]. Docs must describe the code as it IS — read the code first.

1. Scope: README section(s), guides, and codemap (dirs, entry points, key modules table with purpose/exports/deps, data flow, external deps w/ versions).
2. Rules: every command/filename/API in docs verified against the repo; fix drift (wrong flags, renamed files, stale env vars); short + example-led; no invented features.
3. Format: overview, quickstart (working commands), architecture sketch, module table, data flow, config/env table.

Report: files updated, drift fixed (before → after), anything intentionally left undocumented + why.`,
  },
  {
    id: 'ship',
    title: 'Ship — Pre-launch & Handoff',
    category: 'Ship',
    kind: 'end',
    label: 'Ship v[1]',
    blurb: 'Go/no-go checklist, then handoff notes for the next session.',
    prompt: `We're about to ship [v1/scope]. Two parts.

PART A — Pre-launch check (PASS/FAIL each, overall go/no-go):
Spec match (every SPEC requirement demoable?), plan complete (all phases ticked?), verification gate green (build/types/lint/tests 80%+/security/diff), E2E on critical flows, security gaps closed, data/migrations safe + rollback plan, monitoring/alerts, docs updated. List blockers explicitly — nothing ships with unresolved CRITICAL.

PART B — Handoff (so the next session starts without questions):
Update PLAN.md/SPEC.md status, commit everything with clear messages, write HANDOFF.md: what shipped, what's pending + next 3 steps, open questions, commands to resume (setup, test, run). One paragraph a future agent can act on with zero prior context.`,
  },
];

export const BLOCK_MAP: Record<string, BlockDef> = Object.fromEntries(BLOCKS.map((b) => [b.id, b]));

/* ------------------------------------------------------------------ */
/* Workflow templates — ordered block chains inserted as node chains.  */
/* fork: true renders the step as a subagent branching off the         */
/* previous main step (reviewers), then rejoins.                       */
/* ------------------------------------------------------------------ */

export interface TemplateStep {
  blockId: string;
  fork?: boolean;
}

export interface WorkflowTemplate {
  id: string;
  title: string;
  description: string;
  steps: TemplateStep[];
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'spec-plan-trio',
    title: 'Build → Spec → Plan trio',
    description: 'PRD frames the problem, plan decomposes it, architect decides how. The classic pre-code sequence.',
    steps: [{ blockId: 'prd' }, { blockId: 'plan' }, { blockId: 'architect' }],
  },
  {
    id: 'feature-loop',
    title: 'ECC feature loop',
    description: 'Full plan → test → implement → review → verify loop for one feature slice.',
    steps: [
      { blockId: 'prd' },
      { blockId: 'plan' },
      { blockId: 'tdd' },
      { blockId: 'review', fork: true },
      { blockId: 'security', fork: true },
      { blockId: 'verify' },
      { blockId: 'ship' },
    ],
  },
  {
    id: 'fix-loop',
    title: 'Fix loop',
    description: 'Triage the symptom, minimal fix, fresh review, verify gate.',
    steps: [{ blockId: 'triage' }, { blockId: 'build-fix' }, { blockId: 'review', fork: true }, { blockId: 'verify' }],
  },
  {
    id: 'harden-ship',
    title: 'Harden & ship',
    description: 'Scoped release list, E2E critical flows, safe cleanup, docs sync, pre-launch gate.',
    steps: [
      { blockId: 'release-scope' },
      { blockId: 'e2e' },
      { blockId: 'refactor' },
      { blockId: 'docs' },
      { blockId: 'verify' },
      { blockId: 'ship' },
    ],
  },
];

export const TEMPLATE_MAP: Record<string, WorkflowTemplate> = Object.fromEntries(
  WORKFLOW_TEMPLATES.map((t) => [t.id, t]),
);
