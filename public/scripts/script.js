//Is the game ready to start
var status= 'false';

var socket = io();
var myApp=angular.module( 'myApp', [] );

myApp.controller( 'gameController', ['$scope', '$http', function($scope, $http){

  $scope.userStatus = "Not Ready";

  //Server decides who is the first user and allows access to pack selection
  socket.on('initialize', function(){
    document.getElementById('packSelection').style.display = "block";
  });

  socket.on('all seated', function(bool){
    if (bool == true){
      console.log("All seated");
      $scope.userStatus = "Ready";
      status = 'true';
      document.getElementById('status').style.color = '#05cd4f';
      $scope.$apply();
    } else {
      console.log("Not every player is seated");
      $scope.userStatus = "Not Ready"
      status = 'false';
      document.getElementById('status').style.color = '#db2222';
      $scope.$apply();
    }
    return status;

  });

  $http({
    method: 'GET',
    url: '/getSets'
  }).then(function(sets){
    $scope.dropDown = sets.data;
    $scope.packOne = $scope.dropDown[ $scope.dropDown.length -1 ];
    $scope.packTwo = $scope.dropDown[ $scope.dropDown.length -1 ];
    $scope.packThree = $scope.dropDown[ $scope.dropDown.length -1 ];

  });

  $scope.getPacks = function(){
    //Check to see if they user has selected each pack
    if($scope.packOne == undefined || $scope.packTwo == undefined || $scope.packThree == undefined) {
      document.getElementById('packAlert').style.display = "block";
      return false;
    }

    //Check to make sure each player is ready
    if(status == 'false'){
      document.getElementById('statusAlert').style.display = "block";
      return false;
    }

    var selectedPacks = [$scope.packOne, $scope.packTwo, $scope.packThree];

    var sentPackRequest = {
      pack: selectedPacks
    }

    document.getElementById('packSelection').style.display = "none";

    console.log(sentPackRequest);

    $http({
      method: "POST",
      url: "/getPacks",
      data: sentPackRequest
    });
  };

}]);


myApp.controller( 'messageController', ['$scope', function($scope){

  //Initialize
  $scope.messageLog = [];
  $scope.msgIn = '';
  $scope.username = "";
  var seatName;
  $scope.userCount;

  $scope.takeSeat = function(){
    if ($scope.username == ""){
      return alert("Please enter a player name!")
    } else {
      seatName = $scope.username;
    }

    socket.emit('user seated', seatName);

    document.getElementById('seating').style.display = "none";
    document.getElementById('messageEnter').style.display = "block";
  }


  $scope.chatEnter = function(key){
    if (key.which == 13){
      $scope.sendMsg();
      $scope.msgIn = '';
    }
  }


  $scope.sendMsg = function(){
    var msgSending = seatName + ": " + $scope.msgIn;
    socket.emit('chat message', msgSending);
    $scope.msgIn = '';
    return false;
  };


  socket.on('new seat', function(seats){
    console.log("New Seat");
    $scope.userSeats = seats;
    $scope.userCount = seats.length;
    $scope.$apply();
    return true;
  });


  socket.on('chat message', function(msg){

    $scope.messageLog.push(msg);
    $scope.$apply();
    document.getElementById('chatLog').scrollTop = document.getElementById('chatLog').scrollHeight;
    return true;
  });

}]);//End messageController

myApp.controller( 'playController', ['$scope', '$timeout', function($scope, $timeout){

  $scope.currentPack = [];
  $scope.myPicks = [];
  $scope.myMainboard = [];
  $scope.mySideboard = [];

  socket.on('packEmit', function(pack){
    //Set user's status to "Busy"
    socket.emit('pack received', true);

    //Make sure the users can see the cards!
    document.getElementById('draftContent').style.display = "block";

    $scope.currentPack = pack;
    $scope.$apply();
    return true;
  });

  socket.on('draft done', function(){
    //Draft is done
    document.getElementById('draftContent').style.display = "none";
    document.getElementById('postDraftContent').style.display = "block";
    $scope.myMainboard = $scope.myPicks;
    $scope.$apply();
    return true;

  });

  $scope.pickCard = function(e, cardIndex){
    var thisCard = e.currentTarget;
    if (thisCard.id !== "selectedCard"){
      //Make this card the selectedCard
      if (document.getElementById('selectedCard') != undefined){
        document.getElementById('selectedCard').id = "";
      }
      thisCard.id = "selectedCard";
    } else {
      //Pick the selectedCard
      $scope.myPicks.push($scope.currentPack[cardIndex]);
      $scope.currentPack.splice(cardIndex,1);

      //Check if the pack is depleted
      if ($scope.currentPack.length == 0){
        socket.emit('pack done', true);
      } else {
        //Send the pack back to the server
        var packToPass = $scope.currentPack;
        socket.emit('packPass', packToPass);
        $scope.currentPack = null;

        //Wait for the next pack, checking every second
        console.log("Checking for a new pack.");
        var timer = setInterval(function(){
          if ($scope.currentPack !== null) {
            console.log("New pack is ready!");
            clearInterval(timer);
            return true;
          } else {
            socket.emit('check for pack', true);
            console.log("Pack is not ready.");
            return false;
          }
        },1000);
      }//End pack depleted else

    }//End else
  }//End pickCard

  $scope.deckCard = function(e, cardIndex){
    var thisCard = e.currentTarget;
    if (thisCard.id !== "selectedCard"){
      //Make this card the selectedCard
      if (document.getElementById('selectedCard') != undefined){
        document.getElementById('selectedCard').id = "";
      }
      thisCard.id = "selectedCard";
      return true;
    }

    //Determine if the card is from the mainboard or sideboard
    // $timeout( function(){
      if (thisCard.class == "mainBoard") {
        //Move the card to the sideboard
        $scope.mySideboard.push($scope.myMainboard[cardIndex]);
        $scope.myMainboard.splice(cardIndex, 1);
        } else {
          //Move the card to the mainboard
          $scope.myMainboard.push($scope.mySideboard[cardIndex]);
          $scope.mySideboard.splice(cardIndex, 1);
        }
        console.log($scope.$$phase);
        // $scope.$apply();
        // return true;
    // }, 1000);
    return true;
  };

}]);
