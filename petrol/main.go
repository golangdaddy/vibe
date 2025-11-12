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
	"fyne.io/fyne/v2/theme"
	"github.com/stianeikeland/go-rpio/v4"
)

const (
	// GPIO pin 17 for button (BCM numbering)
	buttonPin = 17

	// Pump settings
	pricePerLitre  = 1.50                 // Currency per litre
	incrementRate  = 0.01                 // Litres added per increment
	updateInterval = 7 * time.Millisecond // How often to check button and update display

	// Splash screen settings
	splashDuration = 3 * time.Second // How long to show splash screen
	logoPath       = "images/logo.png"

	// Digital font paths (will try in order)
	digitalFontPath1 = "fonts/digital.ttf"
	digitalFontPath2 = "/usr/share/fonts/truetype/dseg/DSEG7Classic-Bold.ttf"
	digitalFontPath3 = "/usr/local/share/fonts/DSEG7Classic-Bold.ttf"

	// Base font path
	baseFontPath = "fonts/modern-vision.ttf"
)

var (
	debugMode        = false
	keyPressed       = false
	lastKeyPressTime = time.Time{}
	keyPressTimeout  = 150 * time.Millisecond // If no key press in this time, assume key is released

	// Colors for petrol pump display
	displayBg    = color.RGBA{R: 20, G: 20, B: 20, A: 255}
	displayAmber = color.RGBA{R: 255, G: 200, B: 0, A: 255}
	displayWhite = color.RGBA{R: 240, G: 240, B: 240, A: 255}
	displayRed   = color.RGBA{R: 255, G: 50, B: 50, A: 255}

	// Font resources
	digitalFontResource fyne.Resource // DSEG7 for numbers
	baseFontResource    fyne.Resource // Modern Vision for interface
)

// customTheme wraps the default dark theme but uses our custom digital font
type customTheme struct {
	fyne.Theme
}

func newCustomTheme() fyne.Theme {
	return &customTheme{Theme: theme.DarkTheme()}
}

func (ct *customTheme) Font(style fyne.TextStyle) fyne.Resource {
	// Use system default font for symbol text (basic font request, non-italic)
	if style.Symbol {
		return ct.Theme.Font(fyne.TextStyle{}) // Return default sans-serif
	}
	// Use digital font for monospace text (our numbers)
	if style.Monospace && digitalFontResource != nil {
		return digitalFontResource
	}
	// Use Modern Vision for all other text
	if baseFontResource != nil {
		return baseFontResource
	}
	// Fall back to default if fonts not loaded
	return ct.Theme.Font(style)
}

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
		p.litresLabel.Text = fmt.Sprintf("%06.2f", p.litres)
		p.litresLabel.Refresh()
	}
	if p.amountLabel != nil {
		p.amountLabel.Text = fmt.Sprintf("%06.2f", p.amount)
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
		background: canvas.NewRectangle(displayWhite),
		shadow:     canvas.NewRectangle(color.RGBA{R: 0, G: 0, B: 0, A: 80}),
		text:       canvas.NewText(text, color.White),
		enabled:    false,
		onTapped:   onTapped,
	}

	pb.text.TextSize = 36
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
	return fyne.NewSize(480, 90)
}

func (pb *PayButton) Resize(size fyne.Size) {}

func (pb *PayButton) Position() fyne.Position {
	return fyne.NewPos(0, 0)
}

func (pb *PayButton) Move(pos fyne.Position) {}

