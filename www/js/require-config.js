require.config({
    baseUrl: './',
    map: {
        '*': {
            'css': 'lib/require-css/css' // or whatever the path to require-css is
        }
    },
    paths: {
        'app': 'js/app',
        'appConfig': 'js/app-config',
        'routes': 'js/routes',
        'ionic': 'lib/ionic/js/ionic.bundle',
        'ngCordova': 'lib/ngCordova/dist/ng-cordova',
        'bootstrap': 'js/bootstrap',
        'zepto': 'lib/zepto/zepto.min',
        'asyncLoader': 'lib/angular-async-loader/angular-async-loader',
        'datePicker': 'lib/ionic-datepicker.bundle.min',
        'cgsDirectives': 'js/directives/cgs-ionic-directive',
        'openLayers': 'lib/OpenLayers/build/ol-debug',
        'pOl3': 'lib/OpenLayers/p-ol3/p-ol3',
        'angularOpenlayersDirective': 'lib/OpenLayers/dist/angular-openlayers-directive',
        'appCtrl':'js/controllers/appController',
        'storage':"js/utils/storage",
        'apiAction':"js/utils/apiAction",
        "positionService":"js/directives/positionService"
    },
    shim: {
        'ionic': {
            exports: 'ionic'
        },
        'app': {
            deps: ['ionic']
        },
        'routes': {
            deps: ['ionic', 'app']
        },
        'appConfig': {
            deps: ['ionic','app']
        },
        'appCtrl': {
            deps: ['ionic','app']
        },
        'storage': {
            deps: ['ionic','app']
        },
        'apiAction': {
            deps: ['ionic','app']
        },
        'datePicker': {
            deps: ['ionic']
        },
        'cgsDirectives': {
            deps: ['ionic', 'ngCordova','zepto']
        },
        'angularOpenlayersDirective':{
            deps:['ionic','ngCordova','openLayers',
                'pOl3','zepto','positionService',
                'css!lib/OpenLayers/css/ol','css!lib/OpenLayers/p-ol3/p-ol3.min']
        },
        "positionService":{
            deps: ['ionic']
        }
    },
    priority: [
        'ionic',
        'ngCordova',
        'app',
        'routes',
        'appConfig',
    ],
    deps: [
        'bootstrap'
    ]
});
