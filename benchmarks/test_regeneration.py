import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from test_run import runner


class RegenerationTests(unittest.TestCase):
    def test_failed_run_preserves_previous_evidence(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            public = root / 'web/public'
            raw = public / 'benchmark-raw'
            raw.mkdir(parents=True)
            (public / 'results.json').write_text('{"previous": true}\n')
            (raw / 'compilation.json').write_text('previous compiler evidence\n')
            (raw / 'hello_world-1-1.txt').write_text('previous sample\n')
            previous = {str(path.relative_to(public)): path.read_bytes() for path in public.rglob('*') if path.is_file()}
            calls = 0

            def failure_midway(args):
                nonlocal calls
                calls += 1
                if calls == 7:
                    raise RuntimeError('injected MPI failure after first measured sample')
                return {'command': 'fake command', 'stdout': 'Hello world from processor fake, rank 0 out of 1 processors\n', 'stderr': '', 'wallMs': 1.0}

            with patch.object(runner, 'ROOT', root), patch.object(runner, 'OUT', public), patch.object(runner, 'RAW', raw), patch.object(runner, 'BUILD', root / 'build'), patch.object(runner, 'command', side_effect=failure_midway), patch('sys.argv', ['run.py']):
                with self.assertRaisesRegex(RuntimeError, 'injected MPI failure'):
                    runner.main()
            current = {str(path.relative_to(public)): path.read_bytes() for path in public.rglob('*') if path.is_file()}
            self.assertEqual(current, previous)

    def test_provenance_without_note_has_no_historical_claim(self):
        with patch.object(runner, 'output', side_effect=['current-revision', ' M benchmarks/run.py']):
            provenance = runner.provenance(None)
        self.assertEqual(provenance, {'currentRevision': 'current-revision', 'workingTreeDirty': True})

    def test_provenance_preserves_only_explicit_note(self):
        with patch.object(runner, 'output', side_effect=['other-revision', '']):
            provenance = runner.provenance('Native run requested on this machine.')
        self.assertEqual(provenance, {'currentRevision': 'other-revision', 'workingTreeDirty': False, 'executionNote': 'Native run requested on this machine.'})

    def test_success_publishes_complete_generation(self):
        with tempfile.TemporaryDirectory() as directory:
            public = Path(directory) / 'public'
            raw = public / 'benchmark-raw'
            raw.mkdir(parents=True)
            (public / 'results.json').write_text('{"old":true}')
            (raw / 'previous.txt').write_text('old evidence')

            def generated(options, staging, generation):
                (staging / 'benchmark-raw').mkdir()
                (staging / 'benchmark-raw/sample.txt').write_text('new evidence')
                (staging / 'results.json').write_text(json.dumps({'raw': f'benchmark-raw/{generation}/sample.txt'}))

            with patch.object(runner, 'OUT', public), patch.object(runner, 'RAW', raw), patch.object(runner, 'generate', side_effect=generated), patch('sys.argv', ['run.py']):
                runner.main()
            manifest = json.loads((public / 'results.json').read_text())
            self.assertEqual((public / manifest['raw']).read_text(), 'new evidence')
            self.assertEqual((raw / 'previous.txt').read_text(), 'old evidence')
