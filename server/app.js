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

    //Make sure that this is not visible to the client in the final product!!!
    // res.send(200);
    res.send(allPacks);

  });//End Then
});//End POST

io.on('connection', function(socket){
  console.log('User ' + socket.id + ' connected');
  connectedUsers.push({id:socket.id, status: "New"});
  //Check to see if this is the first user to connect and enable pack selection
  if (connectedUsers.length == 1){
    io.to(connectedUsers[0].id).emit('initialize', true);
  }

  socket.on('disconnect', function(){
    console.log('User ' + socket.id + ' disconnected');
    for(var i=0; i<connectedUsers.length; i++){
      if (connectedUsers[i].id ==  socket.id){
        connectedUsers.splice(i,1);
      }
    }
  });

  socket.on('pack recieved', function(){
    for (var i=0; i<connectedUsers.length; i++){
      if (connectedUsers[i].id == socket.id){
        connectedUsers[i].status = "Busy";
        console.log(connectedUsers[i].id + " is now Busy.");
      }
    }
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
        if (connectedUsers[i+1] == undefined){
          nextUser = connectedUsers[0];
        } else {
          nextUser = connectedUsers[i+1];
        }
        tempPacks.push({user: nextUser, pack: pack});
      }
    }
  });

  socket.on('check for pack', function(){
    console.log(socket.id + " is looking for the next pack.");
    if (tempPacks[0] !== undefined){
      for (var i=0; i<connectedUsers.length; i++){
        if (tempPacks[i].user == socket.id){
          console.log("Pack found");
          io.to(socket.id).emit('packEmit', tempPacks[i].pack);
          return true;
        }
      }
    }
    return false;
  });

});//End socket connect

http.listen(3000, function(){
  console.log('listening on *:3000');
});

var makePacks = function(playSet, packNumber){
  console.log("Making pack " + (packNumber+1) + " from " + playSet.name);

  //Used to ensure every card in a pack is unique
  var isUnique = function(array, createdPack){
    var card = array[Math.floor(Math.random() * (array.length+1))];
    for (var index; index<createdPack.length; index++){
      if (createdPack[index] == card){
        console.log("Not unique");
        return isUnique(array);
      }
    }
    // console.log("pushing unique card " + card);
    return card;
  };//End isUnique

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
    if ((Math.random() * (8 - 1) + 1) == 8){
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
