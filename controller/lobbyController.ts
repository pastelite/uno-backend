import { RequestHandler } from "express"
import randomstring from "randomstring"
import { sign } from "jsonwebtoken"
import { Lobby, PrismaClient } from '@prisma/client'
import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt"
import { json } from "stream/consumers"
import { unoShuffle } from "../utils/unoTools"
import passport from "passport"
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
    data: {
      code: code,
      name: req.body.roomName,
      cardsList: cardsList,
      description: req.body.roomDesc,
      playerNum: 1, // 1 from room owner
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

  // get jwt
  let jwt = sign(
    {
      player: user.id,
      lobby: lobby.code
    },
    process.env.SECRET,
    //{ expiresIn: "1h" } no expiration since user will be deleted anyway
  )

  res.status(200).json({
    jwt,
    lobby: {
      code: lobby.code,
      name: lobby.name,
      description: lobby.description,
    },
    player: {
      name: user.name,
      order: user.lobbyOrder
    }
  })

}

export let joinLobby: RequestHandler = async (req, res, next) => {
  // check
  if (req.body.roomCode == null || req.body.playerName == null) {
    return res.status(400).json({
      message: "please specify roomCode and playerName"
    })
  }


  // get lobby
  let lobby = await prisma.lobby.findFirst({
    where: {
      code: req.body.roomCode
    }
  })

  if (lobby == null) {
    return res.status(400).json({
      message: "room not found"
    })
  }

  // create player
  let player = await prisma.player.create({
    data: {
      lobbyCode: lobby.code,
      lobbyOrder: lobby.playerNum,
      name: req.body.playerName,
    }
  })

  // update lobby (add +1 to player num)
  lobby = await prisma.lobby.update({
    where: {
      code: lobby.code
    },
    data: {
      playerNum: lobby.playerNum + 1
    }
  })

  // get jwt
  let jwt = sign(
    {
      player: player.id,
      lobby: lobby.code
    },
    process.env.SECRET,
    //{ expiresIn: "1h" } no expiration since user will be deleted anyway
  )

  res.status(200).json({
    jwt,
    lobby: {
      code: lobby.code,
      name: lobby.name,
      description: lobby.description,
    },
    player: {
      name: player.name,
      order: player.lobbyOrder
    }
  })
}

export let getLobby: RequestHandler = async (req, res, next) => {
  // can't be null because of jwtAuthentication
  if (req.account.code != req.lobby!.code) {
    return res.status(403).json({
      message: "you not allowed to access the lobby of other player",
      params: req.account.code,
      lobby: req.lobby!.code
    })
  }

  let lobby = req.lobby!
  let cardOnTop = lobby.cardsList.substring(0,2)
  let playersList: any = (await prisma.player.findMany({
    select: {
      id: true,
      lobbyOrder: true,
      name: true,
      cardsList: true,
      // lobbyCode: false,
    },
    where: {
      lobbyCode: lobby.code,
      isActive: true
    }
  })).map((e:any)=>{
    e.cardsNum = e.cardsList.length
    delete e.cardsList
    return e
  })

  return res.status(200).json({
    lobby: {
      code: lobby.code,
      name: lobby.name,
      description: lobby.description,
      turnNo: lobby.turnNo,
      way: lobby.way,
      isStart: lobby.way,
      cardOnTop,
      playersList
    },
    player: req.player
  })
}

export let jwtAuthentication: RequestHandler = async (req, res, next) => {
  passport.authenticate(
    new JwtStrategy({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.SECRET,
      //passReqToCallback: true
    }, async (payload, done) => {

      // get player and lobby
      let player = await prisma.player.findFirst({
        where: {
          id: payload.player
        }
      })
      let lobby = await prisma.lobby.findFirst({
        where: {
          code: payload.lobby
        }
      })

      // return player and lobby
      if (payload == null||lobby == null) {
        done(null,false,"player code or lobby code incorrected")
      } else {
        done(null, {lobby,player})
      }
    }
    ),{ session: false }, (err, user, info)=>{
      // if (user)
      if (err || user == false) {
        res.status(403).json({
          message: info
        })
      } else {
        req.lobby = user.lobby
        req.player = user.player
        next()
      }
    }
  )(req,res,next)
}