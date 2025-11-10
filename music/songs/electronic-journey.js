// Electronic Journey
// Atmospheric electronic with drums, bass, and melody

setcps(0.5)

stack(
  // Drums - Complex rhythm section
  s("bd*2, ~ sd, hh*4")
    .bank('RolandTR909')
    .room(0.3)
    .sometimes(x => x.speed(2).gain(0.6))
    .off(1/8, x => x.speed(1.5).gain(0.4)),
  
  // Bass - Deep filtered bassline
  note("c1, ~, g1, ~, f1, ~, bb1, ~")
    .s('sawtooth')
    .lpf(sine.range(200, 800).slow(8))
    .gain(0.6)
    .room(0.2),
  
  // Lead melody - Arpeggiated with effects
  n("0 2 4 7 9 12 7 4")
    .scale('C4:minor')
    .s('sawtooth')
    .attack(0.1)
    .release(0.3)
    .room(0.8)
    .delay(0.5)
    .delaytime(0.125)
    .gain(0.4)
    .pan(sine.range(0, 1).slow(3)),
  
  // Ambient pad - Atmospheric background
  note("c3,eb3,g3,bb3")
    .s('sawtooth')
    .attack(2)
    .release(3)
    .room(1)
    .gain(0.2)
    .lpf(800)
    .pan(sine.slow(4))
)



