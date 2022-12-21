import { RequestHandler } from "express"
import randomstring from "randomstring"

import { Lobby, PrismaClient } from '@prisma/client'
import { PrismaClientKnownRequestError } from "@prisma/client/runtime"
import { json } from "stream/consumers"
import { unoShuffle } from "../utils/unoTools"
const prisma = new PrismaClient()

export let listLobby: RequestHandler = async (req, res, next) => {

  let lobbyList = await prisma.lobby.findMany({
    select: {
      code: true,
      name: true,
      description: true
    }
  })

  res.status(200).json(lobbyList)
}

export let createLobby: RequestHandler = async (req, res, next) => {

  if (req.body.roomName == null || req.body.playerName == null) {
    return res.status(400).json({
      message: "please specify roomName and playerName"
    })
  }

  let a = prisma.lobby.count({
    where: {
      code: randomstring.generate({
        length: 4,
        charset: 'alphabetic',
        capitalization: 'uppercase'
      })
    }
  })

  // Generate code
  let code = ""

  let lobbyList = (await prisma.lobby.findMany({
    select: {
      code: true
    }
  })).map(e => e.code)

  do {
    code = randomstring.generate({
      length: 4,
      charset: 'alphabetic',
      capitalization: 'uppercase'
    })
  } while (lobbyList.includes(code))

  // get cardList
  let cardsList = unoShuffle().join('')

  // create lobby
  let lobby = await prisma.lobby.create({
    data:{
      code: code,
      name: req.body.roomName,
      cardsList: cardsList,
      description: req.body.roomDesc
    }
  })

  // create user
  let user = await prisma.player.create({
    data: {
      lobbyCode: lobby.code,
      lobbyOrder: 0,
      name: req.body.playerName,
    }
  })

  res.status(200).json({
    user: user,
    lobby
  })
}