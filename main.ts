// Tiny stack VM: a complete interpreter for make.fun's tiny stack ISA v1.
// For each /input/<id>/ it runs program.bin on input.bin, writing
// /output/<id>/stdout.bin and exit.txt. It follows ISA.md's rule order:
// step limit, pc bounds, unknown opcode, cut-off immediate, stack
// under/overflow, then the instruction's own traps; output written
// before a trap is kept.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
// Opcode specs [op, immediate bytes, popped, pushed]; unnamed opcodes trap 5.
const Q = [[0,0,0,0],[1,1,0,1],[2,4,0,1],[3,0,1,0],[4,0,1,2],[5,0,2,2],[6,0,2,3],[7,0,3,3],[16,0,2,1],[17,0,2,1],[18,0,2,1],[19,0,2,1],[20,0,2,1],[21,0,2,1],[22,0,2,1],[23,0,1,1],[24,0,2,1],[25,0,2,1],[26,0,2,1],[27,0,1,1],[28,0,2,1],[29,0,2,1],[30,0,2,1],[32,0,2,1],[33,0,2,1],[34,0,2,1],[48,2,0,0],[49,2,1,0],[50,2,1,0],[51,2,0,0],[52,0,0,0],[64,0,1,1],[65,0,2,0],[80,0,1,0],[81,0,1,0],[82,0,0,1],[83,0,1,0]];
const S = [];
for (const q of Q) S[q[0]] = q.slice(1);
function run(p, inp) {
  const n = p.length, st = new Int32Array(256);
  let sp = 0;
  const cs = new Int32Array(64);
  let cp = 0;
  const mem = new Int32Array(256), out = new Uint8Array(65536);
  let ol = 0, ip = 0, pc = 0, steps = 0;
  const done = (c) => [out.subarray(0, ol), c];
  for (;;) {
    if (steps === 1e6) return done(10);
    if (pc < 0 || pc >= n) return done(9);
    const op = p[pc], s = S[op];
    if (!s) return done(5);
    if (pc + s[0] >= n) return done(9);
    steps++;
    const nx = pc + 1 + s[0];
    if (sp < s[1]) return done(2);
    if (sp - s[1] + s[2] > 256) return done(3);
    pc = nx;
    switch (op) {
      case 0: return done(0);
      case 1: st[sp++] = (p[nx - 1] << 24) >> 24; break;
      case 2: st[sp++] = p[nx - 4] | (p[nx - 3] << 8) | (p[nx - 2] << 16) | (p[nx - 1] << 24); break;
      case 3: sp--; break;
      case 4: st[sp] = st[sp - 1]; sp++; break;
      case 5: { const t = st[sp - 1]; st[sp - 1] = st[sp - 2]; st[sp - 2] = t; break; }
      case 6: st[sp] = st[sp - 2]; sp++; break;
      case 7: { const a = st[sp - 3]; st[sp - 3] = st[sp - 2]; st[sp - 2] = st[sp - 1]; st[sp - 1] = a; break; }
      case 23: st[sp - 1] = -st[sp - 1]; break;
      case 27: st[sp - 1] = ~st[sp - 1]; break;
      case 48: case 49: case 50: {
        const rel = ((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16;
        let take = true;
        if (op !== 48) { const v = st[--sp]; take = op === 49 ? v === 0 : v !== 0; }
        if (take) pc = nx + rel;
        break;
      }
      case 51:
        if (cp === 64) return done(7);
        cs[cp++] = nx;
        pc = p[nx - 2] | (p[nx - 1] << 8);
        break;
      case 52:
        if (cp === 0) return done(8);
        pc = cs[--cp];
        break;
      case 64: {
        const a = st[sp - 1];
        if (a < 0 || a > 255) return done(6);
        st[sp - 1] = mem[a];
        break;
      }
      case 65: {
        const a = st[sp - 1], v = st[sp - 2];
        if (a < 0 || a > 255) return done(6);
        sp -= 2;
        mem[a] = v;
        break;
      }
      case 80: {
        const d = String(st[sp - 1]);
        if (ol + d.length > 65536) return done(11);
        sp--;
        for (let i = 0; i < d.length; i++) out[ol++] = d.charCodeAt(i);
        break;
      }
      case 81:
        if (ol + 1 > 65536) return done(11);
        out[ol++] = st[--sp] & 255;
        break;
      case 82: st[sp++] = ip < inp.length ? inp[ip++] : -1; break;
      case 83: return done(st[--sp] & 255);
      default: {
        const b = st[sp - 1], a = st[sp - 2];
        let r;
        if (op === 16) r = (a + b) | 0;
        else if (op === 17) r = (a - b) | 0;
        else if (op === 18) r = Math.imul(a, b);
        else if (op === 19) { if (b === 0) return done(4); r = (a / b) | 0; }
        else if (op === 20) { if (b === 0) return done(4); r = b === -1 ? 0 : (a % b) | 0; }
        else if (op === 21) { if (b === 0) return done(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; }
        else if (op === 22) { if (b === 0) return done(4); r = ((a >>> 0) % (b >>> 0)) | 0; }
        else if (op === 24) r = a & b;
        else if (op === 25) r = a | b;
        else if (op === 26) r = a ^ b;
        else if (op === 28) r = a << (b & 31);
        else if (op === 29) r = a >> (b & 31);
        else if (op === 30) r = (a >>> (b & 31)) | 0;
        else if (op === 32) r = a === b ? 1 : 0;
        else if (op === 33) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
        sp -= 2;
        st[sp++] = r;
        break;
      }
    }
  }
}
for (const id of readdirSync(I).sort()) {
  const [bytes, code] = run(readFileSync(join(I, id, 'program.bin')), readFileSync(join(I, id, 'input.bin')));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), bytes);
  writeFileSync(join(O, id, 'exit.txt'), `${code}\n`);
}
