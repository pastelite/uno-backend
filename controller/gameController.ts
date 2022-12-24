import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient()

import { RequestHandler } from "express";
import rulesetReader from "../utils/rulesetReader";

export let getLobbyAction: RequestHandler = async (req, res, next) => {
  switch (req.query.action || req.query.a) {
    case undefined:
    case null:
      return next()
    default:
      return res.status(400).json({
        message: "action is not supported"
      })
  }
}

export let postLobbyAction: RequestHandler = async (req, res, next) => {
  switch (req.query.action || req.query.a) {
    case "start":
      return lobbyStart(req, res, next)
    case "play":
      return playCard(req, res, next)
    default:
      return res.status(400).json({
        message: "action is not supported"
      })
  }
}

export let lobbyDefaultReply: RequestHandler = async (req, res, next) => {
  // can't be null because of jwtAuthentication
  let { cardsList, playerList, ...lobby } = req.lobby!
  let cardOnTop = cardsList.substring(0, 2)

  // count card nums and remove cardsList
  playerList.map((p:any)=>{
    p.cardsCount = p.cardsList.length / 2
    delete p.cardsList
  })

  // Return
  return res.status(200).json({
    message: req.message,
    lobby: { cardOnTop, ...lobby,playerList },
    player: req.player
  })
}

let lobbyStart: RequestHandler = async (req, res, next) => {
  let {code, isStart, cardsList,...lobby} = req.lobby!
  let ruleset = rulesetReader(lobby.ruleset)

  // all active player draw
  for (let player of lobby.playerList) {
    // get n cards from cardsLists
    let cardOnHand = cardsList.substring(0,2*ruleset.startDraw)
    cardsList = cardsList.substring(2*ruleset.startDraw)

    await prisma.player.update({
      where: {id: player.id},
      data: {
        cardsList: cardOnHand
      }
    })
  }

  // update lobby
  await prisma.lobby.update({
    where: {code},
    data: {
      isStart: true,
      cardsList
    }
  })

  req.message = "started"
  next()
}

let playCard: RequestHandler = async (req, res, next) => {
  let cardPlayed = req.body.card

  // check turn
  if (req.lobby?.playerTurn != req.player?.lobbyOrder) {
    req.message = "not your turn"
    return next()
  }

  // check cardlist
  if (cardPlayed.length % 2 != 0 || cardPlayed.length == 0) {
    req.message = "card input incorrect"
    return next()
  }
}