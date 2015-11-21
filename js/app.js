(function () {
  'use strict';

  angular.module('myApp', [
    'ui.router',
    'firebase',
    'ui.bootstrap',
    'ngSanitize',
    'sc-dropdown',
    'sc-confirm',
    'textAngular',
    'cgBusy'
  ])



    .config(['$stateProvider', '$urlRouterProvider',
      function ($stateProvider, $urlRouterProvider) {
        $stateProvider

          .state('/', {
            url: '',
            abstract: true
          });

        $urlRouterProvider.otherwise('/');
      }])

    .controller('BodyCtrl', ['$scope', '$rootScope', '$http', '$firebaseArray', '$modal',
      function ($scope, $rootScope, $http, $firebase, $modal) {

        var ref = new Firebase("https://test695.firebaseio.com/content");

        ref.onAuth(function (auth) {
          $rootScope.auth = auth;
        })
        // create an AngularFire reference to the data
        //var sync = $firebase(ref);
        // download the data into a local object
        $scope.data = new $firebase(ref);
        
        $scope.promise = $scope.data.$loaded().then(function (data) {
          $scope.data = data;
        });
        $scope.titleFilter = '';

        $scope.templateUrl = "/templates/default.html";

        $scope.getEditDate = function (item) {
          var d = new Date(item.timeStamp);
          return '[' + d.getHours() + ':' + d.getMinutes() + ' ' + d.getDate() + ' / ' + (d.getMonth() + 1) + ' / ' + d.getFullYear() + ']';
        }

        $scope.filterPost = function (item, titleFilter) {
          if (!$scope.filterCat && !titleFilter) {
            return true;
          }

          var f = !!titleFilter && item.titular.toLowerCase().indexOf(titleFilter.toLowerCase()) > -1;
          if (!!titleFilter && !$scope.filterCat) {
            return f;
          } else if (!titleFilter && !$scope.filterCat) {
            return true;
          } else if (!!titleFilter && $scope.filterCat) {
            return f && !!item.categories && !!item.categories.length && item.categories.indexOf($scope.filterCat) > -1;
          } else {
            return !!item.categories && !!item.categories.length && item.categories.indexOf($scope.filterCat) > -1;
          }

        };

        $scope.addEdit = function (data, sync) {
          var mode = !!data ? 'edit' : 'add';
          var modalInstance = $modal.open({
            templateUrl: '/templates/partials/add-edit.html',
            size: 'lg',
            controller: [
              '$scope', '$modalInstance', '$http', '$firebaseArray',

              function ($scope, $modalInstance, $http, $firebaseArray) {
                $scope.data = data || {};
                $scope.types = [ "Video", "Audio", "Texto", "Imagen"];
                $scope.categories = [ "Internacional", "Virales", "Inmigración", "Verificación"];

                $scope.selectType = function (type) {
                  $scope.data.type = type.slice(0);
                };

                $scope.selectCategory = function (cat) {
                  $scope.data.categories = cat.slice(0);
                };

                $scope.selectPriority = function (prio) {
                  $scope.data.prioridad = prio;
                };

                $scope.save = function (data) {
                  data.timeStamp = Date.now();
                  if (!data.$priority) {
                    data.$priority =  0 - Date.now();
                  }

                  var action = mode === 'edit' ? sync.$save : sync.$add;

                  $scope.promise = action(data).then(function (result) {
                    $scope.$dismiss();
                  });
                };
              }
            ],
          });

          modalInstance.result.then(function (data) {
            //modal closed
            
          });
        };

        $scope.viewItem = function (item) {
          var modalInstance = $modal.open({
            templateUrl: '/templates/view.html',
            size: 'lg',
            controller: [
              '$scope', '$modalInstance',

              function ($scope, $modalInstance) {
                $scope.data = item || {};

                $scope.getEditDate = function () {
                  var d = new Date($scope.data.timeStamp);
                  return '[' + d.getHours() + ':' + d.getMinutes() + ' ' + d.getDate() + ' / ' + (d.getMonth() + 1) + ' / ' + d.getFullYear() + ']';
                }
              }
            ],
          });
        };

        $scope.remove = function (data) {
          $scope.data.$remove(data);
        };

        $scope.selectPriority = function (prio) {
          $scope.selectedPriority = prio;
        };

        $scope.selectType = function (type) {
          $scope.selectedType = type;
        };

        $scope.highlight = function (item, dataType) {
          dataType = dataType || $scope.selectedType;
          var priority = 'high';

          if ((!item.type || item.type.length === 0 || !dataType) && !priority) {
            return false;
          }
          var priorityValue = item.prioridad && priority.toUpperCase() == item.prioridad.toUpperCase();
          var typeValue = dataType && item.type.some(function (type) {
            return type && type.toUpperCase() === dataType.toUpperCase();
          });
          
          return dataType && !!priority ? priorityValue && typeValue : priorityValue || typeValue;
        };

      }])

    .controller('HeaderCtrl', ['$scope', '$firebaseArray', '$rootScope', '$modal', '$q',
      function ($scope, $firebaseArray, $rootScope, $modal, $q) {
        $scope.templateUrl = "/templates/header.html";

        var ref = new Firebase("https://test695.firebaseio.com/content");
        
        $scope.login = function (user) {

          var modalInstance = $modal.open({
            templateUrl: '/templates/partials/login.html',
            controller: [
              '$scope', '$modalInstance', '$firebaseArray',

              function ($scope, $modalInstance, $http, $firebaseArray) {
                $scope.login = function (user) {
                  if(!user.email && !user.password) { return false; }
                  $scope.promise = $q.defer();
                  ref.authWithPassword({
                    email    : user.username,
                    password : user.password
                  }, function(error, authData) {
                    if (error) {
                      //login failed
                      $scope.promise.reject({ status: 'error', error: error });
                    } else {
                      $scope.promise.resolve({ status: 'success', authData: authData });
                      $scope.$close(authData);
                    }
                  }, {
                    //remember: "sessionOnly"
                  });
                };
              }]
          });

          modalInstance.result.then (function (authData) {
            $rootScope.auth = authData;
          });
        };

        $scope.logout = function () {
          ref.unauth();
          $rootScope.auth = null;
        };

        $scope.createUser = function (user) {

          var modalInstance = $modal.open({
            templateUrl: '/templates/partials/create-user.html',
            controller: [
              '$scope', '$modalInstance', '$firebaseArray',

              function ($scope, $modalInstance, $http, $firebaseArray) {
                $scope.create = function (user) {

                  if(!user.email && !user.password) { return false; }
                  $scope.promise = $q.defer();
                  ref.createUser({
                    email    : user.username,
                    password : user.password
                  }, function(error, authData) {
                    if (error) {
                      console.log("Error creating user:", error);
                      $scope.promise.reject({ status: 'error', error: error });
                    } else {
                      $scope.promise.resolve({ status: 'success', authData: authData });
                      $scope.$close(authData);
                    }
                  }, {
                    //remember: "sessionOnly"
                  });
                };
              }]
          });

          modalInstance.result.then (function (authData) {
            $rootScope.auth = authData;
          });
        };

      }])

    .controller('SideBarCtrl', ['$scope', '$rootScope',
      function ($scope, $rootScope) {
        $scope.templateUrl = "/templates/sidebar.html";
        $scope.selectFilter = function (f) {
          $rootScope.filterCat =  f;
        };
      }])
// 
// var app = angular.module("Smswire", ["firebase"]);

// this factory returns a synchronized array of  messages
.factory("Messages", ["$firebaseArray",
  function($firebaseArray) {
    // create a reference to the database location where we will store our data
    var randomRoomId = Math.round(Math.random() * 100000000);
    var ref = new Firebase("https://smswire.firebaseio.com/sms/");

    // this uses AngularFire to create the synchronized array
    return $firebaseArray(ref);
  }
])
.factory("AddressBook", ["$firebaseArray",
  function($firebaseArray) {
    var ref = new Firebase("https://smswire.firebaseio.com/adress-book");

    return $firebaseArray(ref);
  }
])

.controller("SMSCtrl", ["$scope", "Messages", "$sce", "AddressBook",
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




}());

