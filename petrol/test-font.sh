#!/bin/bash
echo "=== Searching for DSEG font ==="
echo ""

echo "1. Checking ~/.fonts:"
find ~/.fonts -name "*DSEG*" -name "*.ttf" 2>/dev/null || echo "   Not found"

echo ""
echo "2. Checking /usr/share/fonts:"
find /usr/share/fonts -name "*DSEG*" -name "*.ttf" 2>/dev/null || echo "   Not found"

echo ""
echo "3. Checking /usr/local/share/fonts:"
find /usr/local/share/fonts -name "*DSEG*" -name "*.ttf" 2>/dev/null || echo "   Not found"

echo ""
echo "4. Checking font cache:"
fc-list | grep -i "dseg" || echo "   Not in font cache"

echo ""
echo "5. Checking current directory:"
find . -name "*DSEG*" -name "*.ttf" 2>/dev/null || echo "   Not found"

echo ""
echo "=== To use DSEG in petrol pump ==="
echo "Copy DSEG7Classic-Bold.ttf to: $(pwd)/fonts/digital.ttf"
