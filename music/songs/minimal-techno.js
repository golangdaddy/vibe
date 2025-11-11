// Minimal Techno
// Hypnotic minimal techno groove

setcps(1.2)

stack(
  // Kick
  s("bd*4").gain(0.9),
  
  // Percussive elements
  s("~ ~ hh ~").gain(0.4).sometimes(x => x.speed(1.5)),
  s("~ ~ ~ cp").gain(0.3),
  
  // Minimal bass
  note("c1 ~ ~ ~ c1 ~ f1 ~")
    .s('sawtooth')
    .lpf(300)
    .gain(0.6),
  
  // High melody
  n("0 ~ 4 ~")
    .scale('C5:minor')
    .s('sine')
    .gain(0.3)
    .room(0.8)
)





