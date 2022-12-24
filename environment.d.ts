import { Lobby, Player, Prisma } from "@prisma/client";
import { Passport } from "passport";

const lobbyWithPlayer = Prisma.validator<Prisma.LobbyArgs>()({
  include: {playerList: true}
})

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      GITHUB_AUTH_TOKEN: string;
      NODE_ENV: 'development' | 'production';
      PORT?: string;
      // PWD: string;
      SECRET: string;
    }
  }

  namespace Express {
    export interface Request {
      account?: any       // what usually passthorugh using passport
      jwtPayload?: any   
      // from our database:
      player?: Player
      lobby?: Prisma.LobbyGetPayload<typeof lobbyWithPlayer>
      message?: string
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {}