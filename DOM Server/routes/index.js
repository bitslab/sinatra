var express = require('express');
var router = express.Router();
var app = require('../app');

/* GET home page. */
router.get('/', function(req, res) {
    res.send("<h1> This express server will listen for DOM changes </h1>");
    // res.json({ mutationFlag: req.app.get('mutationFlag') });
});

/*router.post('/getDomChanges',  function(req, res) { // Get dom json from 1st browser
    if (Object.keys(JSON.parse(req.body.input)).length > 0) {
        changesData = req.body.input;
        console.log(globalChangesData);
        console.log("Received the json from page 1");
        console.log(JSON.parse(req.body.input));
        res.send("Got the json thanks!");
    }
});

router.get('/sendDomChanges', function(req, res) { // Send dom changes to 2nd browser
    res.send(changesData);
});*/

module.exports = router;
