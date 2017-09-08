define(['app'], function (app) {
    app
        .config(function ($stateProvider, $urlRouterProvider) {
            // Override the internal 'views' builder with a function that takes the state
            // definition, and a reference to the internal function being overridden:
            $stateProvider.decorator('views', function (state, parent) {
                var result = {}, views = parent(state);
                //var head = "http://localhost:8080/www/";
                var head = "";
                angular.forEach(views, function (config, name) {
                    config.controllerUrl = head + config.controllerUrl;
                    config.templateUrl = head + config.templateUrl;
                    result[name] = config;
                });
                return result;
            });

            $stateProvider
                .state("login", {
                    url: "/login",
                    templateUrl: "templates/login.html",
                    controllerUrl:"js/controllers/loginController.js"
                })
                .state("index", {
                    url: "/index",
                    templateUrl: "templates/index.html",
                    controllerUrl: "js/controllers/index/indexController.js",
                    abstract:true
                })
                .state("index.tab1",{
                    url:'/tab1',
                    templateUrl:"templates/tab1/main.html",
                    controllerUrl:"js/controllers/index/tab1Controller.js"
                })
                .state("index.tab2",{
                    url:'/tab2',
                    templateUrl:"templates/tab2/main.html",
                    controllerUrl:"js/controllers/index/tab2Controller.js"
                })
                .state("index.tab3",{
                    url:'/tab3',
                    templateUrl:"templates/tab3/main.html",
                    controllerUrl:"js/controllers/index/tab3Controller.js"
                })
                .state("index.tab4",{
                    url:'/tab4',
                    templateUrl:"templates/tab4/main.html",
                    controllerUrl:"js/controllers/index/tab4Controller.js"
                })

            if (window.$$appConfig.appType === 'debug') {
                $urlRouterProvider.otherwise("/index/tab1");
            }
            else if (window.$$appConfig.appType === 'release'
              || window.$$appConfig.appType === 'develop') {
                $urlRouterProvider.otherwise("/login");
            }
            $urlRouterProvider.when("/index","/index/tab1")
        });
});
