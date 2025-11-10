package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"
	"unsafe"

	"github.com/stianeikeland/go-rpio/v4"
)

const (
	// GPIO pin for button (BCM numbering)
	buttonPin = 1

	// Pump settings
	pricePerLitre  = 1.50                   // Currency per litre
	incrementRate  = 0.1                    // Litres added per increment
	updateInterval = 100 * time.Millisecond // How often to check button and update display
)

var (
	debugMode  = false
	keyPressed = false
)

type PetrolPump struct {
	litres float64
	amount float64
	button rpio.Pin
}

func NewPetrolPump() *PetrolPump {
	return &PetrolPump{
		litres: 0.0,
		amount: 0.0,
	}
}

func (p *PetrolPump) increment() {
	p.litres += incrementRate
	p.amount = p.litres * pricePerLitre
}

func (p *PetrolPump) reset() {
	p.litres = 0.0
	p.amount = 0.0
}

func (p *PetrolPump) display() {
	// Clear screen and move cursor to top
	fmt.Print("\033[2J\033[H")

	// Colors
	green := "\033[38;2;0;255;100m"   // Bright green
	amber := "\033[38;2;255;200;0m"   // Amber/yellow
	white := "\033[38;2;240;240;240m" // Off-white
	red := "\033[38;2;255;50;50m"     // Red for debug
	bold := "\033[1m"
	reset := "\033[0m"
	dim := "\033[2m"

	// Calculate centered positions for terminal width
	litresStr := fmt.Sprintf("%.2f", p.litres)
	amountStr := fmt.Sprintf("%.2f", p.amount)

	// Print display with spacing for fullscreen effect
	fmt.Println()
	fmt.Println()
	fmt.Println()

	// Title
	if debugMode {
		fmt.Printf("                    %s%s🔧 DEBUG MODE 🔧%s\n", red, bold, reset)
		fmt.Println()
	}
	fmt.Printf("              %s%s═══════════════════════════════%s\n", white, bold, reset)
	fmt.Printf("              %s%s║                               ║%s\n", white, bold, reset)
	fmt.Printf("              %s%s║         PETROL PUMP           ║%s\n", white, bold, reset)
	fmt.Printf("              %s%s║                               ║%s\n", white, bold, reset)
	fmt.Printf("              %s%s═══════════════════════════════%s\n", white, bold, reset)
	fmt.Println()
	fmt.Println()

	// LITRES section with large numbers
	fmt.Printf("                     %s%sLITRES%s\n", amber, bold, reset)
	fmt.Println()

	// Large number display for litres
	printLargeNumber(litresStr, green, bold, reset)
	fmt.Println()
	fmt.Printf("                        %s%sL%s\n", white, bold, reset)
	fmt.Println()
	fmt.Println()

	// Separator
	fmt.Printf("              %s%s───────────────────────────────%s\n", green, bold, reset)
	fmt.Println()
	fmt.Println()

	// AMOUNT section with large numbers
	fmt.Printf("                     %s%sAMOUNT%s\n", amber, bold, reset)
	fmt.Println()

	// Large number display for amount
	fmt.Printf("                      %s%s$%s ", green, bold, reset)
	printLargeNumber(amountStr, green, bold, reset)
	fmt.Println()
	fmt.Println()

	// Separator
	fmt.Printf("              %s%s───────────────────────────────%s\n", green, bold, reset)
	fmt.Println()
	fmt.Println()

	// Info
	fmt.Printf("               %sRate: $%.2f per litre%s\n", dim, pricePerLitre, reset)
	fmt.Println()
	fmt.Println()

	// Instructions
	if debugMode {
		fmt.Printf("          %s[SPACE] Pump  [R] Reset  [Ctrl+C] Exit%s\n", white, reset)
	} else {
		fmt.Printf("            %sPress and hold button to pump%s\n", white, reset)
	}
	fmt.Println()
	fmt.Println()
}

func printLargeNumber(numStr string, colorCode string, bold string, reset string) {
	// Print large-style numbers using ASCII art (simplified single-line version)
	fmt.Printf("                   %s%s%s%s\n", colorCode, bold, scaledNumber(numStr), reset)
}

func scaledNumber(s string) string {
	// Simple large display - use Unicode box-drawing and spacing for visual impact
	result := ""
	for _, ch := range s {
		switch ch {
		case '0':
			result += " ▓▓▓  "
		case '1':
			result += "  ▓  "
		case '2':
			result += " ▓▓▓  "
		case '3':
			result += " ▓▓▓  "
		case '4':
			result += " ▓ ▓  "
		case '5':
			result += " ▓▓▓  "
		case '6':
			result += " ▓▓▓  "
		case '7':
			result += " ▓▓▓  "
		case '8':
			result += " ▓▓▓  "
		case '9':
			result += " ▓▓▓  "
		case '.':
			result += " ▪ "
		default:
			result += string(ch)
		}
	}
	return result
}

