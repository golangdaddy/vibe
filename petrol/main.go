package main

import (
	"fmt"
	"image/color"
	"os"
	"os/signal"
	"syscall"
	"time"
	"unsafe"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/layout"
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

	// Colors for petrol pump display
	displayBg    = color.RGBA{R: 20, G: 20, B: 20, A: 255}
	displayGreen = color.RGBA{R: 0, G: 255, B: 100, A: 255}
	displayAmber = color.RGBA{R: 255, G: 200, B: 0, A: 255}
	displayWhite = color.RGBA{R: 240, G: 240, B: 240, A: 255}
	displayRed   = color.RGBA{R: 255, G: 50, B: 50, A: 255}
)

type PetrolPump struct {
	litres      float64
	amount      float64
	button      rpio.Pin
	litresLabel *canvas.Text
	amountLabel *canvas.Text
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
	p.updateGUIDisplay()
}

func (p *PetrolPump) reset() {
	p.litres = 0.0
	p.amount = 0.0
	p.updateGUIDisplay()
}

func (p *PetrolPump) updateGUIDisplay() {
	if p.litresLabel != nil {
		p.litresLabel.Text = fmt.Sprintf("%.2f", p.litres)
		p.litresLabel.Refresh()
	}
	if p.amountLabel != nil {
		p.amountLabel.Text = fmt.Sprintf("%.2f", p.amount)
		p.amountLabel.Refresh()
	}
}

