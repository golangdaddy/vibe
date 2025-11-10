# Toy Petrol Pump Display

A Go program for Raspberry Pi that creates a realistic fullscreen petrol pump display with litres and currency amount. Perfect for toy petrol pump projects!

## Features

- 🖥️ **Fullscreen graphical display** that looks like a real petrol pump
- 📊 Large digital-style numbers with authentic petrol pump styling
- 🎨 Green LCD-style display on dark background (classic petrol pump aesthetic)
- 🔘 Button-controlled pumping (press and hold to increment)
- 💰 Configurable price per litre
- 🔄 Smooth real-time updates
- 🔧 **Debug mode** for development on laptops without GPIO

## Display Preview

The fullscreen display looks like a real petrol pump with:
- **Large digital numbers** (120pt) for litres and amount - easy to read from a distance
- **Bright green LCD-style text** on dark background (authentic petrol pump aesthetic)
- **Amber section headers** (LITRES and AMOUNT)
- **Clean, professional layout** with separator lines
- **Fullscreen immersive experience** - no window borders or distractions

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
│                                                            │
│           Press and hold button to pump                    │
│                                                            │
└────────────────────────────────────────────────────────────┘

Colors: Dark background (#141414), Bright Green text (#00FF64),
        Amber headers (#FFC800), White accents (#F0F0F0)
```

## Hardware Requirements

- Raspberry Pi (64-bit) - tested on Pi 3/4/5
- Display (HDMI monitor or official touchscreen)
- Push button connected to GPIO Pin 1 (BCM numbering)
- Button wiring: Connect one side to GPIO Pin 1, other side to Ground (GND)

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

**Check your system first:**
```bash
# Run the dependency checker script
./check-deps.sh
```

**On Raspberry Pi:**
```bash
# Install required system libraries for GUI
sudo apt-get update
sudo apt-get install -y libgl1-mesa-dev xorg-dev build-essential pkg-config
```

**On Linux laptop (for development):**
```bash
# Install required system libraries
sudo apt-get install -y libgl1-mesa-dev xorg-dev build-essential pkg-config
```

**Note:** The GUI requires OpenGL and X11 libraries. If you're on a headless system or don't want to install GUI dependencies, this program won't work without a display server.

### Install Go

If you don't have Go installed:
```bash
# For Raspberry Pi (ARM64)
wget https://go.dev/dl/go1.21.linux-arm64.tar.gz
sudo tar -C /usr/local -xzf go1.21.linux-arm64.tar.gz

# For Linux laptop (AMD64)
wget https://go.dev/dl/go1.21.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.linux-amd64.tar.gz

# Add to PATH
export PATH=$PATH:/usr/local/go/bin
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
```

### Build the Program

1. **Clone or copy this project**

2. **Install dependencies**:
```bash
cd /path/to/petrol
go mod download
```

3. **Build the program**:
```bash
go build -o petrol-pump
```

## Usage

### On Raspberry Pi

Run the program with sudo (required for GPIO access):

```bash
sudo ./petrol-pump
```

The display will open in fullscreen mode. Connect your display to the Raspberry Pi and it will look like a real petrol pump!

### On Your Laptop (Debug Mode)

The program automatically detects if GPIO is unavailable and runs in debug mode:

```bash
./petrol-pump
```

In debug mode, the display shows "DEBUG MODE" in red and uses keyboard controls.

### Controls

**On Raspberry Pi (Normal Mode):**
- **Press and hold the button**: Pumps petrol (increments litres and amount)
- **Ctrl+C**: Exit and display final totals

**In Debug Mode (Laptop):**
- **Hold SPACE bar**: Pumps petrol (increments litres and amount)
- **Press 'R'**: Reset the pump to zero
- **ESC or Ctrl+C**: Exit the program

### Customization

Edit the constants at the top of `main.go` to customize:

```go
const (
    buttonPin = 1             // GPIO pin number (BCM numbering)
    pricePerLitre = 1.50      // Currency per litre
    incrementRate = 0.1       // Litres added per increment
    updateInterval = 100ms    // Update frequency (10 times per second)
)
```

You can also customize the colors by editing the color variables:
```go
var (
    displayBg    = color.RGBA{R: 20, G: 20, B: 20, A: 255}      // Dark background
    displayGreen = color.RGBA{R: 0, G: 255, B: 100, A: 255}     // Bright green
    displayAmber = color.RGBA{R: 255, G: 200, B: 0, A: 255}     // Amber/yellow
    // ...
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

### "Error opening GPIO"
- Make sure you're running with `sudo` on Raspberry Pi
- Verify you're on a Raspberry Pi with GPIO support
- **OR** - The program will automatically enter debug mode for testing on laptops

### Button not responding (Raspberry Pi)
- Check your wiring: GPIO Pin 1 to button, button to GND
- Verify you're using BCM pin numbering (not physical pin numbers)
- Try a different GPIO pin and update `buttonPin` in the code

### Keyboard not responding (Debug Mode)
- Make sure the display window has focus (click on it)
- Press and hold SPACE bar firmly
- The window must be active to receive keyboard input

### Display window is black or not showing
- Make sure you have the required graphics libraries installed
- Try running in a graphical environment (not just terminal)
- Check that X11 or Wayland is running: `echo $DISPLAY`

### "cannot open display" error
- Make sure you're running in a graphical environment
- On Raspberry Pi, make sure you're in the desktop environment
- Try: `export DISPLAY=:0` before running

### Build errors about missing libraries
- Install required system libraries (see Prerequisites above)
- Run `go mod download` to fetch Go dependencies

## Debug Mode

Debug mode is automatically activated when GPIO hardware is not detected (like on a laptop). This allows you to:
- Test and refine the display without a Raspberry Pi
- Use keyboard input (SPACE bar) to simulate button presses
- Develop and iterate on the UI quickly
- Test the fullscreen display on your development machine

The display will show "DEBUG MODE" in red at the top when running in this mode.

## GPIO Pin Reference

This project uses BCM (Broadcom) GPIO numbering:
- **GPIO Pin 1** (not physical pin 1) is used by default
- Physical pin locations vary by Pi model
- Use `gpio readall` command to see pin mappings on your Pi

## Tips for Toy Petrol Pump Projects

- **Use a larger monitor** for more impressive display (even an old TV works great!)
- Mount the Raspberry Pi inside your toy pump casing
- Use a large arcade-style button for easier pressing by kids
- Add sound effects with a speaker (buzzer or USB speaker)
- Add LED indicators around the display for extra flair
- 3D print a custom enclosure to mount the display and button
- Use the official Raspberry Pi touchscreen for a compact all-in-one solution
- Consider adding a physical "nozzle" prop that must be "lifted" before pumping works

## Display Specifications

The graphical display uses:
- **Font sizes:** 120pt for main numbers, 48pt for titles, 36pt for labels
- **Color scheme:** Dark background (#141414) with bright green (#00FF64) digits
- **Layout:** Centered fullscreen with vertical organization
- **Update rate:** 10 times per second (100ms refresh)
- **Resolution:** Adapts to any screen size/resolution

## License

Free to use for educational and hobby projects!

## Acknowledgments

- Built with [Fyne](https://fyne.io/) - Cross-platform GUI toolkit for Go
- GPIO control via [go-rpio](https://github.com/stianeikeland/go-rpio)
