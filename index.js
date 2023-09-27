const express = require('express');
const app = express();
const cors = require('cors')
let bodyParser = require('body-parser');
const mongoose = require('mongoose');
require('dotenv').config();

// Enable CORS
app.use(cors());
app.use(express.static('public'));

// Activate Body Parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env['MONGO_URI'], { useNewUrlParser: true, useUnifiedTopology: true });
console.log(mongoose.connection.readyState);

// Log Schema - History of Exercise
const logSchema = new mongoose.Schema(
  {
    description: String,
    duration: Number,
    date: String
  }
);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  from: { type: String, required: false },
  to: { type: String, required: false },
  count: { type: Number, required: false },
  log: [{
    _id: false,
    description: String,
    duration: Number,
    date: String
  }],
})

const exercise = mongoose.model("exercise-tracker", userSchema);
//const test = mongoose.model("userLog", logSchema);

//This SHOULD append log with new exercises
//Not sure if this works
async function populateLog(usrID, usrDescription, usrDuration, usrDate) {
  const updateLog = {
    description: usrDescription,
    duration: usrDuration,
    date: usrDate,
  }
  const currLog = await exercise.findById(usrID).exec();


  currLog.log.push(updateLog);
  await currLog.save();
  // console.log(currLog);
}


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});


app.get('/api/users', async function(req, res, next) {
  const collection = await exercise.find({});
  req.collection = collection;
  next();
}, function(req, res) {
  res.send(req.collection);
})



//Post request to add user to database 
// Route format: /api/users
// @return json
// DONE
app.post('/api/users', async function(req, res) {

  //console.log(req.body.username);
  const newUser = await exercise.create({ username: req.body.username });
  //console.log(newUser);

  req.user = newUser.username;
  req.id = newUser._id;

  res.send({ username: req.user, _id: req.id });
});

//Post request to add "Exercise" to database collection (assigns to user/id)
// Route format: /api/users/:_id/exercises
// @return json
// DONE
app.post('/api/users/:_id/exercises', async function(req, res, next) {
  const userId = await exercise.findById(req.params._id).exec();

  console.log(userId);
  let dateInput = new Date(req.body.date);
  // console.log({ Date: req.body.date });
  if (req.body.date === undefined) {
    dateInput = new Date();
  }

  // Initialize variables based off form data from POST request
  req.description = req.body.description;
  req.duration = req.body.duration;
  req.date = dateInput.toDateString();
  req.username = userId.username;


  req.id = userId._id;


  // Function SHOULD push exercise to Log
  populateLog(req.params._id, req.body.description, req.body.duration, req.date);


  // console.log({"req.body": req.body});

  //console.log({ObjectID: req.body[':_id']});
  //console.log({Currently_Selected_Obj: userId});

  next();
}, function(req, res) {
  res.send({
    "_id": req.id,
    username: req.username,
    date: req.date,
    duration: Number(req.duration),
    description: req.description
  });
});


function exerciseFilter(log, from, to) {
  const low = Number(from.getTime());  //Converts Date String to Unix format, then turns to Number
  const high = Number(to.getTime());   //Converts Date String to Unix format, then turns to Number
  const newArr = [];

  for (let i = 0; i < log.length; i++) {
    const unix = new Date(log[i].date).getTime();

    if (unix >= low && unix <= high) {
      newArr.push(log[i]);
    }
  }

  return newArr;
}

/**  
Returns a log of all exercises 
Route format: GET /api/users/:_id/logs?[from][&to][&limit]

Example:
https://exercise-tracker.freecodecamp.rocks/api/users/650662ed3690ad0888d466ff/logs?from=2001-04-10&to=2001-04-13&limit=3
*/
// TODO: Limit json response based on given query params
app.get('/api/users/:_id/logs', async function(req, res) {

  const newArr = [];
  const from = req.query.from;
  const to = req.query.to;
  const limit = req.query.limit;

  const fromDate = new Date(from);
  const toDate = new Date(to);


  console.log({
    "from": fromDate,
    "to": toDate,
    "limit": limit
  });

  const currID = await exercise.findById(req.params._id).exec();

  req.id = currID._id;
  req.username = currID.username;
  //req.log = currID.log;

  /**  
    if (limit == undefined) {
      req.count == currID.log.length;
  
      if (from == undefined || to == undefined) {
        req.log = currID.log;
      } else {
        req.log = exerciseFilter(currID.log, fromDate, toDate, req.count);
      }
    } else {
      req.count == Number(limit);
  
      if (from == undefined || to == undefined) {
        req.log = currID.log;
      } else {
        req.log = exerciseFilter(currID.log, fromDate, toDate, req.count - 1);
      }
    }
  */

  req.count = Number(limit) || currID.log.length; // ONLY if optional params not given
  // TEST CODE

  if (from == undefined || to == undefined) {
    req.log = currID.log;
  } else {
    req.log = exerciseFilter(currID.log, fromDate, toDate);
  }

  for (let i = 0; i < req.count; i++) {
    if (req.log[i] != null) {
      newArr.push(req.log[i]);
    }
  }

  req.lastArr = newArr;


  // TEST CODE


  console.log(currID.log);


  //console.log(new Date(currID.log[0].date).getTime());
  //console.log(req.log);
  //console.log({ currID: currID });
  //console.log({log: tit});


  res.send({
    _id: req.id,
    username: req.username,
    count: req.count,
    log: req.lastArr
  });
});






const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
  console.log(__dirname);
})
