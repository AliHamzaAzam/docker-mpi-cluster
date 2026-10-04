# Reproducing the results

The checked-in results are **native OpenMPI process measurements**, not Docker container measurements. All work ran in the saved cloud environment. The three repository examples are unchanged. `scatter_compute_gather.c` is an additional deterministic MPI illustration: rank 0 scatters the integers 1 through 16 into equal chunks, each rank squares its chunk, and rank 0 gathers ordered squares and verifies checksum 1496. Supported rank counts are 1, 2 and 4.

`web/public/results.json` is the canonical dataset. Its 36 measured invocations have raw stdout, stderr, exact commands and wall times under `web/public/benchmark-raw/<generation>/`. Compiler commands and output are in that generation's `compilation.json`. Each configuration gets one unmeasured warmup and three measured runs; the site shows the median in milliseconds. Timing includes process launch, MPI initialization, printed output and finalization. Tiny workloads mostly measure startup overhead. These numbers do not demonstrate algorithm speedup or multi-laptop performance. OpenMP counts threads, not MPI processes.

## Normal regeneration

With Python 3.10 or newer, a C/C++ compiler, and a complete OpenMPI development installation:

```sh
python3 benchmarks/run.py
python3 -m unittest discover -s benchmarks -p 'test_*.py'
```

The script compiles into ignored `benchmarks/.build`, verifies every run's ranks/threads and output, and stages a complete new evidence generation before publishing it. Failed compilation, execution or validation leaves the previous manifest and raw files untouched. A successful run publishes immutable raw files under a unique generation directory, then atomically replaces `results.json`. Previous generations remain available for readers; remove unreferenced generations manually when preparing a release if desired. Re-running produces different real timing samples and fresh machine metadata. It requires no network access once the toolchain is present. The `--allow-run-as-root` switch permits cloud runners using root; it does not elevate privileges. Tests also execute the unsupported three-rank path and require the compiled fixture from regeneration.

## Toolchain used in this cloud environment

The installed OpenMPI 5.0.7 runtime lacked `mpi.h` and its development linker alias. The user authorized OpenMPI installation; matching headers were fetched over HTTPS from the official Debian registry and extracted under `/tmp`, without a system-wide installation. This narrowly scoped setup was used:

```sh
curl -fsSL https://deb.debian.org/debian/pool/main/o/openmpi/libopenmpi-dev_5.0.7-1_amd64.deb -o /tmp/c18-libopenmpi-dev.deb
dpkg-deb -x /tmp/c18-libopenmpi-dev.deb /tmp/c18-openmpi-dev
mkdir -p benchmarks/.build
ln -s /usr/lib/x86_64-linux-gnu/libmpi.so.40 benchmarks/.build/libmpi.so
python3 benchmarks/run.py --mpi-include /tmp/c18-openmpi-dev/usr/lib/x86_64-linux-gnu/openmpi/include --mpi-library "$PWD/benchmarks/.build"
python3 -m unittest discover -s benchmarks -p 'test_*.py'
```

This package version and linker target are specific to the recorded Debian amd64 runtime. Use the normal complete toolchain on another machine. Exact compiler versions, source SHA256 digests, flags, CPU model, available CPUs and cgroup CPU quota are recorded in the dataset. `provenance.currentRevision` comes from the current Git checkout, and `workingTreeDirty` reports uncommitted work. Source hashes identify the compiled files even when the checkout is dirty. No historical baseline or Docker failure is automatically attributed to a future run. `--execution-note` optionally records context explicitly supplied for that execution. A cgroup quota such as `400000 100000` corresponds to four CPU-seconds per second, even when more host logical CPUs are visible.

## Docker attempt and remaining verification

Docker 28.4.0 ran the official `debian:bullseye-slim` image successfully. Its pulled manifest digest was `sha256:e5b6442dd2e9684cf5e87d8338b5968f3b348636fc0be6d7850a381e3731a2bd`. Building the minimal benchmark image in `benchmarks/Dockerfile` failed because apt could not resolve `deb.debian.org`, under both default and host networking. `docker-build-failure.txt` preserves the final attempted command and build failure. Host HTTPS downloads worked through the environment's ordinary transport, enabling the native fallback.

The probe image excludes optional CMake and does not run the repository Supervisor setup. Its benchmark SSH keys are disposable local test material and the image must not be published or used as production configuration. No Docker timings, cross-container MPI timings, or multi-laptop verification are claimed. Docker and physical laptop runs remain work for an environment with a complete reachable container toolchain and suitable networking.

The downloaded development package SHA256 was `e301a429da4839d0bfed81cee3ed104c2975cbdd46370831039b8636bf5966ca`.

## Final cloud run command

After creating the local linker alias shown above, the final dataset was regenerated from the selected worktree with this command:

```sh
python3 benchmarks/run.py --mpi-include /tmp/c18-openmpi-dev/usr/lib/x86_64-linux-gnu/openmpi/include --mpi-library /workspace/c18-final/benchmarks/.build --execution-note 'Native fallback for C18: Docker 28.4.0 ran debian:bullseye-slim, but OpenMPI image builds failed resolving deb.debian.org with default and host networking. Existing native OpenMPI 5.0.7 used with matching official Debian development package extracted locally. This records a native cloud run, not Docker or multi-laptop performance.'
python3 -m unittest discover -s benchmarks -p 'test_*.py'
```

The execution note above describes this specific C18 run. Omit it or supply accurate current context when regenerating elsewhere. The original repository baseline was `5407e54`; it is historical context, not the revision automatically assigned to new results.
