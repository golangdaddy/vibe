# Setting Up DSEG Font for Petrol Pump Display

## The Issue

Fyne (the GUI library) uses system fonts and doesn't easily support custom font loading at runtime. However, since you have DSEG installed, we can configure your system to use it as the default monospace font.

## Solution: Use DSEG as System Monospace Font

### Step 1: Find Your DSEG Font

```bash
# Search for DSEG font files
find ~ -name "*DSEG*" -name "*.ttf" 2>/dev/null
find /usr/local -name "*DSEG*" -name "*.ttf" 2>/dev/null  
find ~/.fonts -name "*DSEG*" -name "*.ttf" 2>/dev/null

# Or check font cache
fc-list | grep -i dseg
```

### Step 2: Copy DSEG to Local Fonts Directory

```bash
cd /home/alex/code/vibe/petrol

# If you found DSEG, copy it here:
cp /path/to/DSEG7Classic-Bold.ttf fonts/digital.ttf

# Or download it fresh:
cd fonts/
wget https://github.com/keshikan/DSEG/releases/download/v0.46/DSEG-v046.zip
unzip DSEG-v046.zip
cp DSEG-v046/DSEG7Classic-Bold.ttf digital.ttf
rm -rf DSEG-v046.zip DSEG-v046/
```

### Step 3: Configure System to Use DSEG (Alternative)

If you want DSEG to show up system-wide:

```bash
# Create fonts config
mkdir -p ~/.config/fontconfig

cat > ~/.config/fontconfig/fonts.conf << 'EOF'
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <!-- Use DSEG7 for monospace -->
  <alias>
    <family>monospace</family>
    <prefer>
      <family>DSEG7 Classic</family>
    </prefer>
  </alias>
</fontconfig>
EOF

# Refresh font cache
fc-cache -f -v
```

## Current Status

The program currently uses **bold monospace font** which looks good but not as "digital" as DSEG. When you copy DSEG7Classic-Bold.ttf to `fonts/digital.ttf`, the program will detect and use it automatically on next run.

## Quick Test

```bash
# After copying the font:
cd /home/alex/code/vibe/petrol
./petrol-pump

# Look for this message at startup:
# ✓ Loaded digital font from: fonts/digital.ttf
```

If you see that message, DSEG is loaded! If not, it's using the system monospace font as a fallback.

