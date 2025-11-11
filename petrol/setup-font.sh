#!/bin/bash

# Setup fontconfig to use DSEG7 as default monospace font

echo "Setting up fontconfig..."
mkdir -p ~/.config/fontconfig

cat > ~/.config/fontconfig/fonts.conf << 'EOF'
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <!-- Make DSEG7 Classic the default monospace font -->
  <alias>
    <family>monospace</family>
    <prefer>
      <family>DSEG7 Classic</family>
      <family>DejaVu Sans Mono</family>
    </prefer>
  </alias>
  
  <!-- Ensure DSEG7 is used for monospace -->
  <match target="pattern">
    <test qual="any" name="family">
      <string>monospace</string>
    </test>
    <edit name="family" mode="prepend" binding="strong">
      <string>DSEG7 Classic</string>
    </edit>
  </match>
</fontconfig>
EOF

echo "✓ Created ~/.config/fontconfig/fonts.conf"
echo "Updating font cache..."
fc-cache -f -v > /dev/null 2>&1 || fc-cache -f
echo "✓ Font cache updated"
echo ""
echo "Verifying font setup:"
if fc-match monospace | grep -q "DSEG7"; then
    echo "✓ DSEG7 is now the default monospace font"
else
    echo "⚠ DSEG7 not set as default (you may need to restart)"
fi

