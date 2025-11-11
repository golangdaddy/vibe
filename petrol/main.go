package main

import (
	"fmt"
	"image/color"
	"os"
	"os/signal"
	"syscall"
	"time"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/layout"
	"github.com/stianeikeland/go-rpio/v4"
)

const (
	// GPIO pin 17 for button (BCM numbering)
	buttonPin = 17

	// Pump settings
	pricePerLitre  = 1.50                  // Currency per litre
	incrementRate  = 0.01                  // Litres added per increment
	updateInterval = 10 * time.Millisecond // How often to check button and update display

	// Splash screen settings
	splashDuration = 3 * time.Second // How long to show splash screen
	logoPath       = "images/logo.png"
)

var (
	debugMode        = false
	keyPressed       = false
	lastKeyPressTime = time.Time{}
	keyPressTimeout  = 150 * time.Millisecond // If no key press in this time, assume key is released

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
	payButton   *PayButton
	isPumping   bool
}

// PayButton is a custom Bootstrap-style button widget for the touchscreen
type PayButton struct {
	background *canvas.Rectangle
	shadow     *canvas.Rectangle
	text       *canvas.Text
	enabled    bool
	onTapped   func()
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
	p.isPumping = true
	p.updateGUIDisplay()
}

func (p *PetrolPump) reset() {
	p.litres = 0.0
	p.amount = 0.0
	p.isPumping = false
	p.updateGUIDisplay()
}

func (p *PetrolPump) stopPumping() {
	p.isPumping = false
	p.updatePayButton()
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
	p.updatePayButton()
}

func (p *PetrolPump) updatePayButton() {
	if p.payButton != nil {
		// Enable button only if not pumping and there's an amount to pay
		shouldEnable := !p.isPumping && p.amount > 0
		p.payButton.SetEnabled(shouldEnable)
	}
}

// NewPayButton creates a new Bootstrap-style touchscreen-friendly pay button
func NewPayButton(text string, onTapped func()) *PayButton {
	pb := &PayButton{
		background: canvas.NewRectangle(displayGreen),
		shadow:     canvas.NewRectangle(color.RGBA{R: 0, G: 0, B: 0, A: 80}),
		text:       canvas.NewText(text, color.White),
		enabled:    false,
		onTapped:   onTapped,
	}

	pb.text.TextSize = 42
	pb.text.Alignment = fyne.TextAlignCenter
	pb.text.TextStyle = fyne.TextStyle{Bold: true}

	// Start disabled
	pb.SetEnabled(false)

	return pb
}

func (pb *PayButton) SetEnabled(enabled bool) {
	pb.enabled = enabled
	if enabled {
		// Enabled state - bright green like Bootstrap success button
		pb.background.FillColor = color.RGBA{R: 40, G: 200, B: 80, A: 255}
		pb.text.Color = color.White
		pb.shadow.FillColor = color.RGBA{R: 0, G: 0, B: 0, A: 80}
	} else {
		// Disabled state - gray like Bootstrap disabled
		pb.background.FillColor = color.RGBA{R: 108, G: 117, B: 125, A: 255}
		pb.text.Color = color.RGBA{R: 200, G: 200, B: 200, A: 255}
		pb.shadow.FillColor = color.RGBA{R: 0, G: 0, B: 0, A: 30}
	}
	pb.background.Refresh()
	pb.text.Refresh()
	pb.shadow.Refresh()
}

func (pb *PayButton) Tapped(pe *fyne.PointEvent) {
	if pb.enabled && pb.onTapped != nil {
		// Visual feedback - darken button briefly
		originalColor := pb.background.FillColor
		pb.background.FillColor = color.RGBA{R: 30, G: 160, B: 60, A: 255}
		pb.background.Refresh()

		// Execute callback
		pb.onTapped()

		// Restore color after a brief moment
		go func() {
			time.Sleep(100 * time.Millisecond)
			pb.background.FillColor = originalColor
			pb.background.Refresh()
		}()
	}
}

func (pb *PayButton) TappedSecondary(*fyne.PointEvent) {}

func (pb *PayButton) CreateRenderer() fyne.WidgetRenderer {
	return &payButtonRenderer{button: pb}
}

// Implement fyne.Widget interface methods
func (pb *PayButton) Size() fyne.Size {
	return fyne.NewSize(400, 75)
}

func (pb *PayButton) Resize(size fyne.Size) {}

func (pb *PayButton) Position() fyne.Position {
	return fyne.NewPos(0, 0)
}

func (pb *PayButton) Move(pos fyne.Position) {}

func (pb *PayButton) MinSize() fyne.Size {
	return fyne.NewSize(400, 75)
}

func (pb *PayButton) Visible() bool {
	return true
}

func (pb *PayButton) Show() {}

func (pb *PayButton) Hide() {}

func (pb *PayButton) Refresh() {
	pb.background.Refresh()
	pb.text.Refresh()
	pb.shadow.Refresh()
}

type payButtonRenderer struct {
	button *PayButton
}

