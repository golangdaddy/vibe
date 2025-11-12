# Toy Petrol Pump Display

A Go program for Raspberry Pi that creates a realistic petrol pump display with litres and currency amount. Features both graphical fullscreen display (on Raspberry Pi) and terminal display (for debugging). Perfect for toy petrol pump projects!

## Features

- 🖥️ **Dual Display Modes:**
  - **Graphical Mode** (Raspberry Pi with GPIO): Fullscreen GUI that looks like a real petrol pump
  - **Terminal Mode** (Debug/Testing): Colored terminal display for development
- 🎨 **Splash Screen** with custom logo on startup
- 📊 Large digital-style numbers for litres and amount
- 🎨 Authentic petrol pump styling (green LCD text on dark background)
- 🔘 Button-controlled pumping (press and hold to increment)
- 💳 **Bootstrap-Style Pay Button** - modern button with shadow, visual feedback on tap
- 🔒 Smart button state - Pay button disables during pumping, enables when stopped
- 👆 Tactile feedback - Button darkens when tapped for immediate visual response
- 💰 Configurable price per litre
- 🔄 Smooth real-time updates (10 times per second)
- 🔧 **Automatic mode detection** - no configuration needed!

## How It Works

The program automatically detects your environment:

- **With GPIO (Raspberry Pi)**: Runs in **graphical mode** with fullscreen display
- **Without GPIO (Laptop)**: Runs in **debug mode** with terminal display

This means you can develop and test on your laptop, then deploy to the Raspberry Pi without changing any code!

## Display Examples

### Graphical Mode (Raspberry Pi)
```
┌────────────────────────────────────────────────────────────┐
│                      DARK BACKGROUND                       │
│                                                            │
│                         PETROL                             │
│                                                            │
│             ──────────────────────────────                 │
│                                                            │
│                        LITRES                              │
│                         12.50                              │
│                           L                                │
│                                                            │
│             ──────────────────────────────                 │
│                                                            │
│                        AMOUNT                              │
│                      £  18.75                              │
│                                                            │
│             ──────────────────────────────                 │
│                                                            │
│                  Rate: £1.50 per litre                     │
│           Press and hold button to pump                    │
│                                                            │
└────────────────────────────────────────────────────────────┘

Fullscreen GUI with 140pt green numbers, amber headers, 
dark background - looks like a real petrol pump!
```

### Terminal Mode (Debug/Laptop)
```
                    🔧 DEBUG MODE 🔧

              ═══════════════════════════════
              ║                               ║
              ║         PETROL PUMP           ║
              ║                               ║
              ═══════════════════════════════

                     LITRES

                    ▓ ▓  ▪  ▓▓▓  ▓▓▓

                        L


              ───────────────────────────────


                     AMOUNT

                      £  ▓ ▓  ▪  ▓▓▓  ▓▓▓


              ───────────────────────────────

               Rate: £1.50 per litre


          [SPACE] Pump  [R] Reset  [Ctrl+C] Exit

Colored terminal display for easy testing on your laptop!
```

## Hardware Requirements

### For Raspberry Pi (Full Setup)
- Raspberry Pi (64-bit) - tested on Pi 3/4/5
- **1024x600 Touchscreen Display** (7" or 10" HDMI/DSI touchscreen)
  - Display is optimized for 1024x600 resolution
  - Works with any size display, but sized perfectly for 1024x600
- Push button connected to GPIO Pin 17 (BCM numbering)
- Button wiring: Connect one side to GPIO Pin 17, other side to Ground (GND)

### For Development/Testing (Laptop)
- Any Linux machine (no special hardware needed!)
- Just a keyboard for testing

## Wiring Diagram

```
Raspberry Pi GPIO
┌─────────────┐
│  GPIO Pin 1 ├─────┐
│             │     │
│         GND ├───┐ │
└─────────────┘   │ │
                  │ │
              ┌───┴─┴───┐
              │ Button  │
              └─────────┘
```

The program uses internal pull-up resistors, so no external resistors are needed.

## Installation

### Prerequisites

**On Raspberry Pi (for graphical mode):**
```bash
# Install required system libraries for GUI
sudo apt-get update
sudo apt-get install -y libgl1-mesa-dev xorg-dev build-essential pkg-config

# Install DSEG7 font for digital display
sudo apt-get install -y fonts-dseg
```

**On Linux laptop (for debug mode):**
```bash
# Install GUI libraries for testing
sudo apt-get install -y libgl1-mesa-dev xorg-dev build-essential pkg-config

# Install DSEG7 font for digital display
sudo apt-get install -y fonts-dseg
```

### Install Go

If you don't have Go installed:

**For Raspberry Pi (ARM64):**
```bash
wget https://go.dev/dl/go1.21.linux-arm64.tar.gz
sudo tar -C /usr/local -xzf go1.21.linux-arm64.tar.gz
export PATH=$PATH:/usr/local/go/bin
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
```

