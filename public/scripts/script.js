//Is the game ready to start
var status= 'false';

var socket = io();
var myApp=angular.module( 'myApp', [] );

myApp.controller( 'gameController', ['$scope', '$http', function($scope, $http){

  $scope.userStatus = "Not Ready";
  $scope.usersReady = 0;
  $scope.totalUsers = 0;

  //Server decides who is the first user and allows access to pack selection
  socket.on('initialize', function(){
    document.getElementById('packSelection').style.display = "block";
  });

  socket.on('welcome', function(){
    document.getElementById('welcome').style.display = "block";
    // socket.emit('test pair', true);
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
      $scope.totalUsers++;
      status = 'false';
      document.getElementById('status').style.color = '#db2222';
      $scope.$apply();
    }
    return status;

  });

  socket.on('new seat', function(seats){
    $scope.usersReady = 0;
    for (var i=0; i<seats.length; i++){
      if (seats[i] !== "User not seated"){
        $scope.usersReady++;
      }
    }
    $scope.totalUsers = seats.length;

    var isSeated = function(element, index, array){
      return element != "User not seated";
    }
    if (seats.every(isSeated)) {
      $scope.userStatus = "Ready";
      status = 'true';
      document.getElementById('status').style.color = '#05cd4f';
    }
  });

  socket.on('user seated')

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
  };

  $scope.nameEnter = function(key){
    if(key.which == 13){
      $scope.takeSeat();
    }
  };


  $scope.sendMsg = function(){
    var msgSending = seatName + ": " + $scope.msgIn;
    socket.emit('chat message', msgSending);
    $scope.msgIn = '';
    return false;
  };


  socket.on('chat message', function(msg){
    $scope.messageLog.push(msg);
    $scope.$apply();
    document.getElementById('chatLog').scrollTop = document.getElementById('chatLog').scrollHeight;
  });

}]);//End messageController

myApp.controller( 'playController', ['$scope', function($scope){

  $scope.currentPack = [];
  $scope.myPicks = [];
  $scope.myMainboard = [];
  $scope.mySideboard = [];

  $scope.plains = 0;
  $scope.islands = 0;
  $scope.swamps = 0;
  $scope.mountains = 0;
  $scope.forests = 0;
  $scope.landCount = 0;

  $scope.deckList;


  socket.on('packEmit', function(pack){
    //Set user's status to "Busy"
    socket.emit('pack received', true);

    //Make sure the users can see the cards!
    document.getElementById('welcome').style.display ="none";
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

  socket.on('pairings', function(pairings){
    for(var i=0; i<pairings.length; i++){
      console.log("Name:", pairings[i].name, "Opponent:", pairings[i].opponent);
      $scope.pairings = pairings;
    }
  });

  $scope.pickCard = function(e, cardIndex){
    var thisCard = e.currentTarget;
    if (thisCard.id !== "selectedCard"){
      //Make this card the selectedCard
      if (document.getElementById('selectedCard') != undefined){
        document.getElementById('selectedCard').id = "";
      }
      thisCard.id = "selectedCard";
      return true;
    }

    //Pick the selectedCard
    $scope.myPicks.push($scope.currentPack[cardIndex]);
    $scope.currentPack.splice(cardIndex,1);

    //Check if the pack is depleted
    if ($scope.currentPack.length == 0){
      socket.emit('pack done', true);
      return true;
    }

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

    return true;
  };//End pickCard

  //Hash the decklist
  $scope.submitDecklist = function(){
    var mainboardToHash = "";
    var sideboardToHash = "";
    var finalToHash;

    for (var i=0; i<$scope.myMainboard.length; i++){
      mainboardToHash += $scope.myMainboard[i].name.toLowerCase() + ";";
    }

    for (var i=0; i<$scope.mySideboard.length; i++){
      sideboardToHash += "SB:" + $scope.mySideboard[i].name.toLowerCase() + ";";
    }

    for (var i=0; i<$scope.plains; i++){
      mainboardToHash += "plains;";
    }
    for (var i=0; i<$scope.islands; i++){
      mainboardToHash += "island;";
    }
    for (var i=0; i<$scope.swamps; i++){
      mainboardToHash += "swamp;";
    }
    for (var i=0; i<$scope.mountains; i++){
      mainboardToHash += "mountain;";
    }
    for (var i=0; i<$scope.forests; i++){
      mainboardToHash += "forest;";
    }

    finalToHash = sideboardToHash + mainboardToHash;

    //Remove the last ";"
    finalToHash = finalToHash.substring(0, finalToHash.length-1);
    $scope.deckList = finalToHash;
    console.log(finalToHash);

    socket.emit('hash', finalToHash);
  };

  socket.on('send hash', function(newHash){
    $scope.deckHash = newHash;
    $scope.$apply();
  });


  $scope.manaInc = function(mana){
    switch (mana) {
      case "plain":
        $scope.plains++;
        break;
      case "island":
        $scope.islands++;
        break;
      case "swamp":
        $scope.swamps++;
        break;
      case "mountain":
        $scope.mountains++;
        break;
      case "forest":
        $scope.forests++;
        break;
    }
    $scope.landCount = $scope.plains + $scope.islands + $scope.swamps + $scope.mountains + $scope.forests;
  };//End manaInc

  $scope.manaDec = function(mana){
    switch (mana) {
      case "plain":
        if ($scope.plains == 0){break;}
        $scope.plains--;
        break;
      case "island":
        if ($scope.islands == 0){break;}
        $scope.islands--;
        break;
      case "swamp":
        if ($scope.swamps == 0){break;}
        $scope.swamps--;
        break;
      case "mountain":
        if ($scope.mountains == 0){break;}
        $scope.mountains--;
        break;
      case "forest":
        if ($scope.forests == 0){break;}
        $scope.forests--;
        break;
    }
    $scope.landCount = $scope.plains + $scope.islands + $scope.swamps + $scope.mountains + $scope.forests;
  };//End manaDec

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
    for(var i=0; i<thisCard.classList.length; i++){
      if (thisCard.classList[i] == "mainBoard") {
        //Move the card to the sideboard
        $scope.mySideboard.push($scope.myMainboard[cardIndex]);
        $scope.myMainboard.splice(cardIndex, 1);
      } else if (thisCard.classList[i] == "sideBoard") {
          //Move the card to the mainboard
          $scope.myMainboard.push($scope.mySideboard[cardIndex]);
          $scope.mySideboard.splice(cardIndex, 1);
        }
    }

    document.getElementById('selectedCard').id = ""
    return true;
  };

}]);

myApp.controller( 'userModalController', ['$scope', function($scope){
  $scope.userSeats = [];

  socket.on('new seat', function(seats){
    $scope.userSeats = seats;
    $scope.userCount = seats.length;
    $scope.$apply();
  });

  //bool will be false on a new user
  socket.on('all seated', function(bool){
    var userTest = bool.toString();
    if (userTest == 'false'){
      $scope.userSeats.push("User not seated");
      $scope.$apply();
    }
  });

}]);

//for ng-right-click use
myApp.directive('ngRightClick', function($parse) {
    return function(scope, element, attrs) {
        var fn = $parse(attrs.ngRightClick);
        element.bind('contextmenu', function(event) {
            scope.$apply(function() {
                event.preventDefault();
                fn(scope, {$event:event});
            });
        });
    };
});
