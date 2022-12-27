import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient()

import { NextFunction, Request, RequestHandler, Response } from "express";
import rulesetReader from "../utils/rulesetTools";
import { LobbyUpdater, PlayerUpdater } from "../utils/gameTools";
// import { updateLobbyCards, updatePlayerCards } from "../utils/gameTools";

export let getLobbyAction: RequestHandler = async (req, res, next) => {
  switch (req.query.action || req.query.a) {
    case undefined:
    case null:
      return next()
    default:
      req.message = "action is not supported"
      return next()
  }
}

export let postLobbyAction: RequestHandler = async (req, res, next) => {
  switch (req.query.action || req.query.a) {
    case "start":
      return lobbyStart(req, res, next)
    case "play":
      return playCard(req, res, next)
    default:
      req.message = "action is not supported"
      return next()
  }
}

interface GameplayRequestHandler  {
  (req: Request, res: Response, next: NextFunction): void;
  // lobby: LobbyUpdater,
  // player: PlayerUpdater
}

export let lobbyDefaultReply: RequestHandler = async (req, res, next) => {
  // can't be null because of jwtAuthentication
  let { discardPile, playerList, ...lobby } = req.lobby!
  let cardOnTop = discardPile.slice(-2)

  // count card nums and remove cardsList
  playerList.map((p: any) => {
    p.cardsCount = p.cardsOnHand.length / 2
    delete p.cardsList
  })

  // Return
  return res.status(200).json({
    message: req.message,
    lobby: { cardOnTop, ...lobby, playerList },
    player: req.player
  })
}

let lobbyStart: RequestHandler = async (req, res, next) => {
  let lobbyU = new LobbyUpdater(req.lobby!)
  let ruleset = rulesetReader(lobbyU.lobby.ruleset)

  // all active player draw
  for (let player of req.lobby!.playerList) {
    let playerU = new PlayerUpdater(player)
    let drawedCards = lobbyU.draws(ruleset.startDraw)

    playerU.addCardOnHand(drawedCards)

    await playerU.saveUpdate()
  }

  // draw one more card and add to discardpile
  let drawedCard = lobbyU.draws(1)
  lobbyU.addDiscardPile(drawedCard)

  await lobbyU.saveUpdate()

  req.message = "started"
  next()
}

// TODO: deal with this shit

// THE RULE NOT ALLOW STACK +
// get +
// if cant play draw
// play and endgame

// THE RULE ALLOW STACK +
// if cant stack get +
// if cant play draw
// play and endgame

// FIRST IDEA, do everything using play
// 1.play
// check for +
//   if play + and rule allow -> end turn
//   else: draw
// 2. play
// if play nothing: draw
// if play other -> end turn
// 3. play
// anything -> end turn

// I chose to go with second idea
// SECOND IDEA, Split it up
// 1. play card (if played cannot play, if rule not allow stack and plus count > 0 cannot play)
// 2. draw (if drawed and played cannot draw, if have + then draw that + else 1)
// 3. end game (if rule not allow stack and plus count > 0 cannot end game) -> is played/drawed = false
// New idea, implement those lock in postRouter or something instead

// turn start
// if + and rule now allow stack, user "forced" to draws
// if + and no rule and playcard with + -> nothing happen (tick played)
// if + and no rule and playcard with other -> not allowed
// if + and no rule and draw -> draw
// draw -> draw 1 (tick is drawed)
// playcard -> asdaweqwe (tick is played, not allow if played)
// end turn