func (p *PetrolPump) createGUIDisplay(a fyne.App) fyne.Window {
	w := a.NewWindow("Petrol Pump Display")
	w.SetFullScreen(true)

	// Create background
	bg := canvas.NewRectangle(displayBg)

	// Title/Brand
	title := canvas.NewText("PETROL", displayWhite)
	title.TextSize = 56
	title.Alignment = fyne.TextAlignCenter
	title.TextStyle = fyne.TextStyle{Bold: true}

	// Debug mode indicator (if in debug mode)
	var modeIndicator *canvas.Text
	if debugMode {
		modeIndicator = canvas.NewText("🔧 DEBUG MODE 🔧", displayRed)
		modeIndicator.TextSize = 28
		modeIndicator.Alignment = fyne.TextAlignCenter
		modeIndicator.TextStyle = fyne.TextStyle{Bold: true}
	}

	// LITRES section
	litresHeader := canvas.NewText("LITRES", displayAmber)
	litresHeader.TextSize = 42
	litresHeader.Alignment = fyne.TextAlignCenter
	litresHeader.TextStyle = fyne.TextStyle{Bold: true}

	p.litresLabel = canvas.NewText("0.00", displayGreen)
	p.litresLabel.TextSize = 140
	p.litresLabel.Alignment = fyne.TextAlignCenter
	p.litresLabel.TextStyle = fyne.TextStyle{Bold: true, Monospace: true}

	litresUnit := canvas.NewText("L", displayWhite)
	litresUnit.TextSize = 52
	litresUnit.Alignment = fyne.TextAlignCenter
	litresUnit.TextStyle = fyne.TextStyle{Bold: true}

	// AMOUNT section
	amountHeader := canvas.NewText("AMOUNT", displayAmber)
	amountHeader.TextSize = 42
	amountHeader.Alignment = fyne.TextAlignCenter
	amountHeader.TextStyle = fyne.TextStyle{Bold: true}

	currencySymbol := canvas.NewText("$", displayGreen)
	currencySymbol.TextSize = 90
	currencySymbol.Alignment = fyne.TextAlignCenter
	currencySymbol.TextStyle = fyne.TextStyle{Bold: true}

	p.amountLabel = canvas.NewText("0.00", displayGreen)
	p.amountLabel.TextSize = 140
	p.amountLabel.Alignment = fyne.TextAlignCenter
	p.amountLabel.TextStyle = fyne.TextStyle{Bold: true, Monospace: true}

	// Price per litre indicator
	priceInfo := canvas.NewText(fmt.Sprintf("Rate: $%.2f per litre", pricePerLitre), displayWhite)
	priceInfo.TextSize = 32
	priceInfo.Alignment = fyne.TextAlignCenter

	// Status text
	var statusText string
	if debugMode {
		statusText = "Hold SPACE to pump • Press R to reset • ESC to exit"
	} else {
		statusText = "Press and hold button to pump"
	}
	statusLabel := canvas.NewText(statusText, displayWhite)
	statusLabel.TextSize = 28
	statusLabel.Alignment = fyne.TextAlignCenter

	// Decorative separator lines
	line1 := canvas.NewRectangle(displayGreen)
	line1.SetMinSize(fyne.NewSize(700, 5))
	line2 := canvas.NewRectangle(displayGreen)
	line2.SetMinSize(fyne.NewSize(700, 5))
	line3 := canvas.NewRectangle(displayGreen)
	line3.SetMinSize(fyne.NewSize(700, 5))

	// Build layout
	var content *fyne.Container
	if debugMode {
		content = container.New(layout.NewVBoxLayout(),
			layout.NewSpacer(),
			container.NewCenter(title),
			container.NewCenter(modeIndicator),
			layout.NewSpacer(),
			container.NewCenter(line1),
			layout.NewSpacer(),
			container.NewCenter(litresHeader),
			container.NewCenter(p.litresLabel),
			container.NewCenter(litresUnit),
			layout.NewSpacer(),
			container.NewCenter(line2),
			layout.NewSpacer(),
			container.NewCenter(amountHeader),
			container.NewCenter(
				container.NewHBox(
					currencySymbol,
					p.amountLabel,
				),
			),
			layout.NewSpacer(),
			container.NewCenter(line3),
			layout.NewSpacer(),
			container.NewCenter(priceInfo),
			layout.NewSpacer(),
			container.NewCenter(statusLabel),
			layout.NewSpacer(),
		)
	} else {
		content = container.New(layout.NewVBoxLayout(),
			layout.NewSpacer(),
			container.NewCenter(title),
			layout.NewSpacer(),
			container.NewCenter(line1),
			layout.NewSpacer(),
			container.NewCenter(litresHeader),
			container.NewCenter(p.litresLabel),
			container.NewCenter(litresUnit),
			layout.NewSpacer(),
			container.NewCenter(line2),
			layout.NewSpacer(),
			container.NewCenter(amountHeader),
			container.NewCenter(
				container.NewHBox(
					currencySymbol,
					p.amountLabel,
				),
			),
			layout.NewSpacer(),
			container.NewCenter(line3),
			layout.NewSpacer(),
			container.NewCenter(priceInfo),
			layout.NewSpacer(),
			container.NewCenter(statusLabel),
			layout.NewSpacer(),
		)
	}

	// Stack background and content
	w.SetContent(container.NewStack(bg, content))

	// Handle keyboard in debug mode
	if debugMode {
		w.Canvas().SetOnTypedKey(func(key *fyne.KeyEvent) {
			switch key.Name {
			case fyne.KeySpace:
				keyPressed = true
			case fyne.KeyR:
				p.reset()
				keyPressed = false
			case fyne.KeyEscape:
				fmt.Printf("\nFinal totals:\n")
				fmt.Printf("  Litres: %.2f L\n", p.litres)
				fmt.Printf("  Amount: $%.2f\n", p.amount)
				a.Quit()
			}
		})
	}

	return w
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
		// GPIO not available - enter debug mode with GRAPHICAL display
		debugMode = true
		fmt.Println("╔════════════════════════════════════╗")
		fmt.Println("║   🔧 DEBUG MODE ACTIVATED 🔧      ║")
		fmt.Println("╠════════════════════════════════════╣")
		fmt.Println("║  GPIO not available - using        ║")
		fmt.Println("║  GRAPHICAL display with keyboard   ║")
		fmt.Println("║                                    ║")
		fmt.Println("║  Hold SPACE to pump petrol         ║")
		fmt.Println("║  Press R to reset                  ║")
		fmt.Println("║  Press ESC to exit                 ║")
		fmt.Println("║                                    ║")
		fmt.Println("║  Starting in 2 seconds...          ║")
		fmt.Println("╚════════════════════════════════════╝")
		time.Sleep(2 * time.Second)
	} else {
		// GPIO available - normal mode with graphical display
		defer rpio.Close()
		button = rpio.Pin(buttonPin)
		button.Input()
		button.PullUp()
		fmt.Println("✓ GPIO initialized - Running in normal mode")
		fmt.Println("  Press and hold the button to pump")
		time.Sleep(1 * time.Second)
	}

	// Run graphical mode
	runGraphicalMode(button)
}

func runGraphicalMode(button rpio.Pin) {
	pump := NewPetrolPump()
	pump.button = button

	// Create GUI application
	myApp := app.New()
	window := pump.createGUIDisplay(myApp)

	// Setup signal handling
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigChan
		fmt.Printf("\nFinal totals:\n")
		fmt.Printf("  Litres: %.2f L\n", pump.litres)
		fmt.Printf("  Amount: $%.2f\n", pump.amount)
		myApp.Quit()
	}()

	// Start pump monitoring in background
	go func() {
		ticker := time.NewTicker(updateInterval)
		defer ticker.Stop()

		for {
			<-ticker.C
			var buttonPressed bool

			if debugMode {
				// Debug mode: use keyboard (handled by Fyne event handlers)
				buttonPressed = keyPressed
			} else {
				// Normal mode: use GPIO
				buttonPressed = button.Read() == rpio.Low
			}

			if buttonPressed {
				pump.increment()
			}
		}
	}()

	window.ShowAndRun()
}
