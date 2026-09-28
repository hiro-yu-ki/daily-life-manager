"""Workspace-local test bridge for the dependency-free Node test suite."""

from pathlib import Path
import shutil
import subprocess
import unittest


ROOT = Path(__file__).resolve().parents[1]


class NodeBehaviorSuiteTest(unittest.TestCase):
    def test_major_application_behaviors(self):
        """Run the canonical suite that covers records, sync, reminders and Strava."""
        node = shutil.which("node")
        self.assertIsNotNone(node, "Node.js >=20 is required by package.json")

        result = subprocess.run(
            # Running a node:test file directly keeps the suite in this process.
            # `node --test` starts an additional worker process per test file,
            # which is rejected with EPERM in restricted Windows sandboxes.
            [node, "tests/app.test.js"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=60,
            check=False,
        )

        details = "\n".join(part for part in (result.stdout, result.stderr) if part)
        self.assertEqual(result.returncode, 0, details)
        self.assertIn("fail 0", details, details)


if __name__ == "__main__":
    unittest.main()