let playCard: GameplayRequestHandler = (req,res,next) => {
  let lobbyUpdater = new LobbyUpdater(req.lobby!)
  let playerUpdater = new PlayerUpdater(req.player!)
  let cardsPlayedNumbers: number[] = req.body.cards
  let ruleset = lobbyUpdater.getRuleset()
  // check isplayed
  // check if playing nothing
  // check pluscount > 0
    // if rule allow stack, check is played +, else blocked
    // else blocked

  // get played cards
  let cardsPlayed = []
  for (let i of cardsPlayedNumbers) {
    let card = playerUpdater.cardsOnHand[i]
    if (!card) {
      return res.status(400).json({
        message: "one of the played you listed is not exists"
      })
    }
    cardsPlayed.push(card)
  }

  // check number of played card
  if (cardsPlayed.length == 0) {
    return res.status(400).json({
      message: "\"cards\" shouldn't be empty"
    })
  }

  // check stacking cards
  if (!ruleset.canStackCards && cardsPlayed.length > 1) {
    return res.status(400).json({
      message: "you cannot stack your cards as specify in ruleset"
    })
  }

  // get played card stats
  let playedColor = cardsPlayed[0][0], playedNumber = cardsPlayed[0][1]
  let topColor = lobbyUpdater.getTopCard()[0], topNumber = lobbyUpdater.getTopCard()[1]

  // color/number of played card(s)
  if (cardsPlayed.length > 1) {
    let mode: "color" | "number" | "plus"
    let returnCardInput = () => {
      res.status(400).json({
        message: "your card input do not match"
      })
    }

    // first two card
    if (cardsPlayed[0][0] == cardsPlayed[1][0]) {
      mode = "color"
    } else if (cardsPlayed[0][1] == cardsPlayed[1][1]) {
      mode = "number"
    } else if (
      (cardsPlayed[0][1] == "T" || cardsPlayed[0][1] == "F")
      && (cardsPlayed[1][1] == "T" || cardsPlayed[1][1] == "F")
    ) {
      mode = "plus"
      playedNumber = cardsPlayed[0][1] + cardsPlayed[1][1]
    } else {
      return returnCardInput()
    }

    // the rest
    for (let i = 2; i < cardsPlayed.length; i++) {
      switch (mode) {
        case "color":
          if (playedColor != cardsPlayed[i][0]) {
            return returnCardInput()
          }
          break;
        case "number":
          if (playedNumber != cardsPlayed[i][1]) {
            return returnCardInput()
          }
          break;
        case "plus":
          if (cardsPlayed[i][1] != "T" || cardsPlayed[i][1] != "F") {
            return returnCardInput();
          } else {
            playedNumber += cardsPlayed[i][1];
          }
          break;
      }
    }
  }

  // pluscount check
  if (lobbyUpdater.lobby.plusCount > 0) {
    if (playedColor[0] == "T" || playedColor[0] == "F") {
      for (let char of playedNumber) {
        lobbyUpdater.addPlusCount(char)
      }
    } else {
      return res.status(400).json({
        message: "there's a plus on top of the discard pile, you can either stacking + or draws"
      })
    }
  }

  // color/symbol check
  if (topColor != playedColor && topNumber != playedNumber && playedColor != "S") {
    return res.status(400).json({
      message: "the color/symbol do not match"
    })
  }

  // reverse
  if (playedNumber[0] == "R") {
    lobbyUpdater.lobby.way = -lobbyUpdater.lobby.way
  }

  // stop
  if (playedNumber[0] == "S") {
    lobbyUpdater.toNextPlayer()
    // to next player once since end turn will also to next player
  }

  playerUpdater.player.isPlayed = true
  playerUpdater.log()
  lobbyUpdater.log()
  return next()
}

function drawCards(req: Request, res: Response, next: NextFunction) {
}

function endTurn(req: Request, res: Response, next: NextFunction) {
}


// let playCardOld: RequestHandler = async (req, res, next) => {
//   let cardsPlayedNumbers: number[] = req.body.cards

//   let lobbyUpdater = new LobbyUpdater(req.lobby!)
//   let playerUpdater = new PlayerUpdater(req.player!)

//   let ruleset = lobbyUpdater.getRuleset()

//   // check turn
//   if (lobbyUpdater.lobby.playerTurn != playerUpdater.player.lobbyOrder) {
//     req.message = "not your turn"
//     return next()
//   }

//   if (!cardsPlayedNumbers) {
//     req.message = "please list card(s) that you want to play in \"cards\""
//     return next()
//   }

//   let cardsPlayed = []
//   for (let i of cardsPlayedNumbers) {
//     let card = playerUpdater.cardsOnHand[i]
//     if (!card) {
//       req.message = "one of the played card is not exists"
//       return next()
//     }
//     cardsPlayed.push(card)
//   }

//   // check if more than the rule allow
//   if (cardsPlayed.length > 1 && ruleset.canStackCards == false) {
//     console.log(ruleset)
//     req.message = "cannot stack as specify in the ruleset"
//     return next()
//   }

