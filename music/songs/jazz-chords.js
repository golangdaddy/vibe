// Jazz Chords
// Smooth jazz chord progression

setcps(0.6)

stack(
  // Drums
  s("bd ~ ~ ~, ~ ~ sd ~, [~ hh]*4")
    .gain(0.5)
    .room(0.4),
  
  // Jazz chords
  note("<[c3,e3,g3,b3] [f3,a3,c4,e4] [g3,b3,d4,f4] [c3,e3,g3,bb3]>")
    .s('triangle')
    .attack(0.5)
    .release(2)
    .gain(0.4)
    .room(0.6),
  
  // Walking bass
  note("c2 e2 g2 bb2")
    .s('sawtooth')
    .lpf(400)
    .gain(0.5)
)





