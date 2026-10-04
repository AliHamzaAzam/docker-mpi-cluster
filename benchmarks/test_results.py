"""Validate checked-in evidence and execute the scatter/gather correctness contract."""
import json
from pathlib import Path
import re
import statistics
import subprocess
import unittest
from test_run import runner

ROOT = Path(__file__).resolve().parents[1]


class EvidenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads((ROOT / 'web/public/results.json').read_text())

    def test_all_configurations_and_raw_measurements(self):
        expected = {(app, count) for app in ['hello_world', 'MPI', 'openmp_test', 'scatter_compute_gather'] for count in [1, 2, 4]}
        self.assertEqual({(row['app'], row['workers']) for row in self.data['runs']}, expected)
        for row in self.data['runs']:
            self.assertEqual(row['containerCount'], 0)
            self.assertEqual(len(row['samplesMs']), 3)
            self.assertEqual(row['medianMs'], statistics.median(row['samplesMs']))
            for sample, raw_file in zip(row['samplesMs'], row['rawFiles'], strict=True):
                raw = (ROOT / 'web/public' / raw_file).read_text()
                self.assertGreater(sample, 0)
                self.assertEqual(float(re.search(r'wall_ms: ([\d.]+)', raw)[1]), sample)
                stdout = raw.split('stdout:\n', 1)[1].split('\nstderr:\n', 1)[0]
                runner.validate(row['app'], row['workers'], stdout)

    def test_native_label_and_scatter_math(self):
        self.assertEqual(self.data['mode'], 'native')
        self.assertIn('not Docker', self.data['methodology']['description'])
        self.assertEqual(self.data['scatter']['output'], [value * value for value in self.data['scatter']['input']])
        self.assertEqual(sum(self.data['scatter']['output']), self.data['scatter']['checksum'])

    def test_source_hashes_match(self):
        import hashlib
        for name, digest in self.data['toolchain']['sourceSha256'].items():
            self.assertEqual(hashlib.sha256((ROOT / name).read_bytes()).hexdigest(), digest)

    def test_scatter_rejects_unsupported_rank_count(self):
        binary = ROOT / 'benchmarks/.build/scatter_compute_gather'
        self.assertTrue(binary.exists(), 'Run python3 benchmarks/run.py first to compile the MPI fixtures')
        result = subprocess.run(['mpirun', '--allow-run-as-root', '--oversubscribe', '--bind-to', 'none', '-np', '3', str(binary)], text=True, capture_output=True, timeout=30)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Use 1, 2, or 4 ranks.', result.stderr)


if __name__ == '__main__':
    unittest.main()
