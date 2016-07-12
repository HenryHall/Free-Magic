console.log("Sourced");


var socket = io();

var myApp=angular.module( 'myApp', [] );

myApp.controller( 'gameController', ['$scope', '$http', function($scope, $http){

  //Server decides who is the first user and allows access to pack selection
  socket.on('initialize', function(){
    document.getElementById('packSelection').style.display = "block";
  });

  $http({
    method: 'GET',
    url: '/getSets'
  }).then(function(sets){
    $scope.dropDown = sets.data;

  });

  $scope.getPacks = function(){
    //Check to see if they user has selected each pack
    console.log($scope.packOne);
    if($scope.packOne == undefined || $scope.packTwo == undefined || $scope.packThree == undefined) {
      document.getElementById('packAlert').style.display = "block";
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


  $scope.messageLog = [];
  $scope.msgIn = '';
  var seatName;

  $scope.takeSeat = function(){
    if ($scope.username == ""){
      return alert("Please enter a username!")
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
    $scope.$apply();
  });


  socket.on('chat message', function(msg){

    $scope.messageLog.push(msg);
    $scope.$apply();
    document.getElementById('chatLog').scrollTop = document.getElementById('chatLog').scrollHeight;
  });

}]);//End messageController

myApp.controller( 'playController', ['$scope', function($scope){

  $scope.currentPack = [];
  $scope.myPicks = [];

  socket.on('packEmit', function(pack){
    //Set user's status to "Busy"
    socket.emit('pack received', true);

    $scope.currentPack = pack;
    $scope.$apply();
  });

  socket.on('draft done', function(){
    //Draft is done
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

}]);
