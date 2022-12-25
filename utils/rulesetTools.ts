export default function reader(input: String) {
  // startdraw|canstackcard|canstack+
  input.split("|")
  return {
    startDraw: parseInt(input[0]),
    canStackCards: input[1] == "t" ? true : false,
    canStackPlus: input[2] == "t" ? true : false
  }
}