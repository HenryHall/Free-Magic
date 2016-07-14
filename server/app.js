var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var bodyParser = require('body-parser');
app.use( bodyParser.json() );
var mongoose = require('mongoose');
mongoose.connect('localhost:27017/mtgApp');

var mtgSchema = new  mongoose.Schema({
    name: String,
    code: String,
    releaseDate: String,
    cards:{ type : Array , "default" : [] }
  });

var cardlists = mongoose.model( 'cardlists', mtgSchema );
var connectedUsers = [];

app.use( express.static( 'public' ) );

app.get('/', function(req, res){
  res.sendFile(path.resolve('views/index.html'));
});

app.get('/getSets', function(req, res){
  cardlists.find().then(function(setList){
    var listOfSets = [];
    for(var i=0; i<setList.length; i++){
      // console.log(setList[i].name);
      listOfSets.push(setList[i].name);
    }
    res.send(listOfSets);
  });

});

//Initialize every pack
var allPacks = [];

//Used to keep track of the packs when they are passed
var tempPacks = [];


app.post( '/getPacks', function(req, res){
  console.log("Trying to make packs for: ", req.body.pack[0], req.body.pack[1], req.body.pack[2]);

  cardlists.find().then(function(setList){
    //Make three packs
    for(var i=0; i<3; i++){
      var setKey = req.body.pack[i];
      console.log("Creating Packs for " + setKey);
        for(var j=0; j<setList.length; j++){
          // console.log("looking at set: " + setList[j].name);
          if(setList[j].name === setKey){
            allPacks.push(makePacks(setList[j], i));
          }
        }
    }//End Create Pack For

    //Send packs to the clients
    for(var i=0; i<connectedUsers.length; i++){
      io.to(connectedUsers[i].id).emit('packEmit', allPacks[0][i]);
    }
    allPacks.splice(0,1);
    res.sendStatus(200);

  });//End Then
});//End POST

io.on('connection', function(socket){
  console.log('User ' + socket.id + ' connected');
  connectedUsers.push({id:socket.id, status: "New"});
  //Check to see if this is the first user to connect and enable pack selection
  if (connectedUsers.length == 1){
    io.to(connectedUsers[0].id).emit('initialize', true);
  }

  //Let the chat know
  var msg = "A new user has connected.";
  io.emit('chat message', msg);

  //Set status to not ready
  io.emit('all seated', false);

  socket.on('disconnect', function(){
    console.log('User ' + socket.id + ' disconnected');
    var userSeats = [];
    for(var i=0; i<connectedUsers.length; i++){
      if (connectedUsers[i].id ==  socket.id){
        var msg = connectedUsers[i].name + " has disconnect.";
        io.emit('chat message', msg);
        connectedUsers.splice(i,1);
      } else {
        userSeats.push(connectedUsers[i].name);
      }
    }
    io.emit('new seat', userSeats);
  });


  socket.on('pack received', function(){
    for (var i=0; i<connectedUsers.length; i++){
      if (connectedUsers[i].id == socket.id){
        connectedUsers[i].status = "Busy";
        console.log(connectedUsers[i].id + " is now Busy.");
      }
    }
  });

  socket.on('user seated', function(userName){
    var userSeats = [];
    for (var i=0; i<connectedUsers.length; i++){
      if (socket.id == connectedUsers[i].id){
        connectedUsers[i].name = userName;
        connectedUsers[i].status = "Seated"
      }
      if (connectedUsers[i].name == undefined){
        userSeats.push("User not seated");
      } else {
        userSeats.push(connectedUsers[i].name);
      }
    }

    var isSeated = function(element, index, array){
      return element != "User not seated";
    }
    //Check to see if every user is seated
    if (userSeats.every(isSeated)) {
      io.emit('all seated', true);
    }

    io.emit('new seat', userSeats);
  });

  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });

  socket.on('packPass', function(pack){

    //Set this user's status to "Ready"
    for (var i=0; i<connectedUsers.length; i++){
      if (connectedUsers[i].id == socket.id){
        connectedUsers[i].status = "Ready";
        console.log(connectedUsers[i].id + " is now Ready.");

        //Find nextUser and send the pack
        var nextUser;
        if ((i+1) == connectedUsers.length){
          nextUser = connectedUsers[0].id;
        } else {
          nextUser = connectedUsers[i+1].id;
        }
        tempPacks.push({user: nextUser, pack: pack});
      }
    }
  });

  socket.on('check for pack', function(){
    if (tempPacks[0] !== undefined){
      for (var i=0; i<tempPacks.length; i++){
        if (tempPacks[i].user == socket.id){
          //Pack is found
          io.to(socket.id).emit('packEmit', tempPacks[i].pack);
          tempPacks.splice(i,1);
          return true;
        }
      }
    }
    return false;
  });

  socket.on('pack done', function(){
    //Set this users status to "Next Pack"
    for (var i=0; i<connectedUsers.length; i++){
      if(connectedUsers[i].id == socket.id){
        connectedUsers[i].status = "Next Pack";
      }
    }

    //See if there are more packs after
    if(allPacks.length == 0){
      //Do something here
      console.log("All Packs Drafted!");
      io.emit('draft done', true);

    } else {
      //Continue
      //See if all users are ready for Next Pack
      var usersReady = 0;
      for (var i=0; i<connectedUsers.length; i++){
      if (connectedUsers[i].status == "Next Pack"){
          usersReady++;
        }
      }

      //If all users are ready for Next Pack
      if (usersReady==connectedUsers.length){
        //Reverse pack direction
        connectedUsers.reverse();
        //Send packs to the clients
        for(var i=0; i<connectedUsers.length; i++){
          io.to(connectedUsers[i].id).emit('packEmit', allPacks[0][i]);
        }
        allPacks.splice(0,1);
      }

    }

  });

});//End socket connect

