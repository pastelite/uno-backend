export default function reader(input: String) {
  // startdraw|canstackcard|canstack+
  let split = input.split("|")
  // console.log(inpu)
  return {
    startDraw: parseInt(split[0]),
    canStackCards: split[1] == "t",
    canStackPlus: split[2] == "t"
  }
}