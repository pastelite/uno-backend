import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient()

import { RequestHandler } from "express";
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

let playCard: RequestHandler = async (req, res, next) => {
  let cardsPlayedNumbers: number[] = req.body.cards

  let lobbyUpdater = new LobbyUpdater(req.lobby!)
  let playerUpdater = new PlayerUpdater(req.player!)

  let ruleset = lobbyUpdater.getRuleset()

  // check turn
  if (lobbyUpdater.lobby.playerTurn != playerUpdater.player.lobbyOrder) {
    req.message = "not your turn"
    return next()
  }

  if (!cardsPlayedNumbers) {
    req.message = "please list card(s) that you want to play in \"cards\""
    return next()
  }

  let cardsPlayed = []
  for (let i of cardsPlayedNumbers) {
    let card = playerUpdater.cardsOnHand[i]
    if (!card) {
      req.message = "one of the played card is not exists"
      return next()
    }
    cardsPlayed.push(card)
  }

  // check if more than the rule allow
  if (cardsPlayed.length > 1 && ruleset.canStackCards == false) {
    console.log(ruleset)
    req.message = "cannot stack as specify in the ruleset"
    return next()
  }

  // SET COLOR/NUMBER OF PLAYED CARD
  let playedColor = cardsPlayed[0][0], playedNumber = cardsPlayed[0][1]
  let topColor = lobbyUpdater.getTopCard()[0], topNumber = lobbyUpdater.getTopCard()[1]

  // check if it's a stack
  if (cardsPlayed.length > 1) {
    let mode: "color" | "number" | "plus"
    let returnCardInput = () => {
      req.message = "card input is not match"
      next()
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

  // GAMEPLAY
  if (topColor != playedColor && topNumber != playedNumber && playedColor != "S") {
    req.message = "bro, it's not match wtf are you doing"
    return next()
  }

  // + on stack
  if (topNumber == "T" || topNumber == "F") {
    // if cannot stack
    if (ruleset.canStackPlus == false) {
      // draw
      let drawedCard = lobbyUpdater.drawsFromPlusCount()
      playerUpdater.addCardOnHand(drawedCard)
      // if can stack plus and playing +
    } else if (playedNumber[0] == "T" || playedNumber[0] == "F") {
      for (let char of playedNumber) {
        lobbyUpdater.addPlusCount(char)
      }
      // if can stack plus and playing other
    } else {
      // draw
      let drawedCard = lobbyUpdater.drawsFromPlusCount()
      playerUpdater.addCardOnHand(drawedCard)
    }
  }

  // played +
  if (playedNumber[0] == "T" || playedNumber[0] == "F") {
    for (let char of playedNumber) {
      lobbyUpdater.addPlusCount(char)
    }
  }

  // TODO: stop/reverse/thing like that

  // AFTER ENTIRE THING FINISHED
  playerUpdater.log()
  lobbyUpdater.log()
  // await playerUpdater.saveUpdate()
  // await lobbyUpdater.saveUpdate()
}