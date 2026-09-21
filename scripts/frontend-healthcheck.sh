#!/bin/sh
set -eu
wget --spider --quiet "http://127.0.0.1:${PORT:-80}/health"
