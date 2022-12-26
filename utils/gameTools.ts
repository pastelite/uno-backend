import { Lobby, Player, Prisma, PrismaClient } from "@prisma/client";
import rulesetTools from "./rulesetTools";
const prisma = new PrismaClient()

const lobbyWithPlayer = Prisma.validator<Prisma.LobbyArgs>()({
  include: {playerList: true}
})


// export async function updatePlayerCards(playerId:number,cards:string) {
//   return await prisma.player.update({
//     where: { id: playerId },
//     data: {
//       cardsList: cards
//     }
//   })
// }

// export async function updateLobbyCards(lobbyCode:string,cards:string) {
//   return await prisma.lobby.update({
//     where: { code: lobbyCode },
//     data: {
//       cardsList: cards
//     }
//   })
// }

export class LobbyUpdater {
  public lobby: Prisma.LobbyGetPayload<typeof lobbyWithPlayer>;
  public drawPile: string[] = [];
  public discardPile: string[] = [];

  constructor(lobby: Prisma.LobbyGetPayload<typeof lobbyWithPlayer>) {
    this.lobby = lobby

    // convert drawPile to string[]
    for (let i = 0; i<lobby.drawPile.length;i+=2) {
      this.drawPile.push(this.lobby.drawPile.slice(i,i+2))
    }
    console.log(this.drawPile)
    // convert discardPile to string[]
    for (let i = 0; i<lobby.discardPile.length;i+=2) {
      this.discardPile.push(this.lobby.discardPile.slice(i,i+2))
    }
    console.log(this.discardPile)
  }

  draws(n: number) {
    let drawedList = this.drawPile.slice(0,n)
    let remainList = this.drawPile.slice(n)

    this.drawPile = remainList
    
    return drawedList;
  }

  getTopCard() {
    return this.discardPile[0]
  }

  getRuleset() {
    return rulesetTools(this.lobby.ruleset)
  }

  drawsFromPlusCount() {
    let plusCount = this.lobby.plusCount
    this.lobby.plusCount = 0
    return this.draws(plusCount)
  }

  addPlusCount(char: string) {
    switch (char) {
      case "F":
        this.lobby.plusCount += 2
      case "T":
        this.lobby.plusCount += 2
        break;
    }
  }

  addDiscardPile(data: string[]) {
    data.reverse()
    this.discardPile = this.discardPile.concat(data)
  }

  log() {
    console.log(this.lobby)
  }

  async saveUpdate() {
    this.lobby.drawPile = this.drawPile.join('')
    this.lobby.discardPile = this.discardPile.join('')

    // remove player list
    let {playerList, ...lobby} = this.lobby

    return await prisma.lobby.update({
      where: { code: this.lobby.code },
      data: {
        ...lobby
      }
    })
  }
}

export class PlayerUpdater {
  public player: Player;
  public cardsOnHand: string[];

  constructor(player: Player) {
    this.player = player
    this.cardsOnHand = []

    // conveart cardsOnHand to string[]
    for (let i = 0; i<player.cardsOnHand.length;i+=2) {
      this.cardsOnHand.push(this.player.cardsOnHand.slice(i,i+2))
    }
  }

  log() {
    console.log(this.player)
  }

  addCardOnHand(data: string[]) {
    this.cardsOnHand = this.cardsOnHand.concat(data)
    //this.player.cardsOnHand += data.join('')
  }

  async saveUpdate() {
    this.player.cardsOnHand = this.cardsOnHand.join('')

    return await prisma.player.update({
      where: { id: this.player.id },
      data: {
        ...this.player
      }
    })
  }
}