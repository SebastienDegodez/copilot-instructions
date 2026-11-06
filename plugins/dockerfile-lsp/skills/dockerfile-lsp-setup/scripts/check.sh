#!/usr/bin/env bash
# Checks that the Dockerfile language server used by the dockerfile-lsp plugin is installed.
# Install with:
#   go install github.com/docker/docker-language-server/cmd/docker-language-server@latest
#   VERSION=$(curl -fsSL https://api.github.com/repos/docker/docker-language-server/releases/latest | grep -oP '"tag_name": "\K[^"]+')
set -u

status=0
if command -v docker-language-server >/dev/null 2>&1; then
  echo "OK      docker-language-server: $(command -v docker-language-server)"
else
  echo "MISSING docker-language-server (required)"
  status=1
fi
if [ "$status" -eq 0 ]; then
  echo "VERSION $(docker-language-server --version)"
fi
exit "$status"
