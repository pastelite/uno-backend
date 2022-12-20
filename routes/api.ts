var express = require('express');
var router = express.Router();

import { Request, Response, NextFunction } from "express";
import * as basic from "../controller/basic_controller" 

import userRoutes from "./api/user"

/* GET home page. */
router.get('/' , basic.hello);
router.use('/user', userRoutes)

module.exports = router;
