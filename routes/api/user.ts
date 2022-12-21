import { Router, ErrorRequestHandler } from "express"
let router = Router()
import * as userController from "../../controller/userController"
import passport from "passport"

router.post('/register', userController.checkInput, userController.registerUser)
router.post('/login', userController.checkInput, userController.loginUser)
router.get('/error',function (req, res, next) {
  res.status(401).json(["incorrect jwt"]);
})

router.get('/test', passport.authorize('jwt', {
  failureRedirect: "/error/unauthorised/jwt"
}), function (req, res, next) {
  // console.log(req)
  res.json(["pass the test!", req.jwtPayload]);
}
);

export default router