#!/usr/bin/env python3
"""Render the source-deployed application's systemd unit without secrets."""
import re
import sys

def render(install_dir, node, release='manual'):
    for path in (install_dir, node):
        if not re.fullmatch(r'/[a-zA-Z0-9_./-]+', path) or any(part in ('.', '..') for part in path.split('/')):
            raise ValueError('Use an absolute path without spaces or traversal')
    if not re.fullmatch(r'[a-zA-Z0-9_-]+', release):
        raise ValueError('Invalid release identifier')
    return f'''# Managed by Milo deploy.sh
# Milo install directory: {install_dir}
[Unit]
Description=Milo health planning
After=network.target
StartLimitIntervalSec=60
StartLimitBurst=5

[Service]
Type=simple
User=milo
Group=milo
WorkingDirectory={install_dir}/current
EnvironmentFile={install_dir}/shared/.deploy/milo.env
Environment=NODE_ENV=production
Environment=NEXT_TELEMETRY_DISABLED=1
Environment=MILO_RELEASE_ID={release}
ExecStart={node} {install_dir}/current/server.js
Restart=on-failure
RestartSec=3
TimeoutStopSec=30
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths={install_dir}/shared/data

[Install]
WantedBy=multi-user.target
'''

if __name__ == '__main__':
    print(render(*sys.argv[1:]), end='')
