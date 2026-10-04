import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('benchmark_run', Path(__file__).with_name('run.py'))
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


class ValidationTests(unittest.TestCase):
    def test_unknown_application_rejected(self):
        with self.assertRaises(ValueError):
            runner.validate('unknown', 1, 'ranks=1 checksum=1496 output=' + ','.join(str(i*i) for i in range(1, 17)))

    def test_missing_rank_rejected(self):
        with self.assertRaises(AssertionError):
            runner.validate('hello_world', 2, 'Hello world from processor fake, rank 0 out of 2 processors')

    def test_duplicate_thread_rejected(self):
        with self.assertRaises(AssertionError):
            runner.validate('openmp_test', 2, 'Parallel region executing with 2 threads.\nHello from thread 0\nHello from thread 0')

    def test_incorrect_square_rejected(self):
        with self.assertRaises(AssertionError):
            runner.validate('scatter_compute_gather', 1, 'ranks=1 checksum=1496 output=1,4,9')

    def test_successful_stderr_retained(self):
        result = runner.command(['python3', '-c', 'import sys; print("warning", file=sys.stderr)'])
        self.assertEqual(result['stderr'].strip(), 'warning')


if __name__ == '__main__':
    unittest.main()
