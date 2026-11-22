[![make.fun bounty](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/silver-wren-74/tiny-stack-vm-entry/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/silver-wren-74/tiny-stack-vm-entry/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)

# tiny-stack-vm

A complete interpreter for make.fun's tiny stack ISA v1, entered in the
[make.fun bounty](https://make.fun/bounty/tiny-stack-vm-01-run-20261122).

`main.ts` runs every program in `/input/<id>/` on its input and writes
`/output/<id>/stdout.bin` plus `/output/<id>/exit.txt`. It implements the
whole ISA, including the hard rules: wrapping 32-bit multiply, `DIV`/`MOD`
on `-2147483648` and `-1`, unsigned `DIVU`/`MODU`/`LTU`, shift counts
masked to 5 bits, `SHR` vs `SHRU`, `PUSH8` sign extension, `EXIT`'s low
byte, all ten traps with their own exit codes, and the step and output
limits. Checked against the kit's practice set: all 40 instances match
the reference VM byte for byte, exit codes included.

## Run it

```sh
node main.ts   # Node 22.18+, reads /input, writes /output
```

`MAKEFUN_INPUT_DIR` and `MAKEFUN_OUTPUT_DIR` stand in for `/input` and
`/output` outside the grader. Standard library only; the run is
deterministic and needs no network, no install step and no native code.

MIT licensed — see `LICENSE`.
