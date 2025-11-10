// Breakbeat
// Energetic breakbeat rhythm

setcps(1.4)

stack(
  // Amen break style
  s("bd ~ bd sd, ~ hh ~ hh, ~ ~ cp ~")
    .sometimes(x => x.speed(1.2))
    .gain(0.8),
  
  // Bass wobble
  note("c2 ~ g2 ~")
    .s('sawtooth')
    .lpf(sine.range(200, 1000).fast(4))
    .gain(0.6)
    .room(0.2),
  
  // Stabs
  note("c4,e4,g4")
    .s('square')
    .struct("~ ~ x ~")
    .attack(0.01)
    .release(0.1)
    .gain(0.4)
    .room(0.5)
)




