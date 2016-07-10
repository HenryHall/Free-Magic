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
    }).then(
      function(threePacks){
        console.log("Got packs!");
        console.dir(threePacks.data);
      }
    );
  };

}]);


myApp.controller( 'messageController', ['$scope', function($scope){

  $scope.messageLog = [];

  $scope.sendMsg = function(){
    var msgSending = $scope.username + ": " + $scope.msgIn;
    socket.emit('chat message', msgSending);
    $scope.msgIn = '';
    return false;
  };

  socket.on('chat message', function(msg){

    $scope.messageLog.push(msg);
    $scope.$apply();
  });


}]);

myApp.controller( 'playController', ['$scope', function($scope){

  $scope.currentPack = [];
  $scope.myPicks = [];

  socket.on('packEmit', function(pack){
    //Set user's status to "Busy"
    socket.emit('pack recieved', true);

    console.log(pack);
    $scope.currentPack = pack;
    $scope.$apply();
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

      //Send the pack back to the server
      var packToPass = $scope.currentPack;
      socket.emit('packPass', packToPass);
      $scope.currentPack = null;

      //Wait for the next pack


      var checkForPack = function(){
        setInterval(function () {
          console.log($scope.currentPack);
          if ($scope.currentPack !== null) {
            console.log("New pack is ready!");
            clearInterval(checkForPack);
          } else {
            socket.emit('check for pack', true);
            console.log("Pack is not ready.");
            checkForPack();
          }
        }, 5000);
      };

      console.log("Checking for a new pack.");
      checkForPack();

    }//End else
  }//End pickCard

}]);
