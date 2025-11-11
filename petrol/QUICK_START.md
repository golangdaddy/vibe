# Quick Start Guide

## First Time Setup

```bash
# Install system dependencies
sudo apt-get update
sudo apt-get install -y libgl1-mesa-dev xorg-dev build-essential pkg-config fonts-dseg

# One command to set everything up
make setup
```

This will:
- ✓ Copy DSEG7 digital font to `fonts/digital.ttf`
- ✓ Configure system to use DSEG7 as monospace font
- ✓ Update font cache
- ✓ Build the program

## Running the Program

```bash
# On development laptop (debug mode)
make run

# On Raspberry Pi (normal mode)
sudo make run
```

## Verify Everything Works

```bash
make test-font
```

Should show:
```
✓ fonts/digital.ttf exists
✓ DSEG7 is configured correctly!
```

## Common Commands

```bash
make              # Install font and build
make setup        # Full first-time setup
make build        # Just build
make run          # Build and run
make test-font    # Verify font setup
make clean        # Clean build artifacts
make help         # Show all commands
```

## Controls

### Debug Mode (Laptop)
- **Hold SPACE**: Pump petrol
- **Press R**: Reset amounts
- **Press ESC**: Exit
- **Click PAY**: Complete transaction (on-screen button)

### Normal Mode (Raspberry Pi)
- **Hold Button (GPIO 17)**: Pump petrol
- **Tap PAY**: Complete transaction (touchscreen)
- **Press R**: Reset amounts
- **Press ESC**: Exit

## Display

Numbers appear in **DSEG7 Classic** font - the authentic seven-segment LED style used in:
- ⏰ Digital alarm clocks
- ⛽ Real petrol pumps
- 🔢 Digital displays and meters

## Troubleshooting

**Font not appearing?**
```bash
make setup-fontconfig
fc-cache -f -v
```

**Build errors?**
```bash
sudo apt-get install -y libgl1-mesa-dev xorg-dev build-essential pkg-config
make clean
make build
```

**GPIO not working?**
- Run with `sudo` on Raspberry Pi
- Check button is connected to GPIO Pin 17 and GND

## Files

- `Makefile` - Build automation
- `main.go` - Main program
- `fonts/digital.ttf` - DSEG7 digital font
- `images/logo.png` - Your custom logo (optional)
- `petrol-pump` - Compiled program

## Next Steps

1. Add your logo to `images/logo.png`
2. Adjust colors in `main.go` (see README)
3. Change pin number if needed (default: GPIO 17)
4. Set up kiosk mode for auto-start (see README)

