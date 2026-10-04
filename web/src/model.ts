export const stages = ['Ready', 'Scatter', 'Compute', 'Gather'] as const;
export type Stage = 0 | 1 | 2 | 3;
export const input = Array.from({ length: 16 }, (_, index) => index + 1);
export function scatter(values: number[], ranks: number): number[][] {
    if (![1, 2, 4].includes(ranks) || values.length % ranks !== 0)
        throw new Error('Use 1, 2 or 4 ranks with equal chunks.');
    return Array.from({ length: ranks }, (_, rank) => values.slice(rank * values.length / ranks, (rank + 1) * values.length / ranks));
}
export function compute(chunk: number[]): number[] { return chunk.map(value => value * value); }
export function gather(chunks: number[][]): number[] { return chunks.flat(); }
export function snapshot(ranks: number, stage: Stage) {
    const chunks = scatter(input, ranks);
    const output = chunks.map(compute);
    return { chunks: stage >= 2 ? output : chunks, result: stage === 3 ? gather(output) : [], sum: gather(output).reduce((a, b) => a + b, 0) };
}
export function advance(stage: Stage): Stage { return ((stage + 1) % stages.length) as Stage; }
export interface Measurement {
    app: string;
    workers: number;
    parallelism: string;
    containerCount: number;
    samplesMs: number[];
    medianMs: number;
    rawFiles: string[];
}
export interface Results {
    schemaVersion: 1;
    mode: 'native' | 'docker';
    generatedAt: string;
    machine: {
        cpu: string;
        logicalCpus: number;
        kernel: string;
        architecture: string;
    };
    toolchain: {
        compiler: string;
        cppCompiler?: string;
        mpi: string;
        flags: string;
        extraFlags?: string[];
    };
    methodology: {
        description: string;
        repetitions: number;
        units: string;
        limitations: string[];
        dockerFallbackReason?: string;
    };
    runs: Measurement[];
    reproduction: string;
}
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(nonempty);
const positiveInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value > 0;
const positiveNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;
export function parseResults(raw: unknown): Results {
    if (!raw || typeof raw !== 'object')
        throw new Error('No valid results object.');
    const data = raw as Results;
    if (data.schemaVersion !== 1 || !['native', 'docker'].includes(data.mode)
        || !nonempty(data.generatedAt) || !Number.isFinite(Date.parse(data.generatedAt))
        || !data.machine || !nonempty(data.machine.cpu) || !positiveInteger(data.machine.logicalCpus)
        || !nonempty(data.machine.kernel) || !nonempty(data.machine.architecture)
        || !data.toolchain || !nonempty(data.toolchain.compiler) || !nonempty(data.toolchain.mpi) || !nonempty(data.toolchain.flags)
        || (data.toolchain.extraFlags !== undefined && !strings(data.toolchain.extraFlags))
        || !data.methodology || !nonempty(data.methodology.description) || !strings(data.methodology.limitations)
        || data.methodology.units !== 'milliseconds' || !positiveInteger(data.methodology.repetitions)
        || !nonempty(data.reproduction) || !Array.isArray(data.runs) || !data.runs.length) {
        throw new Error('Results are missing provenance or measurements.');
    }
    const configurations = new Set<string>();
    for (const row of data.runs) {
        if (!row || !nonempty(row.app) || ![1, 2, 4].includes(row.workers) || !nonempty(row.parallelism)
            || !Array.isArray(row.samplesMs) || row.samplesMs.length !== data.methodology.repetitions || !row.samplesMs.every(positiveNumber)
            || !positiveNumber(row.medianMs) || !strings(row.rawFiles) || row.rawFiles.length !== row.samplesMs.length
            || row.rawFiles.some(file => !/^benchmark-raw\/(?:[a-zA-Z0-9_-]+\/)?[a-zA-Z0-9_-]+\.txt$/.test(file))
            || new Set(row.rawFiles).size !== row.rawFiles.length
            || (data.mode === 'native' ? row.containerCount !== 0 : !positiveInteger(row.containerCount))) {
            throw new Error('Invalid measurement.');
        }
        const sorted = [...row.samplesMs].sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
        const key = `${row.app}:${row.workers}`;
        if (Math.abs(median - row.medianMs) > 0.000001 || configurations.has(key))
            throw new Error('Inconsistent measurement.');
        configurations.add(key);
    }
    return data;
}
