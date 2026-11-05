// Tests for the self-hosting deployment in deploy/ and docker-compose.yml.
// Static checks always run; container integration tests run when Docker is available.
// Run: node --test deploy/self-host.test.mjs
import assert from 'node:assert/strict';
import { execFileSync, execSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const composeFile = join(root, 'docker-compose.yml');
const nginxConf = readFileSync(join(root, 'deploy/nginx.conf'), 'utf8');
const entrypoint = readFileSync(join(root, 'deploy/entrypoint.sh'), 'utf8');
const composeRaw = readFileSync(composeFile, 'utf8');

function composeCmd() {
  const sub = spawnSync('docker', ['compose', 'version'], { stdio: 'ignore' });
  if (sub.status === 0) return ['docker', ['compose']];
  const legacy = spawnSync('docker-compose', ['version'], { stdio: 'ignore' });
  if (legacy.status === 0) return ['docker-compose', []];
  return null;
}

function dockerAvailable() {
  return spawnSync('docker', ['info'], { stdio: 'ignore' }).status === 0;
}

test('compose file publishes the web port and nothing else', () => {
  const cmd = composeCmd();
  assert.ok(cmd, 'docker compose (or docker-compose) is required to validate the compose file');
  const out = execFileSync(cmd[0], [...cmd[1], '-f', composeFile, 'config'], { encoding: 'utf8' });
  assert.match(out, /8080/);
  assert.doesNotMatch(out, /7808\s*:\s*7808/, 'raw PM port must not be published');
  assert.doesNotMatch(out, /published:\s*"?7808/, 'raw PM port must not be published');
  assert.match(out, /planner-data/, 'persistent volume must be declared');
});

test('compose file declares the auth environment variables and data volume mount', () => {
  assert.match(composeRaw, /PLANNER_AUTH_PASSWORD/);
  assert.match(composeRaw, /PLANNER_AUTH_USER/);
  assert.match(composeRaw, /planner-data:\/data/);
});

test('nginx proxies /api/ with basic auth and serves a healthz endpoint', () => {
  const apiBlock = nginxConf.match(/location \/api\/[\s\S]*?}/);
  assert.ok(apiBlock, 'expected an /api/ location block');
  assert.match(apiBlock[0], /auth_basic\s+"[^"]+";/);
  assert.match(apiBlock[0], /auth_basic_user_file\s+\/etc\/nginx\/htpasswd;/);
  assert.match(nginxConf, /proxy_pass\s+http:\/\/127\.0\.0\.1:7808;/);
  assert.match(nginxConf, /location = \/healthz/);
});

test('the PM proxy is loopback-only inside the container image', () => {
  const dockerfile = readFileSync(join(root, 'deploy/Dockerfile'), 'utf8');
  assert.match(dockerfile, /PLANNER_PM_PORT=7808/);
  // pmServe.ts binds 127.0.0.1 (application default); nginx must be the only public surface.
  assert.match(nginxConf, /proxy_pass\s+http:\/\/127\.0\.0\.1:7808;/);
  assert.match(entrypoint, /node \/app\/pm-server\/dist\/pmServe\.js/);
});

test('unauthenticated requests are rejected and authenticated PM flow works (container)', { timeout: 900000 }, async (t) => {
  if (!dockerAvailable()) {
    t.skip('docker daemon not available');
    return;
  }
  const port = 18000 + Math.floor(Math.random() * 2000);
  const projectName = `selfhost-test-${Date.now()}`;
  const run = (args, opts = {}) =>
    execFileSync('docker', args, { encoding: 'utf8', ...opts });

  // Build the image.
  execSync('docker build -f deploy/Dockerfile -t planner-selfhost-test .', {
    cwd: root,
    stdio: 'inherit',
  });

  let cid = '';
  try {
    cid = run([
      'run', '-d', '--rm',
      '-p', `127.0.0.1:${port}:8080`,
      '-e', 'PLANNER_AUTH_USER=planner',
      '-e', 'PLANNER_AUTH_PASSWORD=test-secret',
      'planner-selfhost-test',
    ]).trim();

    // Wait for the PM server (through the authenticated proxy) to answer 200.
    // /healthz only proves nginx is up, so poll the real endpoint instead.
    const deadline = Date.now() + 90000;
    let ok = false;
    while (Date.now() < deadline) {
      const res = spawnSync('curl', ['-sf', '-u', 'planner:test-secret', `http://127.0.0.1:${port}/api/projects`], { stdio: 'ignore' });
      if (res.status === 0) { ok = true; break; }
      await new Promise((r) => setTimeout(r, 500));
    }
    assert.ok(ok, 'container PM API did not become ready in time');

    const curl = (args) => spawnSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', ...args], { encoding: 'utf8' }).stdout.trim();

    // Frontend served.
    assert.equal(curl([`http://127.0.0.1:${port}/`]), '200');

    // PM API requires auth.
    assert.equal(curl([`http://127.0.0.1:${port}/api/projects`]), '401');
    assert.equal(
      curl(['-X', 'POST', '-H', 'Content-Type: application/json', '-d', `{"name":"${projectName}"}`, `http://127.0.0.1:${port}/api/projects`]),
      '401',
      'unauthenticated mutation must be rejected',
    );

    // A cross-site HTML form cannot submit JSON as text/plain with cached credentials.
    assert.equal(curl(['-u', 'planner:test-secret', '-X', 'POST', '-H', 'Content-Type: text/plain',
      '-d', '{"name":"forged"}', `http://127.0.0.1:${port}/api/projects`]), '415');

    // Authenticated read + mutation succeed.
    assert.equal(curl(['-u', 'planner:test-secret', `http://127.0.0.1:${port}/api/projects`]), '200');
    assert.equal(
      curl(['-u', 'planner:test-secret', '-X', 'POST', '-H', 'Content-Type: application/json',
            '-d', `{"name":"${projectName}"}`, `http://127.0.0.1:${port}/api/projects`]),
      '201',
    );
  } finally {
    if (cid) spawnSync('docker', ['rm', '-f', cid], { stdio: 'ignore' });
  }
});
