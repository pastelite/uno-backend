import { Request, Response, NextFunction, RequestHandler } from "express";
import { LobbyUpdater, PlayerUpdater } from "../utils/gameTools";

type a = Parameters<RequestHandler>
// type G = (args: a, lobby: LobbyUpdater, player: PlayerUpdater)=>void;

type GameplayRequestHandler = (req: Request, res: Response, next: NextFunction, lobby: LobbyUpdater, player: PlayerUpdater) => void;

export const lobbyGet: RequestHandler = (req, res, next) => {
  // can't be null because of jwtAuthentication
  // let { discardPile, playerList, ...lobby } = req.lobby!
  // let cardOnTop = discardPile.slice(-2)

  // // count card nums and remove cardsList
  // playerList.map((p: any) => {
  //   p.cardsCount = p.cardsOnHand.length / 2
  //   delete p.cardsList
  // })

  // // Return
  // return res.status(200).json({
  //   message: req.message,
  //   lobby: { cardOnTop, ...lobby, playerList },
  //   player: req.player
  // })
  // do this to make debug easier
  res.status(200).json({
    lobby: req.lobby,
    player: req.player
  })
}

export let lobbyPost: RequestHandler = async (req, res, next) => {
  let lu = new LobbyUpdater(req.lobby!)
  let pu = new PlayerUpdater(req.player!)
  let ruleset = lu.getRuleset()

  pu.player.isPlayed = req.body.p
  pu.player.isDrawed = req.body.d

  // CHECK AVAILABLE ACTION

  let availableAction: { [key: string]: [boolean, string] } = {
    play: [true, ""], //play
    draw: [true, ""], //draw
    end: [true, ""]  //end turn
  }
  let availableActionFunction: {[key: string]:GameplayRequestHandler} = {
    play: playCards,
    draw: drawCards,
    end: endTurn
  }
  // case when there's a +
  if (!ruleset.canStackPlus && lu.lobby.plusCount > 0) {
    availableAction.draw = availableAction.end = [false, "there's a plus count, you have to draw first"]
  } else if (ruleset.canStackPlus && lu.lobby.plusCount > 0) {
    availableAction.end = [false, "there's a plus count, you have to draw or stack + first"]
  } else {
    // normal case
    if (pu.player.isPlayed) {
      availableAction.play = [false, "you already played a card"]
    }

    if (pu.player.isPlayed || pu.player.isDrawed) {
      availableAction.draw = [false, "you already drawed a card"]
    }

    if (!pu.player.isDrawed && !pu.player.isPlayed) {
      availableAction.end = [false, "you have to draw or play a card first"]
    }
  }

  console.log(availableAction)

  let action: string = req.query["action"] as string || req.query.a as string

  if (availableAction[action]) {
    if (availableAction[action][0] == true) {
      availableActionFunction[action](req,res,next,lu,pu)
    } else {
      return res.status(400).json({
        message: availableAction[action][1]
      })
    }
  } else if (action == "check") {
    res.status(200).json({
      availableAction
    })
  } else {
    res.status(400).json({
      message: `the action "${action}" did not exists`
    })
  }
}

const playCards: GameplayRequestHandler = (req, res, next, lu, pu) => {
  let ruleset = lu.getRuleset()
  let cardsPlayedNumbers: number[] = req.body.cards || []

  // get played cards
  let cardsPlayed = []
  for (let i of cardsPlayedNumbers) {
    let card = pu.cardsOnHand[i]
    if (!card) {
      return res.status(400).json({
        message: "one of the played you listed is not exists"
      })
    }
    cardsPlayed.push(card)
  }

  // check number of played card
  if (cardsPlayed.length == 0) {
    return res.status(400).json({
      message: "\"cards\" shouldn't be empty"
    })
  }

  // check stacking cards
  if (!ruleset.canStackCards && cardsPlayed.length > 1) {
    return res.status(400).json({
      message: "you cannot stack your cards as specify in ruleset"
    })
  }

  // get played card stats
  let playedColor = cardsPlayed[0][0], playedNumber = cardsPlayed[0][1]
  let topColor = lu.getTopCard()[0], topNumber = lu.getTopCard()[1]

  // color/number of played card(s)
  if (cardsPlayed.length > 1) {
    let mode: "color" | "number" | "plus"
    let returnCardInput = () => {
      res.status(400).json({
        message: "your card input do not match"
      })
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

  // pluscount check
  if (lu.lobby.plusCount > 0) {
    if (playedColor[0] == "T" || playedColor[0] == "F") {
      for (let char of playedNumber) {
        lu.addPlusCount(char)
      }
    } else {
      return res.status(400).json({
        message: "there's a plus on top of the discard pile, you can either stacking + or draws"
      })
    }
  }

  // color/symbol check
  if (topColor != playedColor && topNumber != playedNumber && playedColor != "S") {
    return res.status(400).json({
      message: "the color/symbol do not match"
    })
  }

  // reverse
  if (playedNumber[0] == "R") {
    lu.lobby.way = -lu.lobby.way
  }

  // stop
  if (playedNumber[0] == "S") {
    lu.toNextPlayer()
    // to next player once since end turn will also to next player
  }

  // TODO: color changer

  req.message = "ok"
  pu.player.isPlayed = true
  pu.removeCardOnHand(cardsPlayedNumbers)
  lu.addDiscardPile(cardsPlayed)
  pu.log()
  lu.log()
  return next()
}

const drawCards: GameplayRequestHandler = (req, res, next, lu, pu) => {
  // draw for plusCount != isDrawed
}

const endTurn: GameplayRequestHandler = (req, res, next, lu, pu) => {

}