//   let playedColor = "", playedNumber = ""
//   let topColor = "", topNumber = ""

//   if (cardsPlayed.length > 1) {
//     // SET COLOR/NUMBER OF PLAYED CARD
//     playedColor = cardsPlayed[0][0], playedNumber = cardsPlayed[0][1]
//     topColor = lobbyUpdater.getTopCard()[0], topNumber = lobbyUpdater.getTopCard()[1]

//     // check if it's a stack
//     if (cardsPlayed.length > 1) {
//       let mode: "color" | "number" | "plus"
//       let returnCardInput = () => {
//         req.message = "card input is not match"
//         next()
//       }

//       // first two card
//       if (cardsPlayed[0][0] == cardsPlayed[1][0]) {
//         mode = "color"
//       } else if (cardsPlayed[0][1] == cardsPlayed[1][1]) {
//         mode = "number"
//       } else if (
//         (cardsPlayed[0][1] == "T" || cardsPlayed[0][1] == "F")
//         && (cardsPlayed[1][1] == "T" || cardsPlayed[1][1] == "F")
//       ) {
//         mode = "plus"
//         playedNumber = cardsPlayed[0][1] + cardsPlayed[1][1]
//       } else {
//         return returnCardInput()
//       }

//       // the rest
//       for (let i = 2; i < cardsPlayed.length; i++) {
//         switch (mode) {
//           case "color":
//             if (playedColor != cardsPlayed[i][0]) {
//               return returnCardInput()
//             }
//             break;
//           case "number":
//             if (playedNumber != cardsPlayed[i][1]) {
//               return returnCardInput()
//             }
//             break;
//           case "plus":
//             if (cardsPlayed[i][1] != "T" || cardsPlayed[i][1] != "F") {
//               return returnCardInput();
//             } else {
//               playedNumber += cardsPlayed[i][1];
//             }
//             break;
//         }
//       }
//     }

//     // GAMEPLAY
//     if (topColor != playedColor && topNumber != playedNumber && playedColor != "S") {
//       req.message = "bro, it's not match wtf are you doing"
//       return next()
//     }

//     // + related stuff
//     if (ruleset.canStackPlus) {
//       if (lobbyUpdater.lobby.plusCount > 0) {
//         // if played +
//         if (playedNumber[0] == "T" || playedNumber[0] == "F") {
//           for (let char of playedNumber) {
//             lobbyUpdater.addPlusCount(char)
//           }
//         // else draw
//         } else {
//           let drawedCard = lobbyUpdater.drawsFromPlusCount()
//           playerUpdater.addCardOnHand(drawedCard)
//         }
//       } else {
//         // if top is nothing
//         for (let char of playedNumber) {
//           lobbyUpdater.addPlusCount(char)
//         }
//       }
//     } else {
//       // draw from plus count
//       let drawedCard = lobbyUpdater.drawsFromPlusCount()
//       playerUpdater.addCardOnHand(drawedCard)
//       // played +
//       if (playedNumber[0] == "T" || playedNumber[0] == "F") {
//         for (let char of playedNumber) {
//           lobbyUpdater.addPlusCount(char)
//         }
//       }
//     }

//     // reverse
//     if (playedNumber[0] == "R") {
//       lobbyUpdater.lobby.way = -lobbyUpdater.lobby.way
//     }

//   // in case of play no card
//   } else {
//     if (!playerUpdater.player.isDrawed) {
//       let drawedCard = lobbyUpdater.draws(1)
//       playerUpdater.addCardOnHand(drawedCard)

//       // finishing up
//       playerUpdater.log()
//       lobbyUpdater.log()
//       return next()
//     }
//   }

//   // step up turn
//   if (playedNumber[0] == "S") {
//     lobbyUpdater.addTurn(2)
//   } else {
//     lobbyUpdater.addTurn()
//   }

//   // TODO: dont forgot to add the card to discardpile and remove from hand
//   lobbyUpdater.addDiscardPile(cardsPlayed)
//   playerUpdater.removeCardOnHand(cardsPlayedNumbers)

//   // AFTER ENTIRE THING FINISHED
//   playerUpdater.log()
//   lobbyUpdater.log()
//   // await playerUpdater.saveUpdate()
//   // await lobbyUpdater.saveUpdate()
//   return next()
// }