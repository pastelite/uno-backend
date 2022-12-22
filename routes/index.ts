import { Router } from "express";
var router = Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  console.log("test")
  res.render('index', { title: 'miniUNO backend' });
});

module.exports = router;