**For Linux laptop (AMD64):**
```bash
wget https://go.dev/dl/go1.21.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
```

### Quick Setup (Recommended)

Use the Makefile for automatic setup:

```bash
cd /path/to/petrol

# One-time setup: install font, configure system, and build
make setup

# Or step by step:
make install-font      # Copy DSEG7 font to project
make setup-fontconfig  # Configure system to use DSEG7
make build            # Build the program
```

### Manual Build

If you prefer manual setup:

```bash
cd /path/to/petrol
go mod download
go build -o petrol-pump
```

### Verify Font Installation

Test that DSEG7 digital font is properly installed:

```bash
make test-font
```

You should see:
```
✓ fonts/digital.ttf exists
✓ DSEG7 is configured correctly!
```

## Usage

### Quick Start

```bash
# Build and run in one command
make run

# Or manually
./petrol-pump
```

### On Raspberry Pi (Graphical Mode)

Run with sudo (required for GPIO access):

```bash
sudo ./petrol-pump

# Or with make
sudo make run
```

The program will:
- Detect GPIO hardware
- Launch fullscreen graphical display
- Wait for button press to increment the pump

**Controls:**
- **Press and hold the button**: Pumps petrol (increments litres and amount)
- **Tap PAY button**: Complete transaction and reset pump (touchscreen)
- **Press R**: Reset the pump to zero (keyboard shortcut)
- **Press ESC**: Exit the program (keyboard shortcut)
- **Ctrl+C**: Exit and display final totals (terminal)

**Pay Button Behavior:**
- Starts **disabled** (gray) when amounts are zero
- **Disables** automatically while pumping is active
- **Enables** (bright green) when pumping stops and there's an amount to pay
- Tap to reset litres and amount to zero

**Display:**
- Normal mode shows a clean interface without control instructions
- Debug mode includes keyboard control hints at the bottom

### On Your Laptop (Terminal Debug Mode)

Just run normally (no sudo needed):

```bash
./petrol-pump
```

The program will:
- Detect NO GPIO hardware
- Launch terminal-based display
- Use keyboard input for testing

**Controls:**
- **Hold SPACE bar**: Pumps petrol (increments litres and amount)
- **Tap PAY button**: Complete transaction and reset pump (on-screen touchscreen button)
- **Press R**: Reset the pump to zero (keyboard shortcut)
- **Press ESC**: Exit the program
- **Ctrl+C**: Exit from terminal

**Display:**
- Debug mode shows control instructions: "Hold SPACE to pump • Press R to reset • ESC to exit"
- The green PAY button appears on screen and works with mouse clicks (simulating touchscreen taps)

## Adding Your Logo

1. Create or obtain a logo image (PNG format recommended)
2. Name it `logo.png`
3. Place it in the `images/` directory
4. The logo will automatically appear on the splash screen when you start the program

**Logo specifications:**
- Format: PNG (transparency supported)
- Recommended size: 400x400 pixels or larger
- The logo is displayed centered on a white background for 3 seconds

If no logo is found, the program displays "PETROL PUMP" text as a placeholder.

## Customization

Edit the constants at the top of `main.go`:

```go
const (
    buttonPin = 17            // GPIO pin number (BCM numbering)
    pricePerLitre = 1.50      // Currency per litre
    incrementRate = 0.01      // Litres added per increment (0.01 L = 10 mL)
    updateInterval = 10ms     // Update frequency (100 times per second)
    splashDuration = 3s       // How long to show splash screen
)
```

### Customize Colors

Edit the color variables for graphical mode:

```go
var (
    displayBg    = color.RGBA{R: 20, G: 20, B: 20, A: 255}      // Dark background
    displayGreen = color.RGBA{R: 0, G: 255, B: 100, A: 255}     // Bright green
    displayAmber = color.RGBA{R: 255, G: 200, B: 0, A: 255}     // Amber/yellow
    displayWhite = color.RGBA{R: 240, G: 240, B: 240, A: 255}   // Off-white
)
```

## Raspberry Pi Setup for Kiosk Mode

To make your petrol pump display automatically start in fullscreen when the Pi boots:

1. **Create a startup script** (`/home/pi/start-pump.sh`):
```bash
#!/bin/bash
cd /home/pi/petrol-pump
sudo ./petrol-pump
```

2. **Make it executable**:
```bash
chmod +x /home/pi/start-pump.sh
```

3. **Add to autostart**:
```bash
mkdir -p ~/.config/autostart
cat > ~/.config/autostart/petrol-pump.desktop << EOF
[Desktop Entry]
Type=Application
Name=Petrol Pump
Exec=/home/pi/start-pump.sh
X-GNOME-Autostart-enabled=true
EOF
```

4. **Optional: Hide cursor** - Edit `/etc/lightdm/lightdm.conf`:
```ini
[Seat:*]
xserver-command=X -nocursor
```

## Troubleshooting

