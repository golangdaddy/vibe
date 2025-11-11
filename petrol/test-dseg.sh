#!/bin/bash

echo "=== DSEG7 Font Setup Verification ==="
echo ""

echo "1. Font file exists:"
if [ -f "fonts/digital.ttf" ]; then
    echo "   ✓ fonts/digital.ttf found"
    ls -lh fonts/digital.ttf
else
    echo "   ✗ fonts/digital.ttf NOT found"
fi

echo ""
echo "2. System DSEG7 fonts:"
fc-list | grep -i "dseg7 classic" | head -3

echo ""
echo "3. Fontconfig file:"
if [ -f ~/.config/fontconfig/fonts.conf ]; then
    echo "   ✓ ~/.config/fontconfig/fonts.conf exists"
else
    echo "   ✗ ~/.config/fontconfig/fonts.conf NOT found"
fi

echo ""
echo "4. Current monospace font:"
fc-match monospace

echo ""
echo "5. Current bold monospace font:"
fc-match "monospace:weight=bold"

echo ""
echo "=== Summary ==="
if fc-match monospace | grep -q "DSEG7"; then
    echo "✓ DSEG7 Classic is configured as default monospace font"
    echo "✓ The petrol pump will use DSEG7 for numbers!"
else
    echo "✗ DSEG7 is NOT set as default monospace"
    echo "  Run: fc-cache -f -v"
fi

