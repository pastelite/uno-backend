// First character = R:red, Y:yellow, G:green, B:blue, S:special
// Second char = 0-9, S: stop, R: reverse, +: plus (if special = +4)
export const unoDeckOriginal = [
  'R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 
  'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 
  'RS', 'RR', 'R+', 'RS', 'RR', 'R+', 'S+', 'SW',
  'Y0', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7', 'Y8', 'Y9', 
  'Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7', 'Y8', 'Y9', 
  'YS', 'YR', 'Y+', 'YS', 'YY', 'Y+', 'S+', 'SW',
  'G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 
  'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 
  'GS', 'GR', 'G+', 'GS', 'GG', 'G+', 'S+', 'SW',
  'B0', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 
  'BS', 'BR', 'B+', 'BS', 'BB', 'B+', 'S+', 'SW',
]

export function unoShuffle() {
  return shuffleArray(unoDeckOriginal)
}

export function unoStringToArray(input: string) {
  let unoArray = [];
  for (let i = 0;i<input.length;i+=2) {
    unoArray.push(input[i]+input[i+1])
  }
  return unoArray;
}

export function shuffleArray<T>(arr: T[]) {
  let size = arr.length

  while(size != 0) {
    let index = Math.floor(Math.random() * size);
    let temp = arr[index]
    arr[index] = arr[size]
    arr[size] = temp
    size--
  }

  return arr
}

// let unoDeckArray = []
  // // let color = "R"
  // for (let color of ["R","Y","G","B"]) {
  //   for (let i=0;i<=9;i++) {
  //     unoDeckArray.push(color+i)
  //   }
  //   for (let i=1;i<=9;i++) {
  //     unoDeckArray.push(color+i)
  //   }
  //   // S: stop, R:reverse, +:+2
  //   for (let special of ["S","R","+"]) {
  //     unoDeckArray.push(color+special)
  //     unoDeckArray.push(color+special)
  //   }
  //   // Wildcard
  //   unoDeckArray.push("WI")
  //   // +4
  //   unoDeckArray.push("+4")
  // }