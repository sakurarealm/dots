#!/usr/bin/env bash
set -euo pipefail
exec 9>/workspace/shared/aether-render.lock
flock 9
memory_kb=$(awk '$1=="MemAvailable:" {print $2}' /proc/meminfo)
disk_bytes=$(df -B1 --output=avail /workspace/shared | tail -n1 | tr -d ' ')
if (( memory_kb < 3145728 || disk_bytes < 2147483648 )); then
    echo "RESOURCE_GATE_BLOCKED: MemAvailable=${memory_kb} KiB; disk=${disk_bytes} bytes" >&2
    exit 75
fi
echo "RESOURCE_GATE_PASS: MemAvailable=${memory_kb} KiB; disk=${disk_bytes} bytes"
export BLENDER_USER_RESOURCES=/workspace/shared/tooling/blender-user
exec /usr/bin/blender --background --factory-startup --threads 2 --python-exit-code 1 "$@"
