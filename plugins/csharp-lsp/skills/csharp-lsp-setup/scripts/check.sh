#!/usr/bin/env bash
# Checks that the C# language server used by the csharp-lsp plugin is installed.
# Install with:
#   dotnet tool install --global csharp-ls
#   dotnet tool update --global csharp-ls
set -u

status=0
if command -v csharp-ls >/dev/null 2>&1; then
  echo "OK      csharp-ls: $(command -v csharp-ls)"
else
  echo "MISSING csharp-ls (required)"
  status=1
fi
if command -v dotnet >/dev/null 2>&1; then
  echo "OK      dotnet: $(command -v dotnet)"
else
  echo "MISSING dotnet"
  status=1
fi
if [ "$status" -eq 0 ]; then
  echo "VERSION $(dotnet --version)"
fi
exit "$status"