// readKeyAsync continuously reads keyboard input in debug mode
func readKeyAsync(pump *PetrolPump) {
	// Set terminal to raw mode for immediate key detection
	oldState := setRawMode()
	if oldState != nil {
		defer restoreMode(oldState)
	}

	buf := make([]byte, 1)
	for {
		n, err := os.Stdin.Read(buf)
		if err != nil || n == 0 {
			time.Sleep(10 * time.Millisecond)
			continue
		}

		switch buf[0] {
		case ' ': // Space bar - set flag for main loop
			keyPressed = true
		case 'r', 'R': // Reset
			pump.reset()
			keyPressed = false
		case 3: // Ctrl+C
			fmt.Println("\n\nShutting down...")
			fmt.Printf("Final totals:\n")
			fmt.Printf("  Litres: %.2f L\n", pump.litres)
			fmt.Printf("  Amount: $%.2f\n", pump.amount)
			os.Exit(0)
		case 27: // ESC
			fmt.Println("\n\nShutting down...")
			fmt.Printf("Final totals:\n")
			fmt.Printf("  Litres: %.2f L\n", pump.litres)
			fmt.Printf("  Amount: $%.2f\n", pump.amount)
			os.Exit(0)
		default:
			// Release key when any other key is pressed
			if buf[0] != ' ' {
				keyPressed = false
			}
		}
	}
}

func setRawMode() *syscall.Termios {
	var oldState syscall.Termios
	if _, _, err := syscall.Syscall(syscall.SYS_IOCTL, uintptr(syscall.Stdin), syscall.TCGETS, uintptr(unsafe.Pointer(&oldState))); err != 0 {
		return nil
	}

	newState := oldState
	newState.Lflag &^= syscall.ICANON | syscall.ECHO
	newState.Cc[syscall.VMIN] = 1
	newState.Cc[syscall.VTIME] = 0

	if _, _, err := syscall.Syscall(syscall.SYS_IOCTL, uintptr(syscall.Stdin), syscall.TCSETS, uintptr(unsafe.Pointer(&newState))); err != 0 {
		return nil
	}

	return &oldState
}

func restoreMode(oldState *syscall.Termios) {
	if oldState != nil {
		syscall.Syscall(syscall.SYS_IOCTL, uintptr(syscall.Stdin), syscall.TCSETS, uintptr(unsafe.Pointer(oldState)))
	}
}

func main() {
	var button rpio.Pin

	// Try to initialize GPIO
	err := rpio.Open()
	if err != nil {
		// GPIO not available - enter debug mode
		debugMode = true
		fmt.Println("╔════════════════════════════════════╗")
		fmt.Println("║   🔧 DEBUG MODE ACTIVATED 🔧      ║")
		fmt.Println("╠════════════════════════════════════╣")
		fmt.Println("║  GPIO not available - using        ║")
		fmt.Println("║  keyboard input for testing        ║")
		fmt.Println("║                                    ║")
		fmt.Println("║  Hold SPACE to pump petrol         ║")
		fmt.Println("║  Press R to reset                  ║")
		fmt.Println("║  Press Ctrl+C to exit              ║")
		fmt.Println("║                                    ║")
		fmt.Println("║  Starting in 2 seconds...          ║")
		fmt.Println("╚════════════════════════════════════╝")
		time.Sleep(2 * time.Second)
	} else {
		// GPIO available - normal mode
		defer rpio.Close()
		button = rpio.Pin(buttonPin)
		button.Input()
		button.PullUp() // Use pull-up resistor, button should connect to ground
		fmt.Println("✓ GPIO initialized - Running in normal mode")
		fmt.Println("  Press and hold the button to pump")
		time.Sleep(1 * time.Second)
	}

	// Create pump instance
	pump := NewPetrolPump()

	// Setup signal handling for clean exit
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigChan
		// Restore terminal
		fmt.Print("\033[0m\033[2J\033[H")
		fmt.Println("\n\nShutting down...")
		fmt.Printf("Final totals:\n")
		fmt.Printf("  Litres: %.2f L\n", pump.litres)
		fmt.Printf("  Amount: $%.2f\n", pump.amount)
		os.Exit(0)
	}()

	// Start keyboard reader in debug mode
	if debugMode {
		go readKeyAsync(pump)
	}

	// Create ticker for regular updates
	ticker := time.NewTicker(updateInterval)
	defer ticker.Stop()

	// Initial display
	pump.display()

	// Track if button was just released
	lastPressed := false

	// Main loop
	for {
		select {
		case <-ticker.C:
			var buttonPressed bool

			if debugMode {
				// Debug mode: use keyboard
				buttonPressed = keyPressed
			} else {
				// Normal mode: use GPIO
				buttonPressed = button.Read() == rpio.Low
			}

			// Update display when button is pressed
			if buttonPressed {
				pump.increment()
				pump.display()
				lastPressed = true
			} else if lastPressed {
				// Button was just released, refresh display once
				pump.display()
				lastPressed = false
			}
		}
	}
}
