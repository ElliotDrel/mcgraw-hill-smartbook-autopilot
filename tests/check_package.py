"""Ensure public packaging never includes credentials, even with an environment key."""
import importlib.util
import json
import os
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('betterbook_package', root / 'package.py')
package = importlib.util.module_from_spec(spec)
spec.loader.exec_module(package)
fixture = 'sk-test-fixture-not-a-real-key'
os.environ['OPENAI_API_KEY'] = fixture
archive = package.build()
with zipfile.ZipFile(archive) as zipped:
    names = set(zipped.namelist())
    manifest = json.loads(zipped.read('manifest.json'))
    required = [manifest['options_page'], manifest['background']['service_worker'],
                manifest['action']['default_popup']] + manifest['content_scripts'][0]['js']
    for name in required:
        assert name in names, name
    assert not any('.env' in n or n.startswith('.git') or n.endswith('.map') for n in names)
    for name in names:
        assert fixture.encode() not in zipped.read(name), name
    assert b'"OPENAI_API_KEY": ""' in zipped.read('config.js')
print('PASS: complete public installation package; environment key excluded.')