func (pb *PayButton) MinSize() fyne.Size {
	return fyne.NewSize(360, 70)
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
	return fyne.NewSize(480, 90)
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

	// Header labels (black text for white header background)
	petrolLabel := canvas.NewText("PETROL", color.Black)
	petrolLabel.TextSize = 50
	petrolLabel.Alignment = fyne.TextAlignCenter
	petrolLabel.TextStyle = fyne.TextStyle{Bold: false}

	// Rate label for header (black text)
	rateLabel := canvas.NewText(fmt.Sprintf("£%.2f/L", pricePerLitre), color.Black)
	rateLabel.TextSize = 30
	rateLabel.Alignment = fyne.TextAlignCenter
	rateLabel.TextStyle = fyne.TextStyle{Bold: false}

	// Debug mode indicator (if in debug mode)
	var modeIndicator *canvas.Text
	if debugMode {
		modeIndicator = canvas.NewText("🔧 DEBUG MODE 🔧", color.Black)
		modeIndicator.TextSize = 18
		modeIndicator.Alignment = fyne.TextAlignCenter
		modeIndicator.TextStyle = fyne.TextStyle{Bold: true}
	}

	// Create header with white background
	headerBg := canvas.NewRectangle(color.White)
	var headerContent fyne.CanvasObject
	if debugMode {
		// Header with PETROL (left), DEBUG MODE (center), rate (right)
		headerContent = container.NewBorder(
			nil, nil,
			petrolLabel,                        // Left
			rateLabel,                          // Right
			container.NewCenter(modeIndicator), // Center
		)
	} else {
		// Header with PETROL (left), rate (right)
		headerContent = container.NewBorder(
			nil, nil,
			petrolLabel, // Left
			rateLabel,   // Right
			nil,         // Center (empty)
		)
	}
	// Stack header background and content with padding
	header := container.NewStack(headerBg, container.NewPadded(headerContent))

	// LITRES display - value and unit on same line
	p.litresLabel = createDigitalText("000.00", displayWhite, 120)

	thisSaleTextSize := float32(60)

	thisSale := canvas.NewText("this", displayWhite)
	thisSale.TextSize = thisSaleTextSize
	thisSale.Alignment = fyne.TextAlignCenter
	thisSale.TextStyle = fyne.TextStyle{Bold: false}

	saleThis := canvas.NewText("sale", displayWhite)
	saleThis.TextSize = thisSaleTextSize
	saleThis.Alignment = fyne.TextAlignCenter
	saleThis.TextStyle = fyne.TextStyle{Bold: false}

	litresCurrencyUnit := canvas.NewText(" litres", displayWhite)
	litresCurrencyUnit.TextSize = 78
	litresCurrencyUnit.Alignment = fyne.TextAlignCenter
	litresCurrencyUnit.TextStyle = fyne.TextStyle{Bold: true}

	// AMOUNT display - currency and value on same line (using basic system font)
	currencySymbol := createBasicText("£", displayWhite, 96)

	p.amountLabel = createDigitalText("000.00", displayWhite, 120)

	// Pay button (touchscreen) - optimized for 1024x600
	p.payButton = NewPayButton("PAY", func() {
		p.reset()
	})

	// Load logo for footer
	var logoWidget fyne.CanvasObject
	if _, err := os.Stat(logoPath); err == nil {
		// Logo file exists
		img := canvas.NewImageFromFile(logoPath)
		img.FillMode = canvas.ImageFillContain
		img.SetMinSize(fyne.NewSize(60, 60))
		// Add padding around logo
		logoWidget = container.NewPadded(img)
	} else {
		// Placeholder if logo not found (empty spacer)
		logoWidget = layout.NewSpacer()
	}

	// Create footer with white background, logo on left, button on right
	footerBg := canvas.NewRectangle(color.White)

	// Footer content: logo left, spacer middle, button right
	footerContent := container.NewBorder(
		nil, nil,
		container.NewPadded(logoWidget),  // Left (with padding)
		container.NewPadded(p.payButton), // Right (with padding)
		nil,                              // Center (empty)
	)

	// Stack footer background and content with additional internal padding
	footer := container.NewStack(footerBg, container.NewPadded(footerContent))

	// Decorative separator line - full width, thick, darker
	lineDarkerGray := color.RGBA{R: 120, G: 120, B: 120, A: 255} // 50% darker than displayWhite
	line1 := canvas.NewRectangle(lineDarkerGray)
	line1.SetMinSize(fyne.NewSize(1024, 15))

	// Fixed horizontal spacer for "this sale" layout
	horizontalSpacer := canvas.NewRectangle(color.Transparent)
	horizontalSpacer.SetMinSize(fyne.NewSize(36, 1))

	// Build layout
	var content *fyne.Container
	if debugMode {
		// Debug mode: show control instructions
		statusLabel := canvas.NewText("Hold SPACE to pump • Press R to reset • ESC to exit", displayWhite)
		statusLabel.TextSize = 14
		statusLabel.Alignment = fyne.TextAlignCenter

		content = container.NewBorder(
			header, // Top - header with PETROL and DEBUG MODE
			footer, // Bottom - footer with button and logo
			nil,    // Left
			nil,    // Right
			// Center content
			container.New(layout.NewVBoxLayout(),
				layout.NewSpacer(),
				// Litres with unit on same line
				container.NewCenter(
					container.NewHBox(
						p.litresLabel,
						litresCurrencyUnit,
					),
				),
				layout.NewSpacer(),
				container.NewCenter(line1),
				layout.NewSpacer(),
				// Amount with currency on same line
				container.NewCenter(
					container.NewHBox(
						container.NewVBox(
							layout.NewSpacer(),
							thisSale,
							saleThis,
							layout.NewSpacer(),
						),
						horizontalSpacer,
						currencySymbol,
						p.amountLabel,
					),
				),
				layout.NewSpacer(),
				container.NewCenter(statusLabel),
				layout.NewSpacer(),
			),
		)
	} else {
		// Normal mode: clean display without instructions
		content = container.NewBorder(
			header, // Top - header with PETROL
			footer, // Bottom - footer with button and logo
			nil,    // Left
			nil,    // Right
			// Center content
			container.New(layout.NewVBoxLayout(),
				layout.NewSpacer(),
				// Litres with unit on same line
				container.NewCenter(
					container.NewHBox(
						p.litresLabel,
						litresCurrencyUnit,
					),
				),
				layout.NewSpacer(),
				container.NewCenter(line1),
				layout.NewSpacer(),
				// Amount with currency on same line
				container.NewCenter(
					container.NewHBox(
						container.NewVBox(
							layout.NewSpacer(),
							thisSale,
							saleThis,
							layout.NewSpacer(),
						),
						horizontalSpacer,
						currencySymbol,
						p.amountLabel,
					),
				),
				layout.NewSpacer(),
			),
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
			fmt.Printf("  Amount: £%.2f\n", p.amount)
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

// createDigitalText creates a text widget with digital font if available
func createDigitalText(text string, col color.Color, size float32) *canvas.Text {
	txt := canvas.NewText(text, col)
	txt.TextSize = size
	txt.Alignment = fyne.TextAlignCenter

	if digitalFontResource != nil {
		// Use custom digital font
		txt.TextStyle = fyne.TextStyle{}

		// Create custom text with font
		customTxt := &canvas.Text{
			Text:      text,
			Color:     col,
			TextSize:  size,
			Alignment: fyne.TextAlignCenter,
			TextStyle: fyne.TextStyle{},
		}

		// Set custom font - this requires using widget.NewRichTextFromMarkdown approach
		// For now, using monospace as fallback since Fyne's canvas.Text doesn't support custom fonts directly
		customTxt.TextStyle = fyne.TextStyle{Bold: true, Monospace: true}
		return customTxt
	}

	// Fallback to monospace
	txt.TextStyle = fyne.TextStyle{Bold: true, Monospace: true}
	return txt
}

func createBasicText(text string, col color.Color, size float32) *canvas.Text {
	txt := canvas.NewText(text, col)
	txt.TextSize = size
	txt.Alignment = fyne.TextAlignCenter
	// Use Symbol flag to signal the theme to use system default font (non-italic)
	txt.TextStyle = fyne.TextStyle{Symbol: true}
	return txt
}

// loadDigitalFont tries to load digital display font from various locations
func loadDigitalFont() {
	fontPaths := []string{
		digitalFontPath1,
		digitalFontPath2,
		digitalFontPath3,
		"fonts/DSEG7Classic-Bold.ttf",
		"/usr/share/fonts/truetype/DSEG7Classic-Bold.ttf",
	}

	for _, path := range fontPaths {
		if data, err := os.ReadFile(path); err == nil {
			digitalFontResource = fyne.NewStaticResource("digital", data)
			fmt.Printf("✓ Loaded digital font from: %s\n", path)
			return
		}
	}

	fmt.Println("ℹ Digital font (DSEG7) not found")
	fmt.Println("  Using monospace font as fallback")
	fmt.Println("  To use DSEG7, install it to one of:")
	fmt.Println("    - fonts/DSEG7Classic-Bold.ttf")
	fmt.Println("    - /usr/share/fonts/truetype/dseg/DSEG7Classic-Bold.ttf")
}

// loadBaseFont tries to load the Modern Vision base font
func loadBaseFont() {
	if data, err := os.ReadFile(baseFontPath); err == nil {
		baseFontResource = fyne.NewStaticResource("modernvision", data)
		fmt.Printf("✓ Loaded base font from: %s\n", baseFontPath)
	} else {
		fmt.Printf("ℹ Base font (Modern Vision) not found at: %s\n", baseFontPath)
		fmt.Println("  Using default font as fallback")
	}
}

func main() {
	var button rpio.Pin

	// Load fonts if available
	loadDigitalFont()
	loadBaseFont()

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

	// Set custom theme to use digital font
	myApp.Settings().SetTheme(newCustomTheme())

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
		fmt.Printf("  Amount: £%.2f\n", pump.amount)
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
