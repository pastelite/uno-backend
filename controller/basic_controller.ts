var express = require('express');
var router = express.Router();

import { Request, Response, NextFunction } from "express";

export function hello(req: Request, res: Response, next: NextFunction) {
  res.json('hello world');
}

export function hello2(req: Request, res: Response, next: NextFunction) {
  res.json('hello world but second');
}

// module.exports = {hello, hello2};