import { Request, Response, NextFunction, Router } from "express";
import { listLobby, createLobby, joinLobby, jwtAuthentication } from "../controller/lobbyController";
import { getLobbyAction, postLobbyAction } from "../controller/gameController";

// /lobby/:code/
let lobbyRouter = Router();
lobbyRouter.use('/',jwtAuthentication)
lobbyRouter.get('/',getLobbyAction)
lobbyRouter.post('/',postLobbyAction)

// /lobby/
let router = Router();
router.get('/',listLobby)
router.post('/create',createLobby)
router.post('/join',joinLobby)
router.post('/auth',jwtAuthentication,(a,b,c)=>{
  b.send({message:"pass!",lobby:a.lobby,player:a.player})
})
router.use('/:code/',(req,res,next)=>{
  // console.log(req.params)
  req.account = req.params
  next()
},lobbyRouter)

module.exports = router