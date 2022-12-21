import { Request, Response, NextFunction, Router } from "express";
import { listLobby, createLobby } from "../controller/lobbyController";
import { route } from ".";

var router = Router();

router.get('/',listLobby)
router.post('/create',createLobby)

module.exports = router