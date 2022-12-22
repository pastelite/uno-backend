import { ExtractJwt, Strategy as JwtStrategy, VerifiedCallback, VerifyCallbackWithRequest } from "passport-jwt"
import { Request } from "express";
import passport from "passport"
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// export const jwtSrat = 


export default function () {
  passport.use('jwt', new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.SECRET,
    passReqToCallback:true
  }, async (req:Request, payload:any, done: VerifiedCallback) => {
    req.jwtPayload = payload
    //done(null, false, {"message":"achooo"})
    done(null, {}, "lala")
  }))
}