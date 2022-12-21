import { Request, Response, NextFunction } from "express";
import { genSalt, hash, compare } from "bcrypt"
import validator from "validator"
import passwordValidator from "../utils/passwordValidator";
import jwt from "jsonwebtoken"

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export async function checkInput(req: Request, res: Response, next: NextFunction) {
  //validate username
  if (!validator.isAlphanumeric(req.body.username)) {
    return res.status(400).json({
      message: "username not allowed, contain weird character"
    })
  }

  // validate password
  let validationResult = passwordValidator(req.body.password)
  if (validationResult != "ok") {
    return res.status(400).json({
      message: "password incorrect, " + validationResult
    })
  }

  next()
}

export function registerUser(req: Request, res: Response, next: NextFunction) {
  const body = req.body

  genSalt(10, (err, salt) => {
    hash(body.password, salt, async (err, hash) => {
      try {
        let user = await prisma.user.create({
          data: {
            username: body.username,
            password: hash,
            salt: salt,
          }
        })
        res.status(200).json({
          message: "successesfully create user",
          user: {
            id: user.id,
            username: user.username,
            password: user.password,
            salt: user.salt,
          }
        })
      } catch (e) {
        res.status(400).json(e)
      }
    })
  })
}

export async function loginUser(req: Request, res: Response, next: NextFunction) {
  const body = req.body

  let user = await prisma.user.findFirst({
    where: {
      username: body.username
    }
  })

  if (user == null) {
    return res.status(400).json({
      message: "username is not exist"
    })
  }

  console.log(user)

  let isPasswordCorrect = await compare(body.password,user.password)
  // console.log(a)

  if (!isPasswordCorrect) {
    return res.status(400).json({
      message: "incorrect password"
    })
  }

  let token = jwt.sign({
    id: user.id,
    username: user.username,
  },process.env.SECRET,{expiresIn:"1h"})
  res.json(token)
  

  

  // hash(user.password,user.salt, (err, hash) => {
  //   console.log(err)
  //   if (user?.password == hash) {
  //     res.json("correct")
  //   } else {
  //     res.json(["wtf?",user?.password,hash])
  //   }
  // })
  

  // check password
  // hash(body.password,user.salt)
  
}