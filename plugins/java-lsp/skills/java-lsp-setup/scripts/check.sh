#!/usr/bin/env bash
# Checks that the Java language server used by the java-lsp plugin is installed.
# Install with:
#   brew install jdtls
#   mkdir -p ~/.local/share/jdtls && \
set -u

status=0
if command -v jdtls >/dev/null 2>&1; then
  echo "OK      jdtls: $(command -v jdtls)"
else
  echo "MISSING jdtls (required)"
  status=1
fi
if command -v java >/dev/null 2>&1; then
  echo "OK      java: $(command -v java)"
else
  echo "MISSING java"
  status=1
fi
if [ "$status" -eq 0 ]; then
  echo "VERSION $(java -version 2>&1 | head -n 1)"
fi
exit "$status"
