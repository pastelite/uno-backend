import { Request, Response, NextFunction, Router } from "express";
import { listLobby, createLobby, joinLobby, jwtAuthentication } from "../controller/lobbyController";
import { getLobbyAction, lobbyDefaultReply, postLobbyAction } from "../controller/gameControllerOld";
import { PrismaClient } from "@prisma/client";
import { LobbyUpdater } from "../utils/gameTools";
import { lobbyGet, lobbyPost } from "../controller/gameController";

// /lobby/:code/
let lobbyRouter = Router();
lobbyRouter.use('/',jwtAuthentication)
lobbyRouter.get('/',lobbyGet)
lobbyRouter.post('/',lobbyPost)
// lobbyRouter.get('/',getLobbyAction, lobbyDefaultReply)
// lobbyRouter.post('/',postLobbyAction, lobbyDefaultReply)

// /lobby/
let router = Router();
router.get('/',listLobby)
router.post('/create',createLobby)
router.post('/join',joinLobby)
router.post('/auth',jwtAuthentication,(a,b,c)=>{
  b.send({message:"pass!",lobby:a.lobby,player:a.player})
})

// TEST SECTION
router.get('/test',async (req,res,next)=>{
  // res.send("hi")
  const ps = new PrismaClient()
  let lobby = await ps.lobby.findFirst({
    where: {
      code: "CFEI"
    },
    include: {
      playerList: true
    }
  })
  let lu = new LobbyUpdater({...lobby!})
  lu.lobby.way = -1
  for (let k =0;k<=5;k++) {
    console.log("====="+k+"=====")
    lu.addTurn()
    console.log(lu.lobby.playerTurn)
  }
  res.send(200)
})

router.use('/:code/',(req,res,next)=>{
  // console.log(req.params)
  req.account = req.params
  next()
},lobbyRouter)

module.exports = router