func (r *payButtonRenderer) Layout(size fyne.Size) {
	// Shadow offset (bottom-right for depth effect)
	shadowOffset := float32(4)

	// Position shadow slightly offset
	r.button.shadow.Move(fyne.NewPos(shadowOffset, shadowOffset))
	r.button.shadow.Resize(fyne.NewSize(size.Width, size.Height))

	// Position main button
	r.button.background.Move(fyne.NewPos(0, 0))
	r.button.background.Resize(size)

	// Center text
	r.button.text.Move(fyne.NewPos(0, 0))
	r.button.text.Resize(size)
}

func (r *payButtonRenderer) MinSize() fyne.Size {
	// Bootstrap-like button size - larger for touchscreen
	return fyne.NewSize(400, 75)
}

func (r *payButtonRenderer) Refresh() {
	r.button.background.Refresh()
	r.button.text.Refresh()
	r.button.shadow.Refresh()
}

func (r *payButtonRenderer) Objects() []fyne.CanvasObject {
	return []fyne.CanvasObject{r.button.shadow, r.button.background, r.button.text}
}

func (r *payButtonRenderer) Destroy() {}

func (p *PetrolPump) createGUIDisplay(a fyne.App) fyne.Window {
	w := a.NewWindow("Petrol Pump Display")
	w.SetFullScreen(true)

	// Create background
	bg := canvas.NewRectangle(displayBg)

	// Title/Brand - optimized for 1024x600
	title := canvas.NewText("PETROL", displayWhite)
	title.TextSize = 48
	title.Alignment = fyne.TextAlignCenter
	title.TextStyle = fyne.TextStyle{Bold: true}

	// Debug mode indicator (if in debug mode)
	var modeIndicator *canvas.Text
	if debugMode {
		modeIndicator = canvas.NewText("🔧 DEBUG MODE 🔧", displayRed)
		modeIndicator.TextSize = 22
		modeIndicator.Alignment = fyne.TextAlignCenter
		modeIndicator.TextStyle = fyne.TextStyle{Bold: true}
	}

	// LITRES display - value and unit on same line
	p.litresLabel = canvas.NewText("0.00", displayGreen)
	p.litresLabel.TextSize = 110
	p.litresLabel.Alignment = fyne.TextAlignCenter
	p.litresLabel.TextStyle = fyne.TextStyle{Bold: true, Monospace: true}

	litresUnit := canvas.NewText("L", displayGreen)
	litresUnit.TextSize = 110
	litresUnit.Alignment = fyne.TextAlignCenter
	litresUnit.TextStyle = fyne.TextStyle{Bold: true}

	// AMOUNT display - currency and value on same line
	currencySymbol := canvas.NewText("$", displayGreen)
	currencySymbol.TextSize = 110
	currencySymbol.Alignment = fyne.TextAlignCenter
	currencySymbol.TextStyle = fyne.TextStyle{Bold: true}

	p.amountLabel = canvas.NewText("0.00", displayGreen)
	p.amountLabel.TextSize = 110
	p.amountLabel.Alignment = fyne.TextAlignCenter
	p.amountLabel.TextStyle = fyne.TextStyle{Bold: true, Monospace: true}

	// Price per litre indicator - optimized for 1024x600
	priceInfo := canvas.NewText(fmt.Sprintf("Rate: $%.2f per litre", pricePerLitre), displayWhite)
	priceInfo.TextSize = 24
	priceInfo.Alignment = fyne.TextAlignCenter

	// Pay button (touchscreen) - optimized for 1024x600
	p.payButton = NewPayButton("PAY", func() {
		p.reset()
	})

	// Decorative separator line - optimized for 1024x600
	line1 := canvas.NewRectangle(displayGreen)
	line1.SetMinSize(fyne.NewSize(700, 5))

	// Build layout
	var content *fyne.Container
	if debugMode {
		// Debug mode: show control instructions
		statusLabel := canvas.NewText("Hold SPACE to pump • Press R to reset • ESC to exit", displayWhite)
		statusLabel.TextSize = 18
		statusLabel.Alignment = fyne.TextAlignCenter
		
		content = container.New(layout.NewVBoxLayout(),
			layout.NewSpacer(),
			container.NewCenter(title),
			container.NewCenter(modeIndicator),
			layout.NewSpacer(),
			layout.NewSpacer(),
			// Litres with unit on same line
			container.NewCenter(
				container.NewHBox(
					p.litresLabel,
					litresUnit,
				),
			),
			layout.NewSpacer(),
			container.NewCenter(line1),
			layout.NewSpacer(),
			// Amount with currency on same line
			container.NewCenter(
				container.NewHBox(
					currencySymbol,
					p.amountLabel,
				),
			),
			layout.NewSpacer(),
			layout.NewSpacer(),
			container.NewCenter(priceInfo),
			layout.NewSpacer(),
			container.NewCenter(p.payButton),
			layout.NewSpacer(),
			container.NewCenter(statusLabel),
			layout.NewSpacer(),
		)
	} else {
		// Normal mode: clean display without instructions
		content = container.New(layout.NewVBoxLayout(),
			layout.NewSpacer(),
			container.NewCenter(title),
			layout.NewSpacer(),
			layout.NewSpacer(),
			// Litres with unit on same line
			container.NewCenter(
				container.NewHBox(
					p.litresLabel,
					litresUnit,
				),
			),
			layout.NewSpacer(),
			container.NewCenter(line1),
			layout.NewSpacer(),
			// Amount with currency on same line
			container.NewCenter(
				container.NewHBox(
					currencySymbol,
					p.amountLabel,
				),
			),
			layout.NewSpacer(),
			layout.NewSpacer(),
			container.NewCenter(priceInfo),
			layout.NewSpacer(),
			container.NewCenter(p.payButton),
			layout.NewSpacer(),
		)
	}

	// Stack background and content
	w.SetContent(container.NewStack(bg, content))

	// Handle keyboard - ESC and R work in both modes, SPACE only in debug mode
	w.Canvas().SetOnTypedKey(func(key *fyne.KeyEvent) {
		switch key.Name {
		case fyne.KeySpace:
			// Only allow SPACE to pump in debug mode
			if debugMode {
				keyPressed = true
				lastKeyPressTime = time.Now()
			}
		case fyne.KeyR:
			// Reset works in both modes
			p.reset()
			if debugMode {
				keyPressed = false
			}
		case fyne.KeyEscape:
			// ESC to exit works in both modes
			fmt.Printf("\nFinal totals:\n")
			fmt.Printf("  Litres: %.2f L\n", p.litres)
			fmt.Printf("  Amount: $%.2f\n", p.amount)
			a.Quit()
		}
	})

	return w
}

