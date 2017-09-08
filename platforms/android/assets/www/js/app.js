//四合一 智慧管理平台
define(['ionic','asyncLoader','ngCordova','cgsDirectives','positionService','angularOpenlayersDirective'],function (ionic,asyncLoader) {
  var app = angular.module('zhly', ['ui.router', 'ionic', 'ngCordova','cgs.ionic.directive','positionService','openlayers-directive']);
  asyncLoader.configure(app);
  return app;
});



