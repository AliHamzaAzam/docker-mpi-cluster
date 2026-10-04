import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scatter, compute, gather, snapshot, advance, parseResults, input } from '../.test-build/model.js';
for (const ranks of [1, 2, 4])
    test(`${ranks} ranks scatter and gather actual computed values in rank order`, () => {
        const chunks = scatter(input, ranks);
        assert.equal(chunks.length, ranks);
        assert.deepEqual(gather(chunks), input);
        assert.deepEqual(gather(chunks.map(compute)), input.map(value => value * value));
        assert.deepEqual(snapshot(ranks, 0).result, []);
        assert.deepEqual(snapshot(ranks, 1).chunks, chunks);
        assert.deepEqual(snapshot(ranks, 2).chunks, chunks.map(compute));
        assert.deepEqual(snapshot(ranks, 3).result, input.map(value => value * value));
        assert.equal(snapshot(ranks, 3).sum, 1496);
    });
test('step cycles through all four stages', () => assert.deepEqual([0, 1, 2, 3].map(advance), [1, 2, 3, 0]));
test('rejects unsupported or uneven partitions', () => { assert.throws(() => scatter(input, 3)); assert.throws(() => scatter([1, 2, 3], 2)); });
test('does not mutate inputs', () => { const data = [1, 2]; compute(data); scatter(data, 2); assert.deepEqual(data, [1, 2]); });
const valid = { schemaVersion: 1, mode: 'native', generatedAt: '2026-10-04T00:00:00Z', machine: { cpu: 'fixture', logicalCpus: 1, kernel: 'fixture', architecture: 'fixture' }, toolchain: { compiler: 'fixture', mpi: 'fixture', flags: '-O2' }, methodology: { description: 'Test fixture only', units: 'milliseconds', repetitions: 1, limitations: [] }, reproduction: 'fixture', runs: [{ app: 'fixture', workers: 1, containerCount: 0, parallelism: 'MPI ranks on one host', samplesMs: [1], medianMs: 1, rawFiles: ['benchmark-raw/fixture-1.txt'] }] };
test('results require mode, real finite measurements and provenance', () => { assert.deepEqual(parseResults(valid), valid); for (const bad of [null, {}, { ...valid, mode: 'unknown' }, { ...valid, machine: null }, { ...valid, runs: [] }, { ...valid, runs: [{ ...valid.runs[0], medianMs: NaN }] }, { ...valid, runs: [{ ...valid.runs[0], workers: 3 }] }, { ...valid, runs: [{ ...valid.runs[0], samplesMs: [0] }] }])
    assert.throws(() => parseResults(bad)); });
import { readFileSync } from 'node:fs';
const recorded = JSON.parse(readFileSync(new URL('../public/results.json', import.meta.url), 'utf8'));
test('recorded measurements have complete provenance and internally consistent evidence', () => {
    assert.equal(parseResults(recorded), recorded);
    for (const mutate of [
        data => delete data.toolchain.flags,
        data => data.mode = "docker",
        data => data.runs.push(data.runs[0]),
        data => delete data.generatedAt,
        data => data.runs[0].medianMs += 100,
        data => data.runs[0].rawFiles = [],
        data => data.runs[0].rawFiles[0] = '../outside.txt',
        data => data.runs[0].containerCount = 1,
        data => data.machine.logicalCpus = 0,
        data => data.methodology.limitations = [null],
    ]) {
        const data = structuredClone(recorded);
        mutate(data);
        assert.throws(() => parseResults(data));
    }
});

test('browser computation agrees with the measured MPI program', () => {
    assert.deepEqual(input, recorded.scatter.input);
    for (const ranks of [1, 2, 4]) {
        assert.deepEqual(snapshot(ranks, 3).result, recorded.scatter.output);
        assert.equal(snapshot(ranks, 3).sum, recorded.scatter.checksum);
    }
});
