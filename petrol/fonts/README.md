# Digital Display Fonts

## Current Implementation

The numbers use **bold monospace font** which gives a digital-style appearance similar to alarm clocks and petrol pump displays.

## For More Authentic Look (Optional)

To get an even more authentic seven-segment LED display:

### Option 1: Install System Font (Recommended)
Install a seven-segment display font on your Raspberry Pi:

```bash
# Install DSEG7 font system-wide (example for Debian/Ubuntu)
sudo mkdir -p /usr/share/fonts/truetype/dseg
cd /tmp
wget https://github.com/keshikan/DSEG/releases/download/v0.46/DSEG-v046.zip
unzip DSEG-v046.zip
sudo cp DSEG-v046/DSEG7Classic-Bold.ttf /usr/share/fonts/truetype/dseg/
sudo fc-cache -f -v
```

Then set the system to use DSEG7 as the default monospace font in your system settings.

### Option 2: Recommended Fonts
- **DSEG7 Classic** - https://github.com/keshikan/DSEG/releases
- **7-Segment Font** - Search for "seven segment display font free"
- Any monospace LED/LCD-style font

## Current Styling

The numbers currently display with:
- 110pt size
- Bold weight
- Monospace font family
- Bright green color (#00FF64)

This creates a clean, digital appearance that's easy to read and looks professional on the 1024x600 touchscreen.

