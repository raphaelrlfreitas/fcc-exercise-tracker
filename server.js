const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const mongo = require('mongodb');
require('dotenv').config()

const cors = require('cors')


const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track', { useNewUrlParser: true, useUnifiedTopology: true} )
app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


// Create Schema for Exercises and Users
const Schema = mongoose.Schema;


var exercisesSchema = new Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date },
});

var Exercise = mongoose.model('Exercise', exercisesSchema)

var exerciseUserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  log: [exercisesSchema]
});

var User = mongoose.model('User Ex', exerciseUserSchema);

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// API Endpoints

app.post("/api/exercise/new-user", (req, res) => {

  User.findOne({username: req.body.username}, (err, user) => {
    if(err) return console.log(err);
    if(user){
      res.send("Username already taken!")
    }
    else{
      const newUser = new User({username: req.body.username});

      newUser
        .save()
        .then( result => {
          console.log(result);
          res.json({
            username: result.username,
            _id: result._id,
          });
        })
        .catch(err => console.log(err))
    }
  })

})

app.post("/api/exercise/add", (req, res) => {
  
  User.findById(req.body.userId, (err, user) => {
    if(err){
      console.log(err);
      res.json({error: "Invalid User ID!"});
    }
    
    const exercise = new Exercise({
      description: req.body.description,
      duration: req.body.duration,
      date: req.body.date == "" ? new Date() : new Date(req.body.date),
    })

    user.log.push(exercise);
    user
      .save()
      .then(result => {
        res.json({
          username: user.username,
          _id: user._id,
          description: exercise.description,
          duration: exercise.duration,
          date: exercise.date,
        })
      })
      .catch(err => console.log(err))
  })


})

app.get("/api/exercise/log", (req, res) => {
  if(!req.query.userId){
    res.send("User ID not specified!")
  }

  User.findById(req.query.userId, (err, user) =>{
    if(err){
      console.log(err);
      res.json({error: "User ID not found!"})
    }

    let filteredLog = user.log;

    if(req.query.from){
      filteredLog = filteredLog.filter(e => e.date >= new Date(req.query.from));
    }
    if(req.query.to){
      filteredLog = filteredLog.filter(e => e.date <= new Date(req.query.to));
    }
    if(req.query.limit){
      filteredLog = filteredLog.splice(0,req.query.limit);
    }

    res.json({
      _id: user._id,
      username: user.username,
      count: filteredLog.length,
      log: filteredLog,
    })
    
  })

})

app.get("/api/exercise/users", (req, res) => {

  let query = User.find();
  query
    .select({_id: 1, username: 1})
    .exec((err, result) => {
      if(err){
        console.log(err);
      }
      res.json(result);
    })


})

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
