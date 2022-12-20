var express = require('express');
var router = express.Router();

import { Request, Response, NextFunction } from "express";
import * as basic from "../controller/basic_controller" 

/* GET home page. */
router.get('/' , basic.hello);

module.exports = router;
