import { Request, Response, NextFunction, Router } from "express";

var router = Router();

router.get('/unauthorised/:strategy',function (req, res, next){
  res.status(401).json({
    message: `unauthorised, incorrect ${req.params.strategy}`
  })
})

module.exports = router