### "Error opening GPIO" or goes to debug mode unexpectedly
- Make sure you're running with `sudo` on Raspberry Pi
- Verify you're on a Raspberry Pi with GPIO support
- **This is NORMAL on a laptop** - it will use terminal mode for testing

### Button not responding (Raspberry Pi)
- Check your wiring: GPIO Pin 1 to button, button to GND
- Verify you're using BCM pin numbering (not physical pin numbers)
- Try a different GPIO pin and update `buttonPin` in the code
- Test with a multimeter to verify the button is working

### Keyboard not responding (Debug Mode)
- Make sure the terminal window has focus (click on it)
- Hold the SPACE bar down (don't just tap it)
- Try pressing and releasing 'R' to reset and test

### Graphical display not showing on Raspberry Pi
- Make sure you installed the required libraries: `sudo apt-get install libgl1-mesa-dev xorg-dev`
- Ensure you're running in a graphical environment (not headless)
- Try: `echo $DISPLAY` - should output `:0` or similar
- Make sure X11 is running: `ps aux | grep X`

### Build errors about missing libraries (on Raspberry Pi)
- Install required system libraries: `sudo apt-get install libgl1-mesa-dev xorg-dev build-essential pkg-config`
- Run `go mod download` to fetch Go dependencies
- Make sure you have GCC installed: `sudo apt-get install build-essential`

### Terminal display looks garbled (Debug mode)
- Make sure your terminal supports UTF-8 and ANSI colors
- Try a different terminal emulator
- Maximize the terminal window for best results

## GPIO Pin Reference

This project uses BCM (Broadcom) GPIO numbering:
- **GPIO Pin 1** (not physical pin 1) is used by default
- Physical pin locations vary by Pi model
- Use `gpio readall` or `pinout` command to see pin mappings on your Pi

## Makefile Commands

The project includes a comprehensive Makefile for easy setup and building:

```bash
make              # Install font and build program
make setup        # Full setup (font + fontconfig + build)
make build        # Build the program
make run          # Build and run the program
make install-font # Install DSEG7 font to project
make setup-fontconfig # Configure system to use DSEG7
make test-font    # Test font configuration
make clean        # Remove build artifacts
make clean-all    # Remove build artifacts and font
make help         # Show help message
```

**Most useful commands:**
- `make setup` - First time setup
- `make run` - Build and run
- `make test-font` - Verify font is working

## Development Workflow

1. **Develop on your laptop** using debug mode:
   ```bash
   make run  # Test with SPACE bar
   ```

2. **Transfer to Raspberry Pi** when ready:
   ```bash
   scp petrol-pump pi@raspberrypi.local:~/
   scp -r fonts pi@raspberrypi.local:~/
   ```

3. **Run on Raspberry Pi** with graphical display:
   ```bash
   ssh pi@raspberrypi.local
   sudo ./petrol-pump  # Uses button and GUI
   ```

No code changes needed - it automatically detects the environment!

## Tips for Toy Petrol Pump Projects

- **Recommended touchscreen:** 7" 1024x600 HDMI touchscreen (perfect size and resolution!)
- Mount the Raspberry Pi inside your toy pump casing
- Use a large arcade-style button (easier for kids to press)
- Add sound effects with a speaker or buzzer
- Add LED strips around the display for extra effect
- 3D print a custom enclosure
- The PAY button is sized perfectly for small fingers on a touchscreen
- Add a physical "nozzle" prop connected to another GPIO pin
- Consider adding a "receipt printer" using thermal printer
- Mount the touchscreen behind clear acrylic for protection

## Technical Details

### Display Specifications (Graphical Mode)
- **Optimized for:** 1024x600 touchscreen displays
- **Font style:** Digital alarm clock appearance with bold monospace
  - Numbers: 110pt bold monospace in bright green (#00FF64)
  - DSEG7 Classic font installed in `fonts/digital.ttf`
  - Optimized for readability at a distance
  - Similar to petrol pump and alarm clock displays
- **Layout:** Clean design - values and units on same line, no subheadings
- **Pay button:** 400x75 pixels Bootstrap-style with shadow effect and 42pt text
  - Green (#28C850) when enabled, Gray (#6C757D) when disabled
  - Darkens when tapped for visual feedback
  - 4px shadow offset for depth
- **Color scheme:** Dark background (#141414) with bright green digits
- **Update rate:** 10 times per second (10ms refresh)
- **Resolution:** Works on any resolution, optimized for 1024x600

### Display Specifications (Terminal Mode)
- **Colors:** 24-bit RGB ANSI escape sequences
- **Font:** Uses terminal's default font with Unicode block characters
- **Layout:** Centered for 80-column terminals
- **Update rate:** 10 times per second (100ms refresh)

## License

Free to use for educational and hobby projects!

## Acknowledgments

- Built with [Fyne](https://fyne.io/) - Cross-platform GUI toolkit for Go
- GPIO control via [go-rpio](https://github.com/stianeikeland/go-rpio)
