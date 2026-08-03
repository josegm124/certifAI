/* ==============================================================================
   dev-all — one command, one window.

   Starts the backend, waits until it is actually accepting connections, then
   starts the frontend. Both children stream into THIS console with a short
   prefix, so a single window carries both logs.

   WHAT THIS DELIBERATELY IS NOT
   - It does not merge the two servers into one process. They stay exactly the
     two independent servers that `npm run dev:backend` and `npm run dev:frontend`
     start, on their own ports. This only supervises them.
   - It does not set or change any port. BACKEND_PORT below is read purely to
     know what to poll for readiness; the backend still decides its own port.

   The two-terminal path is untouched and keeps working.

   Windows is the target: npm is invoked through a shell, and shutdown uses
   taskkill /T so the whole child tree goes down with Ctrl+C rather than leaving
   orphaned node processes holding the ports.
   ============================================================================== */
import { spawn } from 'node:child_process';
import net from 'node:net';

const IS_WIN = process.platform === 'win32';

// Read, never set. Mirrors the backend's own default in src/index.js.
const BACKEND_PORT = Number(process.env.PORT) || 3001;
const READY_TIMEOUT_MS = 30_000;
const POLL_MS = 300;

const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

const children = [];
let shuttingDown = false;

/** Stream a child's output line-by-line with a prefix, so the two interleave readably. */
function pipePrefixed(stream, label, color) {
  let buffered = '';
  stream.on('data', (chunk) => {
    buffered += chunk.toString();
    const lines = buffered.split(/\r?\n/);
    buffered = lines.pop() ?? '';
    for (const line of lines) {
      process.stdout.write(`${color}[${label}]${RESET} ${line}\n`);
    }
  });
  stream.on('end', () => {
    if (buffered) process.stdout.write(`${color}[${label}]${RESET} ${buffered}\n`);
  });
}

function start(label, color, command) {
  // Passed as one string, not (cmd, args[]): with shell:true Node deprecates the
  // array form (DEP0190) because it concatenates rather than escapes.
  const child = spawn(command, {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
  children.push(child);
  pipePrefixed(child.stdout, label, color);
  pipePrefixed(child.stderr, label, color);
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    process.stdout.write(`${color}[${label}]${RESET} exited (code=${code}, signal=${signal})\n`);
    // One server dying makes the pair useless — take the other down with it
    // rather than leaving a half-running stack that looks healthy.
    shutdown(typeof code === 'number' ? code : 1);
  });
  return child;
}

/** Resolve once something is listening on the port, or reject after the timeout. */
function waitForPort(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect({ port, host: '127.0.0.1' });
      socket.once('connect', () => { socket.destroy(); resolve(); });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() > deadline) {
          reject(new Error(`no listener on port ${port} after ${Math.round(timeoutMs / 1000)}s`));
        } else {
          setTimeout(attempt, POLL_MS);
        }
      });
    };
    attempt();
  });
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  process.stdout.write(`${DIM}Stopping both servers…${RESET}\n`);
  for (const child of children) {
    if (child.exitCode !== null || child.pid == null) continue;
    if (IS_WIN) {
      // npm is spawned via cmd, so the node server is a grandchild; /T kills the tree.
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      child.kill('SIGTERM');
    }
  }
  setTimeout(() => process.exit(code), 400);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

// Plain ASCII in console output: the Windows console codepage mangles em dashes.
process.stdout.write(`${DIM}CertifAI - starting backend, then frontend. Ctrl+C stops both.${RESET}\n`);

start('backend', CYAN, 'npm --prefix backend run dev');

try {
  await waitForPort(BACKEND_PORT, READY_TIMEOUT_MS);
  process.stdout.write(`${CYAN}[backend]${RESET} listening on ${BACKEND_PORT} - starting frontend\n`);
} catch (err) {
  // Keep the frontend available so it can show its blocked/authentication
  // state clearly, even though assessment work requires the backend.
  process.stdout.write(`${CYAN}[backend]${RESET} ${err.message}; starting frontend anyway\n`);
}

if (!shuttingDown) start('frontend', MAGENTA, 'npm --prefix frontend run dev');
