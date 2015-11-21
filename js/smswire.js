
var app = angular.module("Smswire", ["firebase"]);

// this factory returns a synchronized array of  messages
app.factory("Messages", ["$firebaseArray",
  function($firebaseArray) {
    // create a reference to the database location where we will store our data
    var randomRoomId = Math.round(Math.random() * 100000000);
    var ref = new Firebase("https://smswire.firebaseio.com/sms/");

    // this uses AngularFire to create the synchronized array
    return $firebaseArray(ref);
  }
]);
app.factory("AddressBook", ["$firebaseArray",
  function($firebaseArray) {
    var ref = new Firebase("https://smswire.firebaseio.com/adress-book");

    return $firebaseArray(ref);
  }
]);

app.controller("SMSCtrl", ["$scope", "Messages", "$sce", "AddressBook",
  // we pass our new Messages factory into the controller
  function($scope, Messages, $sce, AddressBook) {
    $scope.from = "Invitado " + Math.round(Math.random() * 100);
$scope.hello = "jairo";
    //Detect url in message and convert it to clickable link
    function linkify(text) {
      if(!text) return '';
      text.replace('<script','').replace('>','');
      var urlRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
      text = text.replace(urlRegex, function(url) {
        return '<a href="' + url + '" target="_blank">' + url + '</a>';
      });
      return text;
    }
    // we add Messages array to the scope to be used in our ng-repeat
    var addressBook = {};
    Messages.$loaded().
    then(function() {
      AddressBook.$loaded().then(function() {

        AddressBook.forEach(function(item) {
          addressBook[item.number] = item.username;
        });

        $scope.messages = Messages.map(function(message) {
          $scope.addressBook = addressBook;
          if(addressBook[message.from]) {
            message.from = addressBook[message.from];
          }
          message.message = linkify(message.message);
          return message;
        });

      });
    }).
    catch(function(err) {
      console.error(err);
    });

    $scope.toTrustedHTML = function(msg) {
      return $sce.trustAsHtml(msg);
    };
    // a method to create new messages; called by ng-submit
    $scope.addMessage = function() {
      // calling $add on a synchronized array is like Array.push(),
      // except that it saves the changes to our database!
      $scope.messages.$add({
        from: $scope.from,
        message: $scope.message
      });

      // reset the message input
      $scope.message = "";
    };


  }
]);
