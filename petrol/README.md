# Toy Petrol Pump Display

A Go program for Raspberry Pi that creates a realistic petrol pump display with litres and currency amount. Features both graphical fullscreen display (on Raspberry Pi) and terminal display (for debugging). Perfect for toy petrol pump projects!

## Features

- 🖥️ **Dual Display Modes:**
  - **Graphical Mode** (Raspberry Pi with GPIO): Fullscreen GUI that looks like a real petrol pump
  - **Terminal Mode** (Debug/Testing): Colored terminal display for development
- 📊 Large digital-style numbers for litres and amount
- 🎨 Authentic petrol pump styling (green LCD text on dark background)
- 🔘 Button-controlled pumping (press and hold to increment)
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
│                      $  18.75                              │
│                                                            │
│             ──────────────────────────────                 │
│                                                            │
│                  Rate: $1.50 per litre                     │
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

                      $  ▓ ▓  ▪  ▓▓▓  ▓▓▓


              ───────────────────────────────

               Rate: $1.50 per litre


          [SPACE] Pump  [R] Reset  [Ctrl+C] Exit

Colored terminal display for easy testing on your laptop!
```

## Hardware Requirements

### For Raspberry Pi (Full Setup)
- Raspberry Pi (64-bit) - tested on Pi 3/4/5
- Display (HDMI monitor or official touchscreen)
- Push button connected to GPIO Pin 1 (BCM numbering)
- Button wiring: Connect one side to GPIO Pin 1, other side to Ground (GND)

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
```

**On Linux laptop (for terminal debug mode):**
```bash
# No special dependencies needed! Just Go.
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

### Build the Program

```bash
cd /path/to/petrol
go mod download
go build -o petrol-pump
```

## Usage

### On Raspberry Pi (Graphical Mode)

Run with sudo (required for GPIO access):

```bash
sudo ./petrol-pump
```

The program will:
- Detect GPIO hardware
- Launch fullscreen graphical display
- Wait for button press to increment the pump

**Controls:**
- **Press and hold the button**: Pumps petrol (increments litres and amount)
- **Press R**: Reset the pump to zero (keyboard shortcut)
- **Press ESC**: Exit the program (keyboard shortcut)
- **Ctrl+C**: Exit and display final totals (terminal)

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
- **Press R**: Reset the pump to zero
- **Press ESC**: Exit the program
- **Ctrl+C**: Exit from terminal

## Customization

Edit the constants at the top of `main.go`:

```go
const (
    buttonPin = 1             // GPIO pin number (BCM numbering)
    pricePerLitre = 1.50      // Currency per litre
    incrementRate = 0.1       // Litres added per increment (0.1 L = 100 mL)
    updateInterval = 100ms    // Update frequency (10 times per second)
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

## Development Workflow

1. **Develop on your laptop** using terminal debug mode:
   ```bash
   ./petrol-pump  # Test with SPACE bar
   ```

2. **Transfer to Raspberry Pi** when ready:
   ```bash
   scp petrol-pump pi@raspberrypi.local:~/
   ```

3. **Run on Raspberry Pi** with graphical display:
   ```bash
   ssh pi@raspberrypi.local
   sudo ./petrol-pump  # Uses button and GUI
   ```

No code changes needed - it automatically detects the environment!

## Tips for Toy Petrol Pump Projects

- **Display size matters!** Use a larger monitor (even an old TV) for more impressive effect
- Mount the Raspberry Pi inside your toy pump casing
- Use a large arcade-style button (easier for kids to press)
- Add sound effects with a speaker or buzzer
- Add LED strips around the display for extra effect
- 3D print a custom enclosure
- Use the official Raspberry Pi touchscreen for compact all-in-one
- Add a physical "nozzle" prop connected to another GPIO pin
- Consider adding a "receipt printer" using thermal printer

## Technical Details

### Display Specifications (Graphical Mode)
- **Font sizes:** 140pt for main numbers, 56pt for title, 42pt for headers
- **Color scheme:** Dark background (#141414) with bright green (#00FF64) digits
- **Layout:** Fullscreen centered with vertical organization
- **Update rate:** 10 times per second (100ms refresh)
- **Resolution:** Adapts to any screen size/resolution automatically

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
