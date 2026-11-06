#!/bin/sh
# Stamps a new version on the app's CSS and JS links in index.html, so
# browsers (phones especially) load the new files after an update.
# Run before committing changes to js/, css/ or data/.
cd "$(dirname "$0")/.." || exit 1
V=$(date -u +%Y%m%d%H%M)
sed -i.bak -E "s#(src|href)=\"((js|data|css)/[a-z0-9_-]+\.(js|css))(\?v=[0-9]+)?\"#\1=\"\2?v=$V\"#g" index.html && rm -f index.html.bak
echo "index.html now loads files with ?v=$V"
