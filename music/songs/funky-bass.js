// Funky Bass
// Groovy bass line with drums

setcps(1)

stack(
  s("bd*2, ~ sd, hh*4"),
  
  note("c2 ~ g2 ~ f2 ~ bb2 ~")
    .s('sawtooth')
    .gain(0.6)
    .lpf(800)
    .room(0.2),
  
  note("c3 eb3 g3 bb3")
    .s('triangle')
    .gain(0.3)
    .room(0.5)
)



