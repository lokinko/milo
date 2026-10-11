import importlib.util
from pathlib import Path
from types import SimpleNamespace
import tempfile
import unittest
spec = importlib.util.spec_from_file_location('installer', 'scripts/install-nginx.py')
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)
installer.ARGS = SimpleNamespace(path='/milo')

CONFIG = '''# fake server { ignored
server { listen 80; server_name www.madeagents.ai; return 301 https://$host$request_uri; }
server {
  listen 443 ssl; listen [::]:443 ssl;
  server_name "www.madeagents.ai" madeagents.ai;
  ssl_certificate /etc/cert.pem;
  location / { proxy_pass http://127.0.0.1:8080; }
  location ~ \\.css$ { add_header X-Test "braces { inside } quotes"; }
}
server { listen 443 ssl; server_name other.example; location / { return 200; } }
'''

class InstallerTests(unittest.TestCase):
    def test_preservation_and_idempotence(self):
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory) / 'website.conf'; p.write_text(CONFIG)
            path, source, block = installer.choose([p], 'www.madeagents.ai', 443)
            updated = installer.add_include(source, block)
            self.assertEqual(updated.replace('\n    # Milo managed route\n    include /etc/nginx/snippets/milo.conf;\n', ''), CONFIG)
            new_block = next(x for x in installer.server_blocks(updated) if 'www.madeagents.ai' in x['names'] and '443 ssl' in x['listens'])
            self.assertEqual(installer.add_include(updated, new_block), updated)
            self.assertNotIn('/milo', CONFIG)
    def test_refuse_duplicate_and_existing_location(self):
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory) / 'website.conf'; p.write_text(CONFIG + CONFIG)
            with self.assertRaises(RuntimeError): installer.choose([p], 'www.madeagents.ai', 443)
            p.write_text(CONFIG.replace('location / {', 'location /milo {', 1))
            _, text, block = installer.choose([p], 'www.madeagents.ai', 443)
            with self.assertRaises(RuntimeError): installer.add_include(text, block)
    def test_path_preservation(self):
        snippet = installer.snippet('/milo', 3088)
        self.assertIn('location = /milo {', snippet)
        self.assertIn('location ^~ /milo/ {', snippet)
        self.assertIn('proxy_pass http://127.0.0.1:3088;', snippet)
        self.assertNotIn('proxy_pass http://127.0.0.1:3088/;', snippet)
        self.assertIn('proxy_cache off;', snippet)

if __name__ == '__main__': unittest.main()
