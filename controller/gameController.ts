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
  let plusCount = req.lobby!.plusCount
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

  // check if more than the rule allow
  if (cardsPlayed.length > 1 && ruleset.canStackCards == false) {
    req.message = "cannot stack as specify in the ruleset"
    return next()
  }


  // find color/number that player played
  let colorPlayed = "?", numberPlayed = "?"
  let colorTop = "?", numberTop = "?"

  // for player
  if (cardsPlayed.length == 1) {
    colorPlayed = cardsPlayed[0][0]
    numberPlayed = cardsPlayed[0][1]
  } else {
    let mode: "color" | "number" | "plus"
    let returnCardInput = () => {
      req.message = "card input is not match"
      next()
    }

    colorPlayed = cardsPlayed[0][0]
    numberPlayed = cardsPlayed[0][1]

    // check first two cards
    if (cardsPlayed[0][0] == cardsPlayed[1][0]) {
      mode = "color"
    } else if (cardsPlayed[0][1] == cardsPlayed[1][1]) {
      mode = "number"
    } else if (
      (cardsPlayed[0][1] == "T" || cardsPlayed[0][1] == "F")
      && (cardsPlayed[1][1] == "T" || cardsPlayed[1][1] == "F")
    ) {
      mode = "plus"
      numberPlayed = cardsPlayed[0][1] + cardsPlayed[1][1]
    } else {
      return returnCardInput()
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
        case "plus":
          if (cardsPlayed[i][0] != "T" || cardsPlayed[i][0] != "F") {
            return returnCardInput();
          } else {
            numberPlayed += cardsPlayed[i][0];
          }
          break;
      }
    }
  }

  console.log(colorPlayed, numberPlayed)

  // for card on the top of lobbyList
  colorTop = cardsListLobby[0][0]
  numberTop = cardsListLobby[0][1]

  // GAMEPLAY
  if (colorTop != colorPlayed && numberTop != numberPlayed && colorPlayed != "S") {
    req.message = "bro, it's not match wtf are you doing"
    return next()
  }

  // + on stack
  if (numberTop == "T" || numberTop == "F") {
    // if cannot stack
    if (ruleset.canStackPlus == false) {
      // draw
      let cardsDrawed
      [cardsDrawed, cardsListLobby] = drawCardsArray(
        cardsListLobby,
        plusCount
      )
      cardsListPlayer.concat(cardsDrawed)
    // if can stack plus and playing +
    } else if (numberPlayed[0] == "T" || numberPlayed[0] == "F") {
      for (let char of numberPlayed) {
        switch (char) {
          case "F":
            plusCount += 2
          case "T":
            plusCount += 2
        }
      }
      console.log(plusCount)
    // if can stack plus and playing other
    } else {
      // draw
      let cardsDrawed
      [cardsDrawed, cardsListLobby] = drawCardsArray(
        cardsListLobby,
        plusCount
      )
      cardsListPlayer.concat(cardsDrawed)
    }
  }

  // played +
  if (numberPlayed[0] == "T" || numberPlayed[0] == "F") {
    for (let char of numberPlayed) {
      switch (char) {
        case "F":
          plusCount += 2
        case "T":
          plusCount += 2
      }
    }
    console.log(plusCount)
  }

  // TODO: stop/reverse/thing like that

  // AFTER ENTIRE THING FINISHED
  // await updateLobbyCards(req.lobby!.code,cardsListLobby.join(""))
  // await updatePlayerCards(req.player!.id,cardsListPlayer.join(""))

}