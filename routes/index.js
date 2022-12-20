var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  console.log("test")
  res.render('index', { title: 'Lalafa2' });
});

module.exports = router;
