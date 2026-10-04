#!/usr/bin/env python3
"""Regenerate native OpenMPI samples, raw output and web data on this machine."""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import statistics
import subprocess
import time
import tempfile
import uuid
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'web/public'
RAW = OUT / 'benchmark-raw'
BUILD = ROOT / 'benchmarks/.build'


def command(args):
    start = time.perf_counter()
    result = subprocess.run(args, cwd=ROOT, text=True, capture_output=True, timeout=300)
    elapsed = (time.perf_counter() - start) * 1000
    if result.returncode:
        raise RuntimeError(f'{args!r}\n{result.stdout}\n{result.stderr}')
    return dict(stdout=result.stdout, stderr=result.stderr, wallMs=round(elapsed, 6), command=shlex.join(map(str, args)))


def output(args):
    return command(args)['stdout'].strip()


def validate(app, count, output):
    if app == 'hello_world':
        ranks = re.findall(r'rank (\d+) out of (\d+) processors', output)
        assert sorted((int(r), int(n)) for r, n in ranks) == [(r, count) for r in range(count)], output
    elif app == 'MPI':
        ranks = re.findall(r'Rank (\d+) of (\d+)', output)
        assert sorted((int(r), int(n)) for r, n in ranks) == [(r, count) for r in range(count)], output
        assert 'failed' not in output and 'No IP' not in output, output
    elif app == 'openmp_test':
        assert f'with {count} threads.' in output, output
        assert sorted(map(int, re.findall(r'Hello from thread (\d+)', output))) == list(range(count)), output
    elif app == 'scatter_compute_gather':
        assert f'ranks={count} checksum=1496' in output, output
        assert 'output=' + ','.join(str(i*i) for i in range(1, 17)) in output, output

    else:
        raise ValueError(f'Unknown application: {app}')


def provenance(execution_note):
    details = dict(currentRevision=output(['git', 'rev-parse', 'HEAD']), workingTreeDirty=bool(output(['git', 'status', '--porcelain'])))
    if execution_note:
        details['executionNote'] = execution_note
    return details


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mpi-include', help='Optional extracted OpenMPI development include directory')
    parser.add_argument('--mpi-library', help='Optional directory containing libmpi.so')
    parser.add_argument('--execution-note', help='Optional factual context specific to this execution; omitted by default')
    options = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    generation = uuid.uuid4().hex
    with tempfile.TemporaryDirectory(prefix='c18-benchmark-', dir=OUT.parent) as directory:
        staging = Path(directory)
        generate(options, staging, generation)
        RAW.mkdir(parents=True, exist_ok=True)
        destination = RAW / generation
        (staging / 'benchmark-raw').rename(destination)
        try:
            os.replace(staging / 'results.json', OUT / 'results.json')
        except BaseException:
            shutil.rmtree(destination)
            raise
    print(f'Validated 12 configurations, 36 measured runs. Results: {OUT / "results.json"}')


def generate(options, staging, generation):
    raw = staging / 'benchmark-raw'
    extra_flags = ([f'-I{options.mpi_include}'] if options.mpi_include else []) + ([f'-L{options.mpi_library}'] if options.mpi_library else [])
    raw.mkdir(parents=True, exist_ok=True)
    BUILD.mkdir(parents=True, exist_ok=True)
    compile_commands = [
        ['mpicc', '-Wall', '-Wextra', '-O2', 'mpi_apps/hello_world.c', '-o', str(BUILD / 'hello_world')],
        ['mpic++', '-Wall', '-Wextra', '-O2', '-std=c++11', 'mpi_apps/MPI.cpp', '-o', str(BUILD / 'MPI')],
        ['g++', '-Wall', '-Wextra', '-O2', '-std=c++11', '-fopenmp', 'mpi_apps/openmp_test.cpp', '-o', str(BUILD / 'openmp_test')],
        ['mpicc', '-Wall', '-Wextra', '-O2', 'benchmarks/scatter_compute_gather.c', '-o', str(BUILD / 'scatter_compute_gather')],
    ]
    compile_commands = [args[:1] + (extra_flags if args[0].startswith('mpi') else []) + args[1:] for args in compile_commands]
    build_records = [command(args) for args in compile_commands]
    (raw / 'compilation.json').write_text(json.dumps(build_records, indent=2) + '\n')
    results = []
    for app in ['hello_world', 'MPI', 'openmp_test', 'scatter_compute_gather']:
        for count in [1, 2, 4]:
            if app == 'openmp_test':
                args = ['env', f'OMP_NUM_THREADS={count}', 'OMP_DYNAMIC=FALSE', str(BUILD / app)]
            else:
                args = ['mpirun', '--allow-run-as-root', '--oversubscribe', '--bind-to', 'none', '-np', str(count), str(BUILD / app)]
            validate(app, count, command(args)['stdout'])
            samples, files = [], []
            for repeat in range(3):
                record = command(args)
                validate(app, count, record['stdout'])
                filename = f'{app}-{count}-{repeat+1}.txt'
                (raw / filename).write_text(f"command: {record['command']}\nwall_ms: {record['wallMs']:.6f}\n\nstdout:\n{record['stdout']}\nstderr:\n{record['stderr']}")
                samples.append(record['wallMs'])
                files.append(f'benchmark-raw/{generation}/{filename}')
            row = dict(app=app, workers=count, parallelism='OpenMP threads on one cloud host' if app == 'openmp_test' else 'MPI processes on one cloud host', containerCount=0, samplesMs=samples, medianMs=statistics.median(samples), rawFiles=files)
            if app == 'scatter_compute_gather':
                row['checksum'] = 1496
            results.append(row)
    cpu = next(line.split(':', 1)[1].strip() for line in Path('/proc/cpuinfo').read_text().splitlines() if line.startswith('model name'))
    quota = Path('/sys/fs/cgroup/cpu.max')
    source_paths = ['mpi_apps/hello_world.c', 'mpi_apps/MPI.cpp', 'mpi_apps/openmp_test.cpp', 'benchmarks/scatter_compute_gather.c']
    metadata = dict(
        schemaVersion=1, mode='native', generatedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(), provenance=provenance(options.execution_note),
        machine=dict(cpu=cpu, logicalCpus=os.cpu_count(), allowedCpus=len(os.sched_getaffinity(0)), cpuQuota=quota.read_text().strip() if quota.exists() else 'unavailable', kernel=output(['uname', '-sr']), architecture=output(['uname', '-m'])),
        toolchain=dict(compiler=output(['gcc', '--version']).splitlines()[0], cppCompiler=output(['g++', '--version']).splitlines()[0], mpi=output(['mpirun', '--version']), flags='C: -Wall -Wextra -O2; C++: -Wall -Wextra -O2 -std=c++11; OpenMP: -fopenmp', extraFlags=extra_flags, sourceSha256={name:hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in source_paths}),
        methodology=dict(description='Native cloud-host runs, not Docker measurements. Three measured end-to-end wall-clock invocations after one warmup. Includes process launch, MPI startup, output and teardown.', repetitions=3, units='milliseconds', limitations=['Tiny demonstration workloads measure mostly startup overhead, not useful compute scaling.', 'All processes share one cloud host; no Docker or multi-laptop performance claim.', 'OpenMP uses threads and is not an MPI process benchmark.', 'Shared cloud CPU scheduling and oversubscription can affect timings.']),
        runs=results, scatter=dict(input=list(range(1,17)), output=[i*i for i in range(1,17)], checksum=1496), reproduction='python3 benchmarks/run.py')
    (staging / 'results.json').write_text(json.dumps(metadata, indent=2) + '\n')



if __name__ == '__main__':
    main()
