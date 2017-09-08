define(['app'], function (app) {
    app
        .config(['$ionicConfigProvider', '$sceDelegateProvider', function ($ionicConfigProvider, $sceDelegateProvider) {
            // $sceDelegateProvider.resourceUrlWhitelist([
            // Allow same origin resource loads.
            // 'self',
            // Allow loading from our assets domain.  Notice the difference between * and **.
            // 'http://srv*.assets.example.com/**'
            // ]);

            /*    // The blacklist overrides the whitelist so the open redirect here is blocked.
             *    $sceDelegateProvider.resourceUrlBlacklist([
             *      'http://myapp.example.com/clickThru**'
             *    ]);
             */
            $ionicConfigProvider.tabs.position('bottom');
            $ionicConfigProvider.platform.android.navBar.alignTitle('center');
            $ionicConfigProvider.views.maxCache(0);
            $ionicConfigProvider.templates.maxPrefetch(5);
            $ionicConfigProvider.backButton.text('').icon('ion-ios-arrow-back');
            $ionicConfigProvider.form.checkbox("circle");
            $ionicConfigProvider.scrolling.jsScrolling(true);
            $ionicConfigProvider.form.toggle('large')
            // 时间选择配置
            // var ipoptions = {
            //     inputDate: new Date(),
            //     setLabel: "确定",
            //     todayLabel: '今天',
            //     closeLabel: '关闭',
            //     mondayFirst: false,
            //     weeksList: ["日", "一", "二", "三", "四", "五", "六"],
            //     monthsList: ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"],
            //     templateType: 'popup',
            //     showTodayButton: true,
            //     closeOnSelect: false,
            //     from: new Date(2010, 1, 1),
            // };
            // ionicDatePickerProvider.configDatePicker(ipoptions);
        }])
        .run(function ($ionicPlatform, positionService, $rootScope, $ionicPopup,$interval) {
            $ionicPlatform.ready(function () {

                if (window.cordova && window.cordova.plugins.Keyboard) {
                    cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
                    cordova.plugins.Keyboard.disableScroll(true);
                }
                if (window.StatusBar) {
                    StatusBar.styleDefault();
                }
            });
            $rootScope.exitPopup = {
                isShow: false,
                time: 0
            }
            $ionicPlatform.registerBackButtonAction(function (e) {

                function showConfirm() {
                    var confirmPopup = $ionicPopup.confirm({
                        title: "<strong>退出应用？</strong>",
                        template: "你确定要退出吗？",
                        okText: "确定",
                        cancelText: "取消"
                    });
                    $rootScope.exitPopup.isShow = true;
                    confirmPopup.then(function (res) {
                        if (res) {
                            ionic.Platform.exitApp();
                        } else {
                            $rootScope.exitPopup.isShow = false
                        }
                    })
                }

                if (!$rootScope.exitPopup.isShow)
                    showConfirm();

            }, 999);

            function onSuccess(position) {
                positionService.setPosition(position);
            }

            function onError(error) {
                positionService.setError(error);
            }

            var watchID = navigator.geolocation.watchPosition(onSuccess, onError, {enableHighAccuracy: true});

        })
        .animation('.ui-fade', function () {
            return {
                enter: function (element, done) {
                    element.css({
                        opacity: 0,
                    });
                    element.animate({
                        opacity: 1,
                    }, 500, done);
                },
                leave: function (element, done) {
                    element.css({
                        opacity: 1,
                    });
                    element.animate({
                        opacity: 0,
                    }, 500, done);
                }
            };
        })
        .constant('$ionicLoadingConfig', {
            template: '<ion-spinner></ion-spinner>',
            content: 'Loading',
            animation: 'fade-in',
            showBackdrop: true,
            showDelay: 0,
            duration: 10000
        })
        // .config(["olStyleProvider", function (olStyleProvider) {
        //     var a = {
        //         trackLine: {
        //             stroke: {
        //                 color: 'rgba(106, 173, 255, 0.7)',
        //                 width: 7
        //             }
        //         },
        //         startPoint: {
        //             image: {
        //                 icon: {
        //                     src: 'img/markP.png',
        //                     anchor: [0.5, 1],
        //                     size: [25, 38],
        //                     offset: [0, 0]
        //                 }
        //             },
        //             zIndex: 1
        //         },
        //         endPoint: {
        //             image: {
        //                 icon: {
        //                     src: 'img/markP.png',
        //                     anchor: [0.5, 1],
        //                     size: [25, 38],
        //                     offset: [25, 0]
        //                 }
        //             },
        //             zIndex: 1
        //         },
        //         carPoint: {
        //             image: {
        //                 icon: {
        //                     src: 'img/gp.png',
        //                     anchor: [0.5, 0.5],
        //                     scale: 0.5
        //                 }
        //             },
        //             zIndex: 1
        //         }
        //     };
        //     olStyleProvider.setStyleOptions(a)
        // }])
});
