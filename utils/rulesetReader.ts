export default function reader(input: String) {
  // startdraw|canstack
  input.split("|")
  return {
    startDraw: parseInt(input[0]),
    canStack: input[1] == "t" ? true : false
  }
}