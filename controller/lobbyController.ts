import { RequestHandler } from "express"
import randomstring from "randomstring"
import { sign } from "jsonwebtoken"
import { Lobby, PrismaClient } from '@prisma/client'
import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt"
import { json } from "stream/consumers"
import { unoShuffle } from "../utils/cardsTools"
import passport from "passport"
const prisma = new PrismaClient()

export let listLobby: RequestHandler = async (req, res, next) => {

  if (req.query.help) {
    return res.status(200).render('doc', {
      path: "/lobby/",
      type: "get",
      explain: "list the lobby",
      body: {
        name: {
          data: "lala"
        },
        name2: "idk bro"
      }
    })
  }

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
      drawPile: cardsList,
      discardPile: "",
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

export let jwtAuthentication: RequestHandler = async (req, res, next) => {
  passport.authenticate(
    new JwtStrategy({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.SECRET,
    }, async (payload, done) => {

      // sdaweq
      let lobby = await prisma.lobby.findFirst({
        where: {code: payload.lobby},
        include: {playerList: true},
      })

      // check player id
      let player;
      for (let p of lobby?.playerList || []) {
        if (p.id == payload.player) {
          player = structuredClone(p)
          break;
        }
      }

      // return player and lobby
      if (!lobby) {
        done(null, false, "lobby does not exists")
      } else if (!player) {
        done(null, false, "you not allowed to access the lobby of other player")
      } else {
        done(null, {lobby,player})
      }
    }
    ), { session: false }, (err, user, info) => {

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
  )(req, res, next)
}