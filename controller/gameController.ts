import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient()

import { RequestHandler } from "express";

export let getLobbyAction: RequestHandler = async (req, res, next) => {
  switch (req.query.action || req.query.a) {
    case undefined:
    case null:
      return getLobby(req, res, next)
    default:
      return res.status(400).json({
        message: "action is not supported"
      })
  }
}

export let postLobbyAction: RequestHandler = async (req, res, next) => {
  switch (req.query.action || req.query.a) {
    default:
      return res.status(400).json({
        message: "action is not supported"
      })
  }
}

let getLobby: RequestHandler = async (req, res, next) => {
  // can't be null because of jwtAuthentication
  if (req.account.code != req.lobby!.code) {
    return res.status(403).json({
      message: "you not allowed to access the lobby of other player",
      params: req.account.code,
      lobby: req.lobby!.code
    })
  }

  let { cardsList, ...lobby } = req.lobby!
  let cardOnTop = cardsList.substring(0, 2)
  let playersList = (await prisma.player.findMany({
    where: {
      lobbyCode: lobby.code,
      isActive: true
    }
  })).map((obj: any) => {
    // use delete for performance
    let { cardsList, ...rest } = obj
    delete rest.lobbyCode
    delete rest.isActive
    rest["cardsNum"] = cardsList.length
    return rest
  })

  // Return
  return res.status(200).json({
    lobby: { cardOnTop, playersList, ...lobby },
    player: req.player
  })
}

let postStart: RequestHandler = async (req, res, next) => {
  let lobby = req.lobby!

  // update lobby to start
  let newLobby = await prisma.lobby.update({
    where: {
      code: lobby.code
    },
    data: {
      isStart: true
    }
  })

}