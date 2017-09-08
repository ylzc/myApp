define(['app'], function (app) {
    app
        .controller("loginCtrl",
            function ($scope, $rootScope, $ionicPlatform, $ionicModal, ApiAction,
                      $ionicLoading, $ionicPopup, $http, $state, $stateParams) {
                $ionicPlatform.registerBackButtonAction(function (e) {
                    window.ionic.Platform.exitApp();
                }, 999);

                $scope.model = {
                    username: window.$$appConfig.appUser.username,
                    password: window.$$appConfig.appUser.password,
                    error: ""
                }

                $scope.check = function () {
                    $http.get(ApiAction.login(), {params: $scope.model})
                        .success(function (data) {
                            $ionicLoading.hide()
                            if (data.status == 200) {
                                window.$$appConfig.accountDB
                                    .executeSql("UPDATE accountTable SET username=? ,password=? WHERE id='LOGIN' ",
                                        [$scope.model.username, $scope.model.password]);
                                window.$$appConfig.appUser.username = $scope.model.username;
                                window.$$appConfig.appUser.password = $scope.model.password;
                                window.$$appConfig.appUser.id = window.angular.copy(data.message);
                                $state.go('index');
                            }
                            else {
                                $scope.model.error = data.message;
                            }
                            $ionicLoading.hide()
                        })
                        .error(function (error) {
                            $ionicPopup.alert({
                                title: "提示",
                                template: "网络链接错误"
                            })
                            $ionicLoading.hide()
                        })
                }
            })

});
