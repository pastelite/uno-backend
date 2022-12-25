import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient()

export async function updatePlayerCards(playerId:number,cards:string) {
  return await prisma.player.update({
    where: { id: playerId },
    data: {
      cardsList: cards
    }
  })
}

export async function updateLobbyCards(lobbyCode:string,cards:string) {
  return await prisma.lobby.update({
    where: { code: lobbyCode },
    data: {
      cardsList: cards
    }
  })
}