func createSplashScreen(a fyne.App) fyne.Window {
	w := a.NewWindow("Petrol Pump")
	w.SetFullScreen(true)

	// White background
	bg := canvas.NewRectangle(color.White)

	// Try to load logo image - optimized for 1024x600
	var logoWidget fyne.CanvasObject
	if _, err := os.Stat(logoPath); err == nil {
		// Logo file exists
		img := canvas.NewImageFromFile(logoPath)
		img.FillMode = canvas.ImageFillContain
		img.SetMinSize(fyne.NewSize(350, 350))
		logoWidget = img
	} else {
		// Logo file doesn't exist, show placeholder text
		placeholder := canvas.NewText("PETROL PUMP", displayBg)
		placeholder.TextSize = 60
		placeholder.Alignment = fyne.TextAlignCenter
		placeholder.TextStyle = fyne.TextStyle{Bold: true}
		logoWidget = placeholder
	}

	// Loading text - optimized for 1024x600
	loadingText := canvas.NewText("Loading...", color.RGBA{R: 100, G: 100, B: 100, A: 255})
	loadingText.TextSize = 20
	loadingText.Alignment = fyne.TextAlignCenter

	// Layout
	content := container.New(layout.NewVBoxLayout(),
		layout.NewSpacer(),
		container.NewCenter(logoWidget),
		layout.NewSpacer(),
		container.NewCenter(loadingText),
		layout.NewSpacer(),
	)

	w.SetContent(container.NewStack(bg, content))
	return w
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

	// Show splash screen first
	splashWindow := createSplashScreen(myApp)
	splashWindow.Show()

	// After splash duration, switch to main pump display
	go func() {
		time.Sleep(splashDuration)
		splashWindow.Hide()

		// Create and show main window
		mainWindow := pump.createGUIDisplay(myApp)
		mainWindow.Show()

		// Setup signal handling after main window is shown
		setupSignalHandling(myApp, pump)

		// Start pump monitoring
		startPumpMonitoring(pump, button)
	}()

	myApp.Run()
}

func setupSignalHandling(myApp fyne.App, pump *PetrolPump) {

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigChan
		fmt.Printf("\nFinal totals:\n")
		fmt.Printf("  Litres: %.2f L\n", pump.litres)
		fmt.Printf("  Amount: $%.2f\n", pump.amount)
		myApp.Quit()
	}()
}

func startPumpMonitoring(pump *PetrolPump, button rpio.Pin) {
	go func() {
		ticker := time.NewTicker(updateInterval)
		defer ticker.Stop()

		lastButtonState := false

		for {
			<-ticker.C
			var buttonPressed bool

			if debugMode {
				// Debug mode: use keyboard (handled by Fyne event handlers)
				// Check if key press has timed out (key was released)
				if keyPressed && time.Since(lastKeyPressTime) > keyPressTimeout {
					keyPressed = false
				}
				buttonPressed = keyPressed
			} else {
				// Normal mode: use GPIO
				buttonPressed = button.Read() == rpio.Low
			}

			if buttonPressed {
				pump.increment()
				lastButtonState = true
			} else if lastButtonState {
				// Button was just released
				pump.stopPumping()
				lastButtonState = false
			}
		}
	}()
}