http.listen(3000, function(){
  console.log('listening on *:3000');
});

var makePacks = function(playSet, packNumber){
  console.log("Making pack " + (packNumber+1) + " from " + playSet.name);

  //Holds all packs for current round of packs
  var currentPacks = [];

  //Rarity array breakdown from playSet
  var commons = [];
  var uncommons = [];
  var rares = [];
  var mythics = [];


  //Make Rarity Arrays
  for(var i=0; i< playSet.cards.length; i++){
    switch (playSet.cards[i].rarity) {
      case "Common":
        commons.push({name: playSet.cards[i].name, multiverseid: playSet.cards[i].multiverseid});
        break;

      case "Uncommon":
        uncommons.push({name: playSet.cards[i].name, multiverseid: playSet.cards[i].multiverseid});
        break;

      case "Rare":
        rares.push({name: playSet.cards[i].name, multiverseid: playSet.cards[i].multiverseid});
        break;

      case "Mythic Rare":
        mythics.push({name: playSet.cards[i].name, multiverseid: playSet.cards[i].multiverseid});
        break;

      default:
        break;

    }
  }//End Rarity for

  //Used to ensure every card in a pack is unique
  var isUnique = function(array, createdPack){
    var card = array[Math.floor(Math.random() * (array.length))];
    if (createdPack.indexOf(card) == -1){
      //The card is unique
      return card;
    } else {
      //The card is not unique, try again
      return isUnique(array, createdPack);
    }
  };//End isUnique

  //Pack Creation
  for (var i=0; i<connectedUsers.length; i++){
    var userPack = [];

    //10 Commons
    for (var j=0; j<10; j++){
      userPack.push(isUnique(commons, userPack));
    }

    //3 Uncommons
    for (var k=0; k<3; k++){
      userPack.push(isUnique(uncommons, userPack));
    }
    //Decided if rare is mythic
    if ((Math.floor(Math.random() * (8 - 1) + 1)) == 1){
      //Make sure the set has mythic rares
      if(mythics.length>0){
        userPack.push(isUnique(mythics, userPack));
      } else {
        userPack.push(isUnique(rares, userPack));
      }
    } else {
      userPack.push(isUnique(rares, userPack));
    }
    //The pack is made
    currentPacks.push(userPack);

  }//End Pack Creation

  //All packs made
  return currentPacks;

};//End makePacks
