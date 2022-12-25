import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient()

import { RequestHandler } from "express";
import rulesetReader from "../utils/rulesetTools";
import { drawCards, drawCardsArray, unoStringToArray } from "../utils/cardsTools";
import { updateLobbyCards, updatePlayerCards } from "../utils/gameTools";

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
    // return res.status(400).json({
    //   message: "action is not supported"
    // })
  }
}

export let lobbyDefaultReply: RequestHandler = async (req, res, next) => {
  // can't be null because of jwtAuthentication
  let { cardsList, playerList, ...lobby } = req.lobby!
  let cardOnTop = cardsList.substring(0, 2)

  // count card nums and remove cardsList
  playerList.map((p: any) => {
    p.cardsCount = p.cardsList.length / 2
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
  let { code, isStart, cardsList, ...lobby } = req.lobby!
  let ruleset = rulesetReader(lobby.ruleset)

  // all active player draw
  for (let player of lobby.playerList) {
    let cardsOnHand;
    [cardsOnHand, cardsList] = drawCards(cardsList, ruleset.startDraw)

    await updatePlayerCards(player.id, cardsOnHand)
  }

  await updateLobbyCards(code, cardsList)

  req.message = "started"
  next()
}

let playCard: RequestHandler = async (req, res, next) => {
  let cardsPlayedNumbers: number[] = req.body.cards
  let cardsListLobby = unoStringToArray(req.lobby!.cardsList)
  let cardsListPlayer = unoStringToArray(req.player!.cardsList)
  let ruleset = rulesetReader(req.lobby!.ruleset)
  // let cardOnTop = cardsList[0]

  // check turn
  if (req.lobby!.playerTurn != req.player!.lobbyOrder) {
    req.message = "not your turn"
    return next()
  }

  if (!cardsPlayedNumbers) {
    req.message = "please list card(s) that you want to play in \"cards\""
    return next()
  }

  let cardsPlayed = []
  for (let i of cardsPlayedNumbers) {
    let card = cardsListPlayer[i]
    if (!card) {
      req.message = "one of the played card is not exists"
      return next()
    }
    cardsPlayed.push(card)
  }
  // console.log(cardsListPlayer)
  // console.log(cardsPlayed)


  // find color/number that player played
  let colorPlayed = "?", numberPlayed = "?"
  let colorTop = "?", numberTop = "?"

  // for player
  if (cardsPlayed.length == 1) {
    colorPlayed = cardsPlayed[0][0]
    numberPlayed = cardsPlayed[0][1]
  } else {
    let mode: "color" | "number"
    let returnCardInput = () => {
      req.message = "card input is not match"
      next()
    }

    // check first two cards
    if (cardsPlayed[0][0] == cardsPlayed[1][0]) {
      mode = "color"
    } else if (cardsPlayed[0][1] == cardsPlayed[1][1]) {
      mode = "number"
    } else {
      return returnCardInput()
    }

    if (mode == "color") {
      colorPlayed = cardsPlayed[0][0]
    } else if (mode == "number") {
      colorPlayed = cardsPlayed[0][1]
    }

    // check the rest of cards
    for (let i = 2; i < cardsPlayed.length; i++) {
      switch (mode) {
        case "number":
          if (numberPlayed != numberPlayed[i][0]) {
            return returnCardInput()
          }
          break;
        case "color":
          if (colorPlayed != cardsPlayed[i][0]) {
            return returnCardInput()
          }
          break;
      }
    }
  }

  // for card on the top of lobbyList
  colorTop = cardsListLobby[0][0]
  numberTop = cardsListLobby[0][1]

  // GAMEPLAY
  if (colorTop != colorPlayed && numberTop != numberPlayed && colorPlayed != "S") {
    req.message = "bro, it's not match wtf are you doing"
    return next()
  }

  // check for +
  if (numberTop == "T" || numberTop == "F") {
    if (ruleset.canStackPlus == false) {
      let cardsDrawed
      [cardsDrawed, cardsListLobby] = drawCardsArray(
        cardsListLobby,
        numberTop == "T"?2:numberTop == "F"?4:0
      )
    } else if (numberPlayed) {
      // TODO: +2/+4
      // TODO: stack support
    }
  }

  // AFTER ENTIRE THING FINISHED
  // await updateLobbyCards(req.lobby!.code,cardsListLobby.join(""))
  // await updatePlayerCards(req.player!.id,cardsListPlayer.join(""))


  // // check did user have cards
  // if (!cardsPlayedString) {
  //   req.message = "where tf is your card"
  //   return next()
  // }

  // // check cardlist
  // if (cardsPlayedString.length % 2 != 0 || cardsPlayedString.length == 0) {
  //   req.message = "card input incorrect"
  //   return next()
  // }

  // let cardsPlayed = unoStringToArray(cardsPlayedString)
  // // check if card exist in player hand
  // for (let c of cardsPlayed) {
  //   if (!cardsListPlayer.includes(c)) {
  //     req.message = "this card not exists in your hand"
  //     return next()
  //   }
  // }

  // // Check color and number of cards
  // let colorPlayed = "?", numberPlayed = "?"
  // let colorTop: string, numberTop: string

  // // for cardsPlayed
  // if (cardsPlayed.length == 1) {
  //   colorPlayed = cardsPlayed[0][0]
  //   numberPlayed = cardsPlayed[0][1]
  // } else {
  //   let mode: "color" | "number"
  //   let returnCardInput = () => {
  //     req.message = "card input is not match"
  //     next()
  //   }

  //   // check first cards
  //   if (cardsPlayed[0][0] == cardsPlayed[1][0]) {
  //     mode = "color"
  //   } else if (cardsPlayed[0][1] == cardsPlayed[1][1]) {
  //     mode = "number"
  //   } else {
  //     return returnCardInput()
  //   }

  //   if (mode == "color") {
  //     colorPlayed = cardsPlayed[0][0]
  //   } else if (mode == "number") {
  //     colorPlayed = cardsPlayed[0][1]
  //   }

  //   // check the rest of cards
  //   for (let i = 2; i < cardsPlayed.length; i++) {
  //     switch (mode) {
  //       case "number":
  //         if (numberPlayed != numberPlayed[i][0]) {
  //           return returnCardInput()
  //         }
  //         break;
  //       case "color":
  //         if (colorPlayed != cardsPlayed[i][0]) {
  //           return returnCardInput()
  //         }
  //         break;
  //     }
  //   }
  // }

  // // for card on the top of lobbyList
  // colorTop = cardsListLobby[0][0]
  // numberTop = cardsListLobby[0][1]

  // // Gameplay
  // // check color/number/symbol
  // if (colorTop != colorPlayed && numberTop != numberPlayed && colorPlayed != "S") {
  //   req.message = "bro, it's not match wtf are you doing"
  //   return next()
  // }

  // // check for +
  // if (numberTop == "T" || numberTop == "F") {
  //   if (ruleset.canStackPlus == false) {
  //     let cardsDrawed
  //     [cardsDrawed, cardsListLobby] = drawCardsArray(
  //       cardsListLobby,
  //       numberTop == "T"?2:numberTop == "F"?4:0
  //     )
  //   }
    
  // }

  // // logic
  // // normal color case
  // if (!(
  //   colorTop == colorPlayed ||
  //   numberTop == numberPlayed ||
  //   colorPlayed == "S"
  // )) {
  //   req.message = "shitty input lol"
  //   return next()
  // }

  // // if (numberTop == "T")

  // // check for +
  // if (
  //   (numberTop == "F" || numberTop == "T") && 
  //   !(numberPlayed == "F" || numberPlayed == "T")
  // ) {
  //   // TODO: draw
  // }

  // special

}