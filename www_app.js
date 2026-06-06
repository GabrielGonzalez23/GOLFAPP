// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js
angular.module('starter', [
	'ionic',
	'config',
	'barebone.home',
  'barebone.campos',
  'barebone.jugadores',
	'barebone.partidas',
	'barebone.menu',
	'barebone.account',
	'barebone.login',
	'barebone.apuestas',
	'barebone.friends',
	'barebone.grupos',
  'barebone.game-settings',
  'barebone.index-lists',
	'ngCordova',
	'ionic-toast',
	'checklist-model',
	'ngStorage',
	'satellizer',
  'ion-autocomplete',
  'sw2.ionic.input-clearable',
  'ionic-datepicker'
])
// .constant("apiUrl", 'http://localhost:2300')
.constant("apiUrl", 'https://cgb.hdsoftware.mx')


.run(function($ionicPlatform, $ionicLoading, $rootScope, $state, $localStorage, $timeout, $auth, ionicToast, GameSettingsService, $ionicHistory, apiUrl, $http) {
	$ionicPlatform.ready(function() {

    $timeout( function(){
      navigator.splashscreen.hide();
    }, 250);

		$rootScope.playing = false;
    $rootScope.$state = $state;
    $rootScope.isIosPlatform = ionic.Platform.isIOS();

    window.addEventListener("orientationchange", function() {
      $rootScope.$broadcast('orientationChange');
    });

    $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
      if( (fromState.name == 'app.loba' || fromState.name == 'app.skins') && (toState.name == 'app.loba' || toState.name == 'app.skins') ) {
        screen.orientation.lock('landscape');
      } else {
        if(toState.name == 'app.loba' || toState.name == 'app.skins') {
          screen.orientation.lock('landscape');
        }

        if(fromState.name == 'app.loba' || fromState.name == 'app.skins') {
          screen.orientation.unlock();
        }
      }
    });

    //CAMBIOS FIREBASE
    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
        var is_authenticated = $auth.isAuthenticated();

        if(!$auth.getToken() || !is_authenticated) {
          var user = $localStorage.jugador;
          var pwd = $localStorage.pwd;

          if (user && pwd) {
            //RENOVAR EL TOKEN!
            $auth.login({ email: user.email, password: pwd })
            .then(function (data) {
              $auth.setToken(data.data.token);
              $localStorage.jugador = data.data.user;

              $ionicHistory.nextViewOptions({
                disableAnimate: true,
                disableBack: true,
                historyRoot: true
              });
              $state.go('app.home', { reload: true });

              if(!$rootScope.storeInitialized) {
                nonRenewing.initialize({
                  verbosity: store.ERROR,
                  products: [{
                    id: 'com.hdsoftware.classicgolf.annualnr',
                    duration: 31536000
                  }],
                  loadExpiryDate: loadExpiryDate,
                  saveExpiryDate: saveExpiryDate
                });

                nonRenewing.onStatusChange(function(status) {
                  if (status) {
                    $rootScope.is_subscribed = status.subscriber;
                    $localStorage.jugador.fechaExpiracion = status.expiryTimestamp;
                  }
                });
                $rootScope.storeInitialized = true;
              }

              // var suscripcion = store.get('anual');
              // if(suscripcion.owned) {
              //   $state.go('app.home', { reload: true });
              // } else {
              //   $state.go('subscriptions', { reload: true });
              // }
            }).catch(function (data) {
              $ionicLoading.hide();
              ionicToast.show('An error occurred, verify your internet connection', 'bottom', false);
            });
          }
        } else {
          $ionicHistory.nextViewOptions({
            disableAnimate: true,
            disableBack: true,
            historyRoot: true
          });
          $state.go('app.home', { reload: true });

          if(!$rootScope.storeInitialized) {
            nonRenewing.initialize({
              verbosity: store.ERROR,
              products: [{
                id: 'com.hdsoftware.classicgolf.annualnr',
                duration: 31536000
              }],
              loadExpiryDate: loadExpiryDate,
              saveExpiryDate: saveExpiryDate
            });

            nonRenewing.onStatusChange(function(status) {
              if (status) {
                $rootScope.is_subscribed = status.subscriber;
                $localStorage.jugador.fechaExpiracion = status.expiryTimestamp;
              }
            });
            $rootScope.storeInitialized = true;
          }

          // var suscripcion = store.get('anual');
          // if(suscripcion.owned) {
          //   $state.go('app.home', { reload: true });
          // } else {
          //   $state.go('subscriptions', { reload: true });
          // }
        }
      } else {
        // si no hay usuario en localStorage, manda al login
        $state.go('login');
      }
    });

    if($localStorage.jugador) {
      // traer los game settings para las apuestas, por si el jugador crea una partida
      GameSettingsService.getGameSettings($localStorage.jugador.idusuario)
      .then(function(data) {
        GameSettingsService.setSettings(data.data);
      }).catch(function(err) {
        ionicToast.show('Error getting user data, verify your internet connection.', 'bottom', false);
      });
    }

    $rootScope.isEmpty = function(value) {
      return value === '' || value === ' ' || value === null || value === undefined;
    };

    $rootScope.realtime_listener = function(state, partidaId) {
      var ref = firebase.database().ref('/partidas/' + partidaId);
      if(state) {
        ref.on('child_changed', function(snapshot) {
          if(snapshot.key == 'update_score') {
            $rootScope.$broadcast('actualiza');
          } else if(snapshot.key == 'update_settings') {
            getPartidaSettings();
          }
        });
      } else {
        ref.off('child_changed');
      }
    };

    function getPartidaSettings() {
      if($rootScope.partidaEnCursoId) {
        GameSettingsService.getGameSettingsPartida($rootScope.partidaEnCursoId)
        .then(function(data) {
          var settings = data.data;
          settings.can_edit_match_settings = $rootScope.creadorPartidaId == $localStorage.jugador.idusuario && !$rootScope.isHistory;
          settings.from_match = true;
          GameSettingsService.setSettings(settings);
        }).catch(function(err) {
          console.error(err);
        });
      }
    }

    $rootScope.getCampoDisplay = function(campo) {
      if(campo.esCustom) {
        return campo.nombre;
      } else {
        return campo.name_display = campo.complejo + ' - ' + (campo.complejo == campo.nombre ? '' : (campo.nombre + ' - ')) + campo.salida;
      }
    };

    // IN APP PURCHASES
    // store.register({
    //   id: "com.hdsoftware.classicgolf.suscripcionanual",
    //   alias: "anual",
    //   type: store.PAID_SUBSCRIPTION
    // });

    // store.when("anual").updated(function() {
    //   $rootScope.suscription_product = store.get('anual');
    // });

    // store.when('anual')
    //  .approved(p => p.verify())
    //  .verified(p => p.finish())
    //  .unverified(p => console.log('unverified: ', p.alias));

    // store.when("anual").owned(function(product) {
    //   if($localStorage.jugador) {
    //     $ionicHistory.nextViewOptions({
    //       disableAnimate: true,
    //       disableBack: true,
    //       historyRoot: true
    //     });
    //     $state.go('app.home', { reload: true });
    //   } else {
    //     $state.go('login');
    //   }
    // });

    // store.validator = function(product, callback) {
    //   var idusuario = $localStorage.jugador ? $localStorage.jugador.idusuario : '';

    //   $http.post(apiUrl + '/usuarios/validatePurchase', {
    //     product: JSON.stringify(product),
    //     idusuario: idusuario
    //   }).then(function(response) {
    //     if(idusuario) {
    //       $localStorage.jugador.fechaExpiracion = response.data.fechaExpiracion;
    //     }

    //     switch (response.data.status) {
    //       case 'PURCHASE_VALID':
    //         callback(true);
    //         break;
    //       case 'CONNECTION_FAILED':
    //         callback(false, { code: store.CONNECTION_FAILED });
    //         break;
    //       case 'PURCHASE_EXPIRED':
    //         callback(false, { code: store.PURCHASE_EXPIRED });
    //         break;
    //     }
    //   });
    // };

    // store.error(function(e){
    //   console.log("ERROR " + e.code + ": " + e.message);
    // });

    // store.refresh();

    if (window.StatusBar) {
      StatusBar.styleLightContent();
    }

    if (window.cordova && window.Keyboard) {
      window.Keyboard.hideFormAccessoryBar(false);
    }

    if (cordova.platformId == 'android') {
      StatusBar.backgroundColorByHexString("#323c3f");
    }

    var loadExpiryDate = function(callback) {
      var idusuario = $localStorage.jugador ? $localStorage.jugador.idusuario : '';
      if(idusuario) {
        $http.get(apiUrl + '/usuarios/getExpiryDate', {
          params: {
            idusuario: idusuario
          }
        }).success(function(data) {
          callback(null, data.fechaExpiracion);
        }).error(function(err) {
          callback('An error occurred ' + err);
        });
      }
    };

    var saveExpiryDate = function(expiryDate, callback) {
      var idusuario = $localStorage.jugador ? $localStorage.jugador.idusuario : '';
      if(idusuario) {
        $http.post(apiUrl + '/usuarios/saveExpiryDate', {
          idusuario: idusuario
        }).success(function(data) {
          callback();
        }).error(function(err) {
          callback('An error occurred ' + err);
        });
      }
    };
	});
})
.config(function($urlRouterProvider, $compileProvider, $ionicConfigProvider, $httpProvider, $authProvider, apiUrl, ionicDatePickerProvider) {
	$authProvider.loginUrl = apiUrl + '/auth/login';
	$authProvider.signupUrl = apiUrl + '/auth/signup';
	$authProvider.logoutRedirect = '/';
	$authProvider.tokenRoot = 'data'; // set the token parent element if the token is not the JSON root
	$authProvider.tokenName = 'token';
	$authProvider.tokenPrefix = 'UXT';
	$authProvider.authToken = 'JWT'; //Default Bearer
	$authProvider.storage = 'localStorage'; // or 'localStorage'

	$compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|file|blob|cdvfile|content):|data:image\//);
	//para que angular no le ponga las clases de ng-scope etc. a los elementos, mejora performance
	$compileProvider.debugInfoEnabled(false);
	//para que haga uso del digest de varias cosas a la vez, no nomas 1.
	$httpProvider.useApplyAsync(true);
	// que no se pueda hacer swipe hacia el lado izquierdo en el menu
	$ionicConfigProvider.views.swipeBackEnabled(false);
  	$ionicConfigProvider.backButton.previousTitleText(false).text('');
  $urlRouterProvider.otherwise('/app/home');


	//configuracion del date picker
	var datePickerObj = {
    inputDate: new Date(),
    titleLabel: 'Select date',
    setLabel: 'Set',
    todayLabel: 'Today',
    closeLabel: 'Close',
    mondayFirst: false,
    weeksList: ["S", "M", "Tu", "W", "Th", "F", "S"],
    monthsList: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    templateType: 'popup',
    showTodayButton: true,
    dateFormat: 'dd MMMM yyyy',
    closeOnSelect: false,
    disableWeekdays: []
  };
	ionicDatePickerProvider.configDatePicker(datePickerObj);
})
.config(['$httpProvider', function ($httpProvider) {
	$httpProvider.interceptors.push(['$q', '$injector', function($q, $injector) {
    var inflightAuthRequest = null;
	  return {
      request: function(httpConfig) {
        var authService = $injector.get('$auth');
        var token = authService.getToken();
        if (token) {
        httpConfig.headers['Authorization'] = 'JWT ' + token
        }
        return httpConfig;
      },
      responseError: function (response) {
        if(response.config.url.indexOf('login') == -1) {
          // en dado caso tire un 401, siempre y cuando no sea login, por eso la validación
          switch (response.status) {
            case 401:
              var deferred = $q.defer();
              var localStorage = $injector.get('$localStorage');
              var authService = $injector.get('$auth');

              if (!inflightAuthRequest) {
                inflightAuthRequest = authService.login({ email: localStorage.jugador.email.toLowerCase(), password: localStorage.pwd.toLowerCase() });
              }
              inflightAuthRequest.then(function (r) {
                inflightAuthRequest = null;
                authService.setToken(r.data.token);
                $injector.get("$http")(response.config).then(function (resp) {
                  deferred.resolve(resp);
                }, function (resp) {
                  deferred.reject();
                });
              }, function (response) {
                inflightAuthRequest = null;
                deferred.reject();
                $injector.get("$state").go('login');
                return;
              });
              return deferred.promise;
            default:
              return $q.reject(response);
          }
        } else {
          return $q.reject(response);
        }
      }
	  };
	}]);
}]);
