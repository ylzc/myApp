(function (root, factory) {
  if (typeof require === 'function' && typeof exports === 'object') {
    // CommonJS
    var ol = require('openlayers');
    exports.angularOpenlayersDirective = factory(ol);
  } else if (typeof define === 'function' && define.amd) {
    // AMD.
    define(['openLayers','ionic','ngCordova','positionService'], function (ol, ionic) {
      return root.angularOpenlayersDirective = factory(ol, angular);
    });
  } else {
    // Browser globals
    root.angularOpenlayersDirective = factory(root.ol, root.P);
  }
}(this, function (ol, angular) {
  angular.module('openlayers-directive', ['ngSanitize','positionService']).directive('openlayers', ["$log", "$q", "$compile", "olHelpers", "olMapDefaults", "olData", function ($log, $q, $compile, olHelpers, olMapDefaults, olData) {

    return {
      restrict: 'EA',
      transclude: true,
      replace: true,
      scope: {
        center: '=olCenter',
        defaults: '=olDefaults',
        view: '=olView',
        events: '=olEvents'
      },
      template: '<div class="angular-openlayers-map" ng-transclude></div>',
      controller: ["$scope", function ($scope) {
        var _map = $q.defer();
        $scope.getMap = function () {
          return _map.promise;
        };

        $scope.setMap = function (map) {
          _map.resolve(map);
        };

        this.getOpenlayersScope = function () {
          return $scope;
        };
      }],
      link: function (scope, element, attrs) {
        var isDefined = olHelpers.isDefined;
        var createLayer = olHelpers.createLayer;
        var setMapEvents = olHelpers.setMapEvents;
        var setViewEvents = olHelpers.setViewEvents;
        var setClickMarker = olHelpers.setClickMarker;
        var setOverMarker = olHelpers.setOverMarker;
        var createView = olHelpers.createView;
        var defaults = olMapDefaults.setDefaults(scope);
        var createOverlay = olHelpers.createOverlay;
        var removeOverlay = olHelpers.removeOverlay;

        // Set width and height if they are defined
        if (isDefined(attrs.width)) {
          if (isNaN(attrs.width)) {
            element.css('width', attrs.width);
          } else {
            element.css('width', attrs.width + 'px');
          }
        }

        if (isDefined(attrs.height)) {
          if (isNaN(attrs.height)) {
            element.css('height', attrs.height);
          } else {
            element.css('height', attrs.height + 'px');
          }
        }

        if (isDefined(attrs.lat)) {
          defaults.center.lat = parseFloat(attrs.lat);
        }

        if (isDefined(attrs.lon)) {
          defaults.center.lon = parseFloat(attrs.lon);
        }

        if (isDefined(attrs.zoom)) {
          defaults.center.zoom = parseFloat(attrs.zoom);
        }

        var controls = ol.control.defaults(defaults.controls);
        var interactions = ol.interaction.defaults(defaults.interactions);
        var view = createView(defaults.view);

        // Create the Openlayers Map Object with the options
        var map = new ol.Map({
          target: element[0],
          controls: controls,
          interactions: interactions,
          renderer: defaults.renderer,
          view: view,
          loadTilesWhileAnimating: defaults.loadTilesWhileAnimating,
          loadTilesWhileInteracting: defaults.loadTilesWhileInteracting
        });
        if (attrs.scaleLine == true || attrs.scaleLine == "true")
          map.addControl(new ol.control.ScaleLine());
        scope.$on('$destroy', function () {
          olData.resetMap(attrs.id);
        });

        // If no layer is defined, set the default tileLayer
        if (!attrs.customLayers) {
          var l = {
            type: 'Tile',
            source: {
              type: 'OSM'
            }
          };
          var layer = createLayer(l, view.getProjection(), 'default');
          map.addLayer(layer);
          map.set('default', true);
        }

        if (!isDefined(attrs.olCenter)) {
          var c = ol.proj.transform([defaults.center.lon, defaults.center.lat],
            defaults.center.projection, view.getProjection()
          );
          view.setCenter(c);
          view.setZoom(defaults.center.zoom);
        }


        // Set the Default events for the map
        setMapEvents(defaults.events, map, scope);

        //Set the Default events for the map view
        setViewEvents(defaults.events, map, scope);

        // Resolve the map object to the promises
        scope.setMap(map);
        olData.setMap(map, attrs.id);
        scope.$on('showFeature', function (ev, args) {
          map.getLayers().forEach(function (w) {
            if (w.get('name') === 'qshc') {
              w.getSource().getFeatures().forEach(function (f) {
                f.setStyle(null);
                if (f.getProperties().idCard === args[0]) {
                  map.getView().fit(f.getGeometry())
                  f.setStyle(olHelpers.createStyle('styleConfig.qshcCheck'))
                }
              })
            }
          })
        })
        scope.$on('showOverlay', function (ev, args) {
          var feature = map.forEachFeatureAtPixel(args, function (feature) {
            return feature;
          });
          map.getLayers().forEach(function (layer) {
            if (layer.get("markers")) {
              layer.getSource().getFeatures().map(function (feature) {
                if (feature.get('featureInfo')) {
                  if (feature.get('featureInfo').data.active) {
                    feature.setStyle(olHelpers.createStyle(feature.get('featureInfo').data.style))
                    feature.get('featureInfo').data.active = false;
                  }
                }
              })
            }
          })
          var viewProjection = defaults.view.projection;
          if (feature) {
            removeOverlay(map, null, "clickLabel"); //移除弹框

            var tempInfo = feature.get("featureInfo"),
              featureType, featureData;
            if (tempInfo) {
              featureType = tempInfo.type;
              featureData = tempInfo.data;
            }
            if (featureType === "marker") { //marker
              var data = featureData;
              if (data.ngClick && (evt.type === 'click' || evt.type === 'touchend')) { //如果ol-marker元素上绑定了click事件，不再触发map的click事件
                var ele = data.ngClick;
                ele.triggerHandler('click');
                evt.preventDefault();
                evt.stopPropagation();
                return;
              }
              data.active = true;
              if (data.clickLabel.clickStyle) {
                feature.setStyle(olHelpers.createStyle(data.clickLabel.clickStyle))
              }
              if (data.clickLabel.title) {
                setClickMarker(feature, map, data, scope.$parent);
              }
            }
          }
        })
        /*
         * xiarx 20161124
         * 地图事件
         */
        var resolutionEventKey;
        map.on("click", function (evt) {
          var feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
            return feature;
          });
          //重置样式
          map.getLayers().forEach(function (layer) {
            if (layer.get("markers")) {
              layer.getSource().getFeatures().map(function (feature) {
                if (feature.get('featureInfo')) {
                  if (feature.get('featureInfo').data.active) {
                    feature.setStyle(olHelpers.createStyle(feature.get('featureInfo').data.style))
                    feature.get('featureInfo').data.active = false;
                  }
                }
              })
            }
          })
          var viewProjection = defaults.view.projection;
          if (feature) {
            scope.$emit("openlayers.map.clickFeature", feature.get("id") || "multiFeature"); //给父scope留一个接口,聚集点位传multiFeature
            removeOverlay(map, null, "clickLabel"); //移除弹框

            var tempInfo = feature.get("featureInfo"),
              featureType, featureData;
            if (tempInfo) {
              featureType = tempInfo.type;
              featureData = tempInfo.data;
            }

            if (feature.get("features")) { //汇聚而成的点位
              featureType = "clusterFeature";
            }

            /*
             * marker，可以有点击回调(ngClick)，因为它是单一的点，可以直接触发element的click事件
             * 而 olcluster，oltrack暂时不会有，因为他们是群体，无法去触发某个点的click事件。因此涉及到了子scope访问父scope方法的问题
             */
            if (featureType === "marker") { //marker
              var data = featureData;
              if (data.ngClick && (evt.type === 'click' || evt.type === 'touchend')) { //如果ol-marker元素上绑定了click事件，不再触发map的click事件
                var ele = data.ngClick;
                ele.triggerHandler('click');
                evt.preventDefault();
                evt.stopPropagation();
                return;
              }
              data.active = true;
              if (data.clickLabel.clickStyle) {
                feature.setStyle(olHelpers.createStyle(data.clickLabel.clickStyle))
              }
              if (data.clickLabel.title) { //marker点击显示标签

                //data里面要包含coord，lat，lon，label
                setClickMarker(feature, map, data, scope.$parent);
              }
            } else if (featureType === "clusterFeature") { //cluster
              var features = feature.get("features");
              var len = features.length;
              if (len == 1) {
                var feature1 = features[0];
                var data = feature1.get("featureInfo").data;

                if (data.clickLabel.title) { //marker点击显示标签
                  setClickMarker(feature1, map, data, scope.$parent);
                }
              } else {
                var temp = feature.get("multiFeatureEvent");
                if (!temp || temp.indexOf("over") == -1) {
                  var overLabel = feature.get("overLay");
                  if (overLabel && overLabel.getMap()) {
                    if (overLabel.get("overLabel")) { //如果已经悬浮产生列表
                      overLabel.unset("overLabel");
                      overLabel.set("clickLabel", "true"); //悬浮弹框变点击弹框
                    }
                  }

                  var view = map.getView();
                  if (resolutionEventKey) {
                    ol.Observable.unByKey(resolutionEventKey);
                  }
                  resolutionEventKey = view.on("change:resolution", function () {
                    removeOverlay(map, null, "clickLabel");
                  });
                }
              }
            }
          } else { //点中空白处，移除所有overlay
            removeOverlay(map, null, "clickLabel");
          }
        });

        scope.locateFeature = function (id, coord) {
          //移除弹框
          removeOverlay(map, null, "clickLabel");
          ol.Observable.unByKey(resolutionEventKey);

          var intCoord = [];
          intCoord = coord.split(",").map(function (data) {
            return +data;
          });
          var view = map.getView();
          var start = +new Date();
          //map.getView().setZoom(curZoom+1);
          if (view.getAnimating()) {
            view.cancelAnimations();
          }
          view.animate({
            resolution: view.getResolution(),
            center: view.getCenter(),
            duration: 1000
          });
          view.setCenter(intCoord);
          view.setZoom(18);
        }
      }
    };
  }]);

  angular.module('openlayers-directive').directive('olCenter', ["$log", "$location", "olMapDefaults", "olHelpers", function ($log, $location, olMapDefaults, olHelpers) {
    return {
      restrict: 'A',
      scope: false,
      replace: false,
      require: 'openlayers',

      link: function (scope, element, attrs, controller) {
        var safeApply = olHelpers.safeApply;
        var isValidCenter = olHelpers.isValidCenter;
        var isDefined = olHelpers.isDefined;
        var isArray = olHelpers.isArray;
        var isNumber = olHelpers.isNumber;
        var isSameCenterOnMap = olHelpers.isSameCenterOnMap;
        var setCenter = olHelpers.setCenter;
        var setZoom = olHelpers.setZoom;
        var olScope = controller.getOpenlayersScope();

        olScope.getMap().then(function (map) {
          var defaults = olMapDefaults.getDefaults(olScope);
          var view = map.getView();
          var center = olScope.center;

          if (attrs.olCenter.search('-') !== -1) {
            $log.error('[AngularJS - Openlayers] The "center" variable can\'t use ' +
              'a "-" on his key name: "' + attrs.center + '".');
            setCenter(view, defaults.view.projection, defaults.center, map);
            return;
          }

          if (!isDefined(center)) {
            center = {};
          }

          if (!isValidCenter(center)) {
            $log.warn('[AngularJS - Openlayers] invalid \'center\'');
            center.lat = defaults.center.lat;
            center.lon = defaults.center.lon;
            center.zoom = defaults.center.zoom;
            center.projection = defaults.center.projection;
          }

          if (!center.projection) {
            if (defaults.view.projection !== 'pixel') {
              center.projection = defaults.center.projection;
            } else {
              center.projection = 'pixel';
            }
          }

          if (!isNumber(center.zoom)) {
            center.zoom = 1;
          }

          setCenter(view, defaults.view.projection, center, map);
          view.setZoom(center.zoom);

          var centerUrlHash;
          if (center.centerUrlHash === true) {
            var extractCenterFromUrl = function () {
              var search = $location.search();
              var centerParam;
              if (isDefined(search.c)) {
                var cParam = search.c.split(':');
                if (cParam.length === 3) {
                  centerParam = {
                    lat: parseFloat(cParam[0]),
                    lon: parseFloat(cParam[1]),
                    zoom: parseInt(cParam[2], 10)
                  };
                }
              }
              return centerParam;
            };
            centerUrlHash = extractCenterFromUrl();

            olScope.$on('$locationChangeSuccess', function () {
              var urlCenter = extractCenterFromUrl();
              if (urlCenter && !isSameCenterOnMap(urlCenter, map)) {
                safeApply(olScope, function (scope) {
                  scope.center.lat = urlCenter.lat;
                  scope.center.lon = urlCenter.lon;
                  scope.center.zoom = urlCenter.zoom;
                });
              }
            });
          }

          var geolocation;
          olScope.$watchCollection('center', function (center) {

            if (!center) {
              return;
            }

            if (!center.projection) {
              center.projection = defaults.center.projection;
            }

            if (center.autodiscover) {
              if (!geolocation) {
                geolocation = new ol.Geolocation({
                  projection: ol.proj.get(center.projection)
                });

                geolocation.on('change', function () {
                  if (center.autodiscover) {
                    var location = geolocation.getPosition();
                    safeApply(olScope, function (scope) {
                      scope.center.lat = location[1];
                      scope.center.lon = location[0];
                      scope.center.zoom = 12;
                      scope.center.autodiscover = false;
                      geolocation.setTracking(false);
                    });
                  }
                });
              }
              geolocation.setTracking(true);
              return;
            }

            if (!isValidCenter(center)) {
              $log.warn('[AngularJS - Openlayers] invalid \'center\'');
              center = defaults.center;
            }

            var viewCenter = view.getCenter();
            if (viewCenter) {
              if (defaults.view.projection === 'pixel' || center.projection === 'pixel') {
                view.setCenter(center.coord);
              } else {
                var actualCenter =
                  ol.proj.transform(viewCenter, defaults.view.projection, center.projection);
                if (!(actualCenter[1] === center.lat && actualCenter[0] === center.lon)) {
                  setCenter(view, defaults.view.projection, center, map);
                }
              }
            }

            if (view.getZoom() !== center.zoom) {
              setZoom(view, center.zoom, map);
            }
          });

          var moveEndEventKey = map.on('moveend', function () {
            safeApply(olScope, function (scope) {

              if (!isDefined(scope.center)) {
                return;
              }

              var center = map.getView().getCenter();
              scope.center.zoom = view.getZoom();

              if (defaults.view.projection === 'pixel' || scope.center.projection === 'pixel') {
                scope.center.coord = center;
                return;
              }

              if (scope.center) {
                var proj = ol.proj.transform(center, defaults.view.projection, scope.center.projection);
                scope.center.lat = proj[1];
                scope.center.lon = proj[0];

                // Notify the controller about a change in the center position
                olHelpers.notifyCenterUrlHashChanged(olScope, scope.center, $location.search());

                // Calculate the bounds if needed
                if (isArray(scope.center.bounds)) {
                  var extent = view.calculateExtent(map.getSize());
                  var centerProjection = scope.center.projection;
                  var viewProjection = defaults.view.projection;
                  scope.center.bounds = ol.proj.transformExtent(extent, viewProjection, centerProjection);
                }
              }
            });
          });

          olScope.$on('$destroy', function () {
            ol.Observable.unByKey(moveEndEventKey);
          });
        });
      }
    };
  }]);

  //2017/4/19
  //由于ionic安全检查-阻止了原生click事件-ol的control无法使用
  //基于ionic框架构建self-control
  //引入cordova设备插件进行定位等功能
  angular.module('openlayers-directive').directive('olControlZoom', ["$log", "$q", "olData", "olMapDefaults", "olHelpers", "$compile", function ($log, $q, olData, olMapDefaults, olHelpers, $compile) {
    return {
      restrict: 'E',
      scope: {},
      replace: false,
      require: '^openlayers',
      link: function (scope, element, attrs, controller) {
        var olScope = controller.getOpenlayersScope();

        olScope.getMap().then(function (map) {
          scope.zoom = function (duration, delta) {
            var view = map.getView();
            if (!view) {
              return;
            }
            var currentResolution = view.getResolution();
            if (currentResolution) {
              var newResolution = view.constrainResolution(currentResolution, delta);
              if (duration > 0) {
                if (view.getAnimating()) {
                  view.cancelAnimations();
                }
                view.animate({
                  resolution: newResolution,
                  duration: duration,
                  easing: ol.easing.easeOut
                });
              } else {
                view.setResolution(newResolution);
              }
            }
          }
          var divHtml = '<div class="ol-zoom ol-unselectable ol-control">' +
            '<button class="ol-zoom-in ion-ios-plus-empty" on-tap="zoom(250,1)"></button>' +
            '<button class="ol-zoom-out ion-ios-minus-empty" on-tap="zoom(250,-1)"></button>' +
            '</div>';
          var ele = $compile(divHtml)(scope);


          ol.control.selfZoom = function (opt_options) {
            var options = opt_options || {};
            ol.control.Control.call(this, {
              element: options.element,
              target: options.target
            });
          };
          ol.inherits(ol.control.selfZoom, ol.control.Control);
          var selfZoom = new ol.control.selfZoom({
            element: ele[0]
          })
          map.addControl(selfZoom);
          scope.$on('$destroy', function () {
            //remove control
            map.removeControl(selfZoom);
          });
        });
      }
    };
  }]);

  angular.module('openlayers-directive').directive('olControlGeol', ["$log", "$q", "olData", "olMapDefaults", "olHelpers", "$compile", "$cordovaGeolocation", "$timeout", "$sce", "positionService","$http","$rootScope","ApiAction",function ($log, $q, olData, olMapDefaults, olHelpers, $compile, $cordovaGeolocation, $timeout, $sce, positionService,$http,$rootScope,ApiAction) {
    return {
      restrict: 'E',
      scope: {},
      replace: false,
      require: '^openlayers',
      link: function (scope, element, attrs, controller) {
        var isDefined = olHelpers.isDefined;
        var olScope = controller.getOpenlayersScope();
        //element.classList.add(ol.css.CLASS_HIDDEN);
        olScope.getMap().then(function (map) {
          var viewProjection = map.getView().getProjection().getCode();
          map.on("movestart", function (evt) {
            selfGeol.show();
          });
          scope.getnr=function (position) {
            $http.get(ApiAction.getNearRiver,{
              params:{
                longtitude:position.coords.longitude,
                latitude:position.coords.latitude
              }
            })
              .success(function (data) {
                var l=data.length;
                var nr=[]
                if(l<10)
                {
                  for(var i=0;i<l;i++)
                  {
                    $http.get(ApiAction.getReachDetil,{
                      params:{
                        reachId:data[i].REACH_ID
                      }
                    })
                      .success(function (data) {
                        nr.push(data.result)
                        if($rootScope.account.reachAll.length<=0)
                        {
                          $rootScope.account.reachAll=nr;
                          $rootScope.account.reachNow=$rootScope.account.reachAll[0]
                        }
                      })
                  }
                }
              })
              .error(function () {
              })
          }
          scope.reCenter = function (duration, delta) {
            var olay = map.getOverlayById('geolocation');
            var view = map.getView();
            if (!view || !olay) {
              return;
            }
            if (duration > 0) {
              scope.geolText = $sce.trustAsHtml('正在定位' + '<svg viewBox="0 0 64 64" style="width: 20px;fill: white;vertical-align: bottom;"><g><circle cx="16" cy="32" stroke-width="0" r="5.11292"><animate attributeName="fill-opacity" dur="750ms" values=".5;.6;.8;1;.8;.6;.5;.5" repeatCount="indefinite"></animate><animate attributeName="r" dur="750ms" values="3;3;4;5;6;5;4;3" repeatCount="indefinite"></animate></circle><circle cx="32" cy="32" stroke-width="0" r="4.11292"><animate attributeName="fill-opacity" dur="750ms" values=".5;.5;.6;.8;1;.8;.6;.5" repeatCount="indefinite"></animate><animate attributeName="r" dur="750ms" values="4;3;3;4;5;6;5;4" repeatCount="indefinite"></animate></circle><circle cx="48" cy="32" stroke-width="0" r="3.11292"><animate attributeName="fill-opacity" dur="750ms" values=".6;.5;.5;.6;.8;1;.8;.6" repeatCount="indefinite"></animate><animate attributeName="r" dur="750ms" values="5;4;3;3;4;5;6;5" repeatCount="indefinite"></animate></circle></g></svg>')
              var tp = {
                enableHighAccuracy: true,
                timeout: 10000
              }
              $cordovaGeolocation.getCurrentPosition({enableHighAccuracy: false, timeout: 9000})
                .then(function (position) {
                  position.status = true;
                  positionService.setLowPosition(position)
                  scope.getnr(position)
                }, function (error) {
                  positionService.setLowPosition({status: false})
                })
              $cordovaGeolocation.getCurrentPosition(tp)
                .then(function (position) {
                  //setCenter and overlayPosition
                  //alert([position.coords.longitude, position.coords.latitude])
                  var geoCoord = ol.proj.transform([position.coords.longitude, position.coords.latitude], "EPSG:4326", viewProjection);
                  scope.geolText = "定位成功";
                  $timeout(function () {
                    scope.geolText = "";
                  }, 1000)
                  olay.setPosition(geoCoord);
                  if (view.getAnimating()) {
                    view.cancelAnimations();
                  }
                  view.animate({
                    center: olay.getPosition(),
                    duration: duration,
                    easing: ol.easing.easeOut
                  });

                  //map.getView().setCenter(geoCoord);
                }, function (err) {
                  var position = positionService.getLowPosition()
                  if (!position.status) {
                    scope.geolText = "定位失败:" + err.message;
                    $timeout(function () {
                      scope.geolText = "";
                    }, 2000)
                  }
                  else {
                    scope.getnr(position)
                    var geoCoord = ol.proj.transform([position.coords.longitude, position.coords.latitude], "EPSG:4326", viewProjection);
                    scope.geolText = "定位成功";
                    $timeout(function () {
                      scope.geolText = "";
                    }, 1000)
                    olay.setPosition(geoCoord);
                    if (view.getAnimating()) {
                      view.cancelAnimations();
                    }
                    view.animate({
                      center: olay.getPosition(),
                      duration: duration,
                      easing: ol.easing.easeOut
                    });
                  }

                  //console.log(err);
                })
              if (view.getAnimating()) {
                view.cancelAnimations();
              }
              view.animate({
                center: olay.getPosition(),
                duration: duration,
                easing: ol.easing.easeOut
              });
            } else {
            }
            //                       scope.olLocate = {
            //                          'opacity': 0
            //                      };
          }
          var divHtml = '<div><div class="ol-locate ol-unselectable ol-control"  ng-style="olLocate" >' +
            '<button class="ol-locate-in ion-pinpoint" on-tap="reCenter(250)"></button>' +
            '</div><div class="mapText" ng-show="geolText"><span ng-bind-html="geolText" ></span></div></div>';
          var ele = $compile(divHtml)(scope);


          ol.control.selfGeol = function (opt_options) {
            this.show = ol.control.selfGeol.show;
            var options = opt_options || {};
            ol.control.Control.call(this, {
              element: options.element
            });
          };
          ol.control.selfGeol.show = function () {
            this.element.style.opacity = 1;
          };

          ol.inherits(ol.control.selfGeol, ol.control.Control);
          var selfGeol = new ol.control.selfGeol({
            element: ele[0]
          })
          map.addControl(selfGeol);
          scope.$on('$destroy', function () {
            //remove control
            map.removeControl(selfGeol);
          });
        });
      }
    };
  }]);

  angular.module('openlayers-directive').directive('olControlCenter', ["$log", "$q", "olData", "olMapDefaults", "olHelpers", "$compile", function ($log, $q, olData, olMapDefaults, olHelpers, $compile) {
    return {
      restrict: 'E',
      scope: {},
      replace: false,
      require: '^openlayers',
      link: function (scope, element, attrs, controller) {
        var isDefined = olHelpers.isDefined;
        var olScope = controller.getOpenlayersScope();
        olScope.getMap().then(function (map) {
          map.on("movestart", function (evt) {

          });
          var divHtml = '<div class="ol-showCenter ol-unselectable ol-control">' +
            '<div class="ol-center-in ion-ios-location" ></div>' +
            '</div>';
          var ele = $compile(divHtml)(scope);

          ol.control.center = function (opt_options) {

            var options = opt_options || {};
            ol.control.Control.call(this, {
              element: options.element
            });
          };

          ol.inherits(ol.control.center, ol.control.Control);
          var center = new ol.control.center({
            element: ele[0]
          })
          map.addControl(center);
          scope.$on('$destroy', function () {
            //remove control
            map.removeControl(center);
          });
        });
      }
    };
  }]);


  angular.module('openlayers-directive').directive('olGeolocation',
    ["$log", "$sce", "$compile", "olMapDefaults", "olHelpers", "$cordovaDeviceOrientation", "$cordovaGeolocation",
      "$timeout", "$interval", "positionService",
      function ($log, $sce, $compile, olMapDefaults, olHelpers, $cordovaDeviceOrientation, $cordovaGeolocation,
                $timeout, $interval, positionService) {
        return {
          restrict: 'E',
          scope: {},
          require: '^openlayers',
          link: function (scope, element, attrs, controller) {
            var isDefined = olHelpers.isDefined;
            var olScope = controller.getOpenlayersScope();


            olScope.getMap().then(function (map) {
              var viewProjection = map.getView().getProjection().getCode();

              var data = {
                projection: "EPSG:4326",
                coord: [121.33, 30.75],
              }
              var pos = ol.proj.transform(data.coord, data.projection, viewProjection);

              var divHtml = '<div class="ol-geolocation" ng-style="geolocationStyle"></div>';

              var ele = $compile(divHtml)(scope);

              var label = new ol.Overlay({
                id: 'geolocation',
                position: pos, //初始pos-从缓存中获得？
                element: ele[0],
                positioning: 'center-center',
                insertFirst: false
              });

              map.addOverlay(label);

              var posOptions = {
                enableHighAccuracy: true
              };
              $cordovaGeolocation.getCurrentPosition(posOptions)
                .then(function (position) {
                  //alert([position.coords.longitude, position.coords.latitude])
                  //setCenter and overlayPosition
                  scope.olgeolocation = position.coords;
                  var geoCoord = ol.proj.transform([position.coords.longitude, position.coords.latitude], "EPSG:4326", viewProjection);
                  label.setPosition(geoCoord);
                  map.getView().setCenter(geoCoord);
                }, function (err) {
                  alert('定位失败')
                  //console.log(err);
                })

              $cordovaGeolocation.getCurrentPosition({
                enableHighAccuracy: false
              })
                .then(function (position) {
                  //alert([position.coords.longitude, position.coords.latitude])
                  //setCenter and overlayPosition
                  scope.olgeolocation = position.coords;
                  var geoCoord = ol.proj.transform([position.coords.longitude, position.coords.latitude], "EPSG:4326", viewProjection);
                  label.setPosition(geoCoord);
                  map.getView().setCenter(geoCoord);
                }, function (err) {
                  // alert('定位失败')
                  //console.log(err);
                })
              scope.positionTimer = $interval(function () {
                var _position = positionService.getPosition();
                //alert(JSON.stringify(_position,null,4))
                if (_position.status) {
                  scope.olgeolocation = _position.coords;
                  var geoCoord = ol.proj.transform([_position.coords.longitude, _position.coords.latitude], "EPSG:4326", viewProjection);
                  label.setPosition(geoCoord);
                  if (attrs.autoCenter == true || attrs.autoCenter == "true")
                    map.getView().setCenter(geoCoord);
                }
              }, 2000);
              //                  result:0-360,-1,25
              $cordovaDeviceOrientation.getCurrentHeading()
                .then(function (result) {
                  scope.geolocationStyle = {
                    'transform': 'rotate(' + result.magneticHeading + 'deg)',
                    '-webkit-transform': 'rotate(' + result.magneticHeading + 'deg)'
                  }
                }, function (err) {
                });

              var watch = $cordovaDeviceOrientation.watchHeading({
                frequency: 100
              });
              watch.then(null, function (err) {
                },
                function (result) {
                  scope.geolocationStyle = {
                    'transform': 'rotate(' + result.magneticHeading + 'deg)',
                    '-webkit-transform': 'rotate(' + result.magneticHeading + 'deg)'
                  }
                });

              scope.$on('$destroy', function () {
                if (label) {
                  map.removeOverlay(label);
                }
                if (typeof (watch.clearWatch) == 'function')
                  watch.clearWatch();
                $interval.cancel(scope.positionTimer);
                scope.positionTimer = null;
              });
            });

          }
        }
      }]);

  angular.module('openlayers-directive').directive('olLayer', ["$log", "$q", "olMapDefaults", "olHelpers", function ($log, $q, olMapDefaults, olHelpers) {

    return {
      restrict: 'E',
      scope: {
        properties: '=olLayerProperties',
        onLayerCreated: '&'
      },
      replace: false,
      require: '^openlayers',
      link: function (scope, element, attrs, controller) {
        var isDefined = olHelpers.isDefined;
        var equals = olHelpers.equals;
        var olScope = controller.getOpenlayersScope();
        var createLayer = olHelpers.createLayer;
        var setVectorLayerEvents = olHelpers.setVectorLayerEvents;
        var detectLayerType = olHelpers.detectLayerType;
        var createStyle = olHelpers.createStyle;
        var isBoolean = olHelpers.isBoolean;
        var addLayerBeforeMarkers = olHelpers.addLayerBeforeMarkers;
        var isNumber = olHelpers.isNumber;
        var insertLayer = olHelpers.insertLayer;
        var removeLayer = olHelpers.removeLayer;
        var addLayerToGroup = olHelpers.addLayerToGroup;
        var removeLayerFromGroup = olHelpers.removeLayerFromGroup;
        var getGroup = olHelpers.getGroup;

        olScope.getMap().then(function (map) {
          var projection = map.getView().getProjection();
          var defaults = olMapDefaults.setDefaults(olScope);
          var layerCollection = map.getLayers();
          var olLayer;

          scope.$on('$destroy', function () {
            if (scope.properties.group) {
              removeLayerFromGroup(layerCollection, olLayer, scope.properties.group);
            } else {
              removeLayer(layerCollection, olLayer.index);
            }

            map.removeLayer(olLayer);
          });

          if (!isDefined(scope.properties)) {
            if (isDefined(attrs.sourceType) && isDefined(attrs.sourceUrl)) {
              var l = {
                source: {
                  url: attrs.sourceUrl,
                  type: attrs.sourceType
                }
              };

              olLayer = createLayer(l, projection, attrs.layerName, scope.onLayerCreated);
              if (detectLayerType(l) === 'Vector') {
                setVectorLayerEvents(defaults.events, map, scope, attrs.name);
              }
              addLayerBeforeMarkers(layerCollection, olLayer);
            }
            return;
          }

          scope.$watch('properties', function (properties, oldProperties) {
            if (!isDefined(properties.source) || !isDefined(properties.source.type)) {
              return;
            }

            if (!isDefined(properties.visible)) {
              properties.visible = true;
              return;
            }

            if (!isDefined(properties.opacity)) {
              properties.opacity = 1;
              return;
            }

            var style;
            var group;
            var collection;
            if (!isDefined(olLayer)) {
              olLayer = createLayer(properties, projection, scope.onLayerCreated);
              if (isDefined(properties.group)) {
                addLayerToGroup(layerCollection, olLayer, properties.group);
              } else if (isDefined(properties.index)) {
                insertLayer(layerCollection, properties.index, olLayer);
              } else {
                addLayerBeforeMarkers(layerCollection, olLayer);
              }

              if (detectLayerType(properties) === 'Vector') {
                setVectorLayerEvents(defaults.events, map, scope, properties.name);
              }

              if (isBoolean(properties.visible)) {
                olLayer.setVisible(properties.visible);
              }

              if (properties.opacity) {
                olLayer.setOpacity(properties.opacity);
              }

              if (angular.isArray(properties.extent)) {
                olLayer.setExtent(properties.extent);
              }

              if (properties.style) {
                if (!angular.isFunction(properties.style)) {
                  style = createStyle(properties.style);
                } else {
                  style = properties.style;
                }
                // not every layer has a setStyle method
                if (olLayer.setStyle && angular.isFunction(olLayer.setStyle)) {
                  olLayer.setStyle(style);
                }
              }

              if (properties.minResolution) {
                olLayer.setMinResolution(properties.minResolution);
              }

              if (properties.maxResolution) {
                olLayer.setMaxResolution(properties.maxResolution);
              }

            } else {
              var isNewLayer = (function (olLayer) {
                // this function can be used to verify whether a new layer instance has
                // been created. This is needed in order to re-assign styles, opacity
                // etc...
                return function (layer) {
                  return layer !== olLayer;
                };
              })(olLayer);

              // set source properties
              if (isDefined(oldProperties) && !equals(properties.source, oldProperties.source)) {
                var idx = olLayer.index;
                collection = layerCollection;
                group = olLayer.get('group');

                if (group) {
                  collection = getGroup(layerCollection, group).getLayers();
                }

                collection.removeAt(idx);

                olLayer = createLayer(properties, projection, scope.onLayerCreated);
                olLayer.set('group', group);

                if (isDefined(olLayer)) {
                  insertLayer(collection, idx, olLayer);

                  if (detectLayerType(properties) === 'Vector') {
                    setVectorLayerEvents(defaults.events, map, scope, properties.name);
                  }
                }
              }

              // set opacity
              if (isDefined(oldProperties) &&
                properties.opacity !== oldProperties.opacity || isNewLayer(olLayer)) {
                if (isNumber(properties.opacity) || isNumber(parseFloat(properties.opacity))) {
                  olLayer.setOpacity(properties.opacity);
                }
              }

              // set index
              if (isDefined(properties.index) && properties.index !== olLayer.index) {
                collection = layerCollection;
                group = olLayer.get('group');

                if (group) {
                  collection = getGroup(layerCollection, group).getLayers();
                }

                removeLayer(collection, olLayer.index);
                insertLayer(collection, properties.index, olLayer);
              }

              // set group
              if (isDefined(properties.group) && properties.group !== oldProperties.group) {
                removeLayerFromGroup(layerCollection, olLayer, oldProperties.group);
                addLayerToGroup(layerCollection, olLayer, properties.group);
              }

              // set visibility
              if (isDefined(oldProperties) &&
                isBoolean(properties.visible) &&
                properties.visible !== oldProperties.visible || isNewLayer(olLayer)) {
                olLayer.setVisible(properties.visible);
              }

              // set style
              if (isDefined(properties.style) &&
                !equals(properties.style, oldProperties.style) || isNewLayer(olLayer)) {
                if (!angular.isFunction(properties.style)) {
                  style = createStyle(properties.style);
                } else {
                  style = properties.style;
                }
                // not every layer has a setStyle method
                if (olLayer.setStyle && angular.isFunction(olLayer.setStyle)) {
                  olLayer.setStyle(style);
                }
              }

              //set min resolution
              if (!equals(properties.minResolution, oldProperties.minResolution) || isNewLayer(olLayer)) {
                if (isDefined(properties.minResolution)) {
                  olLayer.setMinResolution(properties.minResolution);
                }
              }

              //set max resolution
              if (!equals(properties.maxResolution, oldProperties.maxResolution) || isNewLayer(olLayer)) {
                if (isDefined(properties.maxResolution)) {
                  olLayer.setMaxResolution(properties.maxResolution);
                }
              }
            }
          }, true);
        });
      }
    };
  }]);

  angular.module('openlayers-directive').directive('olPath', ["$log", "$q", "olMapDefaults", "olHelpers", function ($log, $q, olMapDefaults, olHelpers) {

    return {
      restrict: 'E',
      scope: {
        properties: '=olGeomProperties',
        style: '=olStyle',
        coords: '=coords'
      },
      require: '^openlayers',
      replace: true,
      template: '<div class="popup-label path" ng-bind-html="message"></div>',

      link: function (scope, element, attrs, controller) {
        var isDefined = olHelpers.isDefined;
        var createFeature = olHelpers.createFeature;
        var createOverlay = olHelpers.createOverlay;
        var createVectorLayer = olHelpers.createVectorLayer;
        var insertLayer = olHelpers.insertLayer;
        var removeLayer = olHelpers.removeLayer;
        var olScope = controller.getOpenlayersScope();

        olScope.getMap().then(function (map) {
          var mapDefaults = olMapDefaults.getDefaults(olScope);
          // var viewProjection = mapDefaults.view.projection;
          var viewProjection = map.getView().getProjection().getCode();

          var layer = createVectorLayer(attrs.zindex || 0);
          layer.set('name', attrs.name || 'olPath')
          var layerCollection = map.getLayers();

          insertLayer(layerCollection, layerCollection.getLength(), layer);

          scope.$on('$destroy', function () {

            // removeLayer(layerCollection, layer.index);
            map.removeLayer(layer);
            watch();
          });


          var watch = scope.$watch('coords', function (nval) {
            if (nval) {
              var proj = attrs.proj || 'EPSG:4326';
              var coords = nval;
              var radius = parseFloat(attrs.radius) || 0;

              /*xiarx 20161120 添加线的绘制  type种类Point, LineString, MultiLineString, Polygon*/
              var type = attrs.type ? attrs.type : 'Polygon';
              var defaultStyle = mapDefaults.styles.path;

              if (type == "Point") {
                defaultStyle = mapDefaults.styles.feature;
              }
              var data = {
                type: type,
                coords: coords,
                radius: radius,
                projection: proj,
                style: scope.style ? scope.style : defaultStyle
              };
              var feature = createFeature(data, viewProjection);
              layer.getSource().clear(true)
              layer.getSource().addFeature(feature);

              if (attrs.message) {
                scope.message = attrs.message;
                var extent = feature.getGeometry().getExtent();
                var label = createOverlay(element, extent);
                map.addOverlay(label);
              }
              return;
            } else {
              layer.getSource().clear(true)
            }
          }, true)
        });
      }
    };
  }]);


  angular.module('openlayers-directive')
    .directive('olOverlays', ["$log", "$q", "$interval", "olHelpers", '$compile','$http',"$ionicModal","ApiAction","$ionicPlatform","$state","$rootScope","$ionicPopup",
      function ($log, $q, $interval, olHelpers, $compile,$http,$ionicModal,ApiAction,$ionicPlatform,$state,$rootScope,$ionicPopup) {
    return {
      restrict: 'E',
      require: '^openlayers',
      scope: {
        model:"=",
        map:"="
      },
      link: function (scope, element, attrs, controller) {
        var olScope = controller.getOpenlayersScope();
        var userType=attrs.type;
        var templateUrl=attrs.templateUrl;
        $ionicModal.fromTemplateUrl(templateUrl,{
          scope:scope
        }).then(function (modal) {
          scope.modal=modal;
        })
        scope.$on("$destory",function () {
          scope.modal.remove()
        })
        scope.overlayMsg = [];

        scope.yhgl=function(){
          $http.get(ApiAction.jinsGetEventsByInspectId,{params:scope.model})
            .success(function (data) {
              scope.overlayMsg = data.result;
              scope.drawLabels()
            })
        }
        scope.getData=function (){
          if(userType=='yhgl')
          {
            scope.getyhdList = function () {
              $http.get(ApiAction.getWorkerList, {params: {userid: $rootScope.account.id, pageSize: 9999, pageNo: 1}})
                .success(function (data) {
                  scope.yhdList = data.result;
                })
            }
            scope.getyhdList();
            scope.yhgl()
            scope.goBack=function () {
              if(scope.model.type=='no')
                $state.go("yhglmes.no")
              else if(scope.model.type=='yes')
                $state.go("yhglmes.yes")
              else if(scope.model.type="com")
                $state.go("yhglmes.complete")
            }
          }else if(userType=='yhgr')
          {
            scope.yhgl()
            scope.goBack=function()
            {
              $state.go("yhmesList");
            }
          }
        }
        scope.zhipai = function () {
          scope.riv = {index: null};
          var mshow = $ionicPopup.show({
            title: "养护工人",
            template: "<ion-checkbox ng-repeat='r in yhdList track by $index' ng-model='riv.index' ng-true-value='{{$index}}' >{{r.NAME}}</ion-checkbox>",
            scope: scope,
            buttons: [
              {
                text: "取消", type: "button-light",
                onTap: function (e) {
                  return "cancel";
                }
              },
              {
                text: "确定", type: "button-positive",
                onTap: function (e) {
                  if (scope.riv.index === null) {
                    e.preventDefault();
                  }
                  else {
                    return scope.riv.index;
                  }
                }
              }
            ]
          })
          mshow.then(function (b) {
            if (b != "cancel") {
              scope.ec.nextDealPersonId = scope.yhdList[b].ID;
              scope.zhipaih()
            }
          })
        }

        scope.zhipaih = function () {
          $http.get(ApiAction.jinsYHGSGiveEvent, {
            params: scope.ec
          })
            .success(function (data) {
              if (data.code == 200) {
                scope.getData()
                scope.closeModal()
              }
            })
        }
        scope.getDetail = function (id) {
          $http.get(ApiAction.getEventDetailHz, {
            params: {
              userid: $rootScope.account.id,
              eventId: id,
            }
          })
            .success(function (data) {
              if (data.code == 200) {
                scope.detail = data.result;
                scope.detail.pictures=[];
                if (scope.detail.eventDeal.length > 0) {
                  if (scope.detail.eventDeal[0].eventAccessory.length > 0) {
                    var l = scope.detail.eventDeal[0].eventAccessory.length;
                    for (var i = 0; i < l; i++) {
                      var isrc = ApiAction.fileDown + scope.detail.eventDeal[0].eventAccessory[i].url
                      scope.detail.pictures.push({
                        "background-image": "url(" + isrc + ")",
                        "src": isrc
                      })
                    }
                  }
                }
              }
            })
            .error(function (err) {
            })
        }
        scope.complete=function()
        {
          $http.post(ApiAction.jinsYHGRFeedBack,[], {
            params: {
              event_id: scope.ec.event_id,
              userid: scope.ec.userid,
              dealContent: scope.ec.dealContent,
            }
          })
            .success(function (data) {
              if (data.code == 200) {
                scope.getData()
                scope.closeModal()
              }
            })
        }

        olScope.getMap().then(function (map) {
          var viewProjection = map.getView().getProjection().getCode();
          var projection = attrs.projection?attrs.projection : 'EPSG:4326';

          scope.drawLabels = function () {
            if(scope.overlayMsg.length>0)
            {
              scope.map.center.lat=parseFloat(scope.overlayMsg[0].LATITUDE);
              scope.map.center.lon=parseFloat(scope.overlayMsg[0].LONGITUDE);
              scope.map.center.zoom=15;
            }
            angular.forEach(scope.labels, function (v) {
              map.removeOverlay(v)
            })
            scope.labels = [];
            angular.forEach(scope.overlayMsg, function (v, i) {
              var sta="";
              if(scope.overlayMsg[i].EVENTSTATUS=='O')
                sta="未指派"
              else if(scope.overlayMsg[i].EVENTSTATUS=='P')
                sta="已指派"
              else if(scope.overlayMsg[i].EVENTSTATUS=='K')
                sta="已完成"
              var divHtml = '<div class="quesPopover" on-tap="openModal(overlayMsg[' + i + '])" >' +
                '<span style="color:#FA9825;padding-right:5px;display:block">{{overlayMsg[' + i + '].EVENTNAME}}</span>' +
                '<span style="color:#606060;display:block">{{overlayMsg[' + i + '].EVENTCONTENT}}</span>' +
                '<span style="text-align: right;display:block;" >'+sta+'</span>'+
                '</div>';

              var ele = $compile(divHtml)(scope);

              scope.labels.push(new ol.Overlay({
                position: ol.proj.transform([parseFloat(v.LONGITUDE), parseFloat(v.LATITUDE)], projection, viewProjection),
                element: ele[0],
                positioning: 'bottom-center',
                insertFirst: false,
                offset: [-60, -30]
              }));
            })
            angular.forEach(scope.labels, function (v) {
              map.addOverlay(v)
            })
          }
          scope.getData()
          scope.openModal=function(i){
            scope.showData=i;
            scope.getDetail(scope.showData.EVENT_ID)
            scope.ec = {
              event_id: scope.showData.EVENT_ID,
              userid: $rootScope.account.id,
              nextDealPersonId: "",
              dealContent:""
            }
            scope.modal.show()
            $ionicPlatform.registerBackButtonAction(function () {
              scope.closeModal()
            })
          }
          scope.closeModal=function () {
            scope.modal.hide()
            $ionicPlatform.registerBackButtonAction(function () {
              scope.goBack();
            })
          }

        })
      }
    }
  }])

  /*
   data = {
   lat: 0,
   lon: 0,
   }

   $scope.track = {
   trackStyle: {
   lineStyle: 'styleConfig.trackLine',
   startStyle: 'styleConfig.startPoint',
   carStyle: 'styleConfig.carPoint'
   },
   properties: {
   distance: 0,
   startTime: 0,
   endTime: 0
   }
   }
   <ol-realtrack  ol-realtrack-properties="track.properties" ng-if="xuncha" track-style="track.trackStyle"></ol-realtrack>
   .config(["olStyleProvider", function (olStyleProvider) {
   var a = {
   trackLine: {
   stroke: {
   color: 'rgba(106, 173, 255, 0.7)',
   width: 7
   }
   },
   startPoint: {
   image: {
   icon: {
   src: 'img/markP.png',
   anchor: [0.5, 1],
   size: [25, 38],
   offset: [0, 0]
   }
   },
   zIndex: 1
   },
   carPoint: {
   image: {
   icon: {
   src: 'img/p.png',
   anchor: [0.5, 0.5],
   scale: 1
   }
   },
   zIndex: 1
   }
   };
   olStyleProvider.setStyleOptions(a)
   }])
   */
  angular.module('openlayers-directive').directive('olRealtrack', ["$log", "$q", "olMapDefaults", "$compile", "olHelpers", "$timeout", "positionService", "$interval", "$http", "ApiAction", function ($log, $q, olMapDefaults, $compile, olHelpers, $timeout, positionService, $interval, $http, ApiAction) {
    return {
      restrict: 'E',
      require: '^openlayers',
      scope: {
        //存放点位，距离信息
        properties: '=olRealtrackProperties',
        //                points: '=points',
        trackStyle: '=trackStyle', //存放线，点的样式
        endHandle: '&',
      },
      link: function (scope, element, attrs, controller) {
        var olScope = controller.getOpenlayersScope();
        var points = [];
        var projection = attrs.projection ? attrs.projection : "EPSG:4326";
        var isCenter = attrs.isCenter;
        var mapDefaults = olMapDefaults.getDefaults(olScope);
        var viewProjection = mapDefaults.view.projection;

        var trackLayer, trackLabel;
        var createVectorLayer = olHelpers.createVectorLayer;
        var createStyle = olHelpers.createStyle;

        var isDefined = olHelpers.isDefined;
        var getGreatCircleDistance = olHelpers.getGreatCircleDistance;

        var carStyle = createStyle(scope.trackStyle.carStyle);

        olScope.getMap().then(function (map) {
          scope.$on('$destroy', function () {
            $interval.cancel(scope.timer);
            scope.carTrack = {};
            trackLayer.setMap(null);
            trackLayer = null;
            startPoint = null;
            trackLine = null;
          });
          scope.$on('stopTrack', function (e, data) {
            $interval.cancel(scope.timer);
            scope.timer = null;
            //传参用对象scope.endHandle({key:postPoints})DOM：end-handle="postOk(key)"
            scope.endHandle({key: postPoints})
          });
          var mapDefaults = olMapDefaults.getDefaults(olScope);
          var view = map.getView();

          //trackLayer绘制路线和点 ， points存放未上传的点，trackLine随data的变化而绘制，直到指令销毁才被销毁

          trackLayer = createVectorLayer();
          trackLayer.set('name', 'realTrack');
          //                    trackLayer.setMaxResolution(69.44444444444444);
          trackLayer.setMap(map)

          var car; //存放carfeature
          var startPoint; //起始点位
          var trackLine; //绘制路线
          var points = []; //绘制队列的维护

          startPoint = new ol.Feature();
          trackLine = new ol.Feature();
          car = new ol.Feature();

          startPoint.setStyle(createStyle(scope.trackStyle.startStyle));
          trackLine.setStyle(createStyle(scope.trackStyle.lineStyle));
          car.setStyle(carStyle);

          trackLayer.getSource().addFeature(startPoint);
          trackLayer.getSource().addFeature(trackLine);
          trackLayer.getSource().addFeature(car);

          function drawStart(data) {
            startPoint.setGeometry(new ol.geom.Point(ol.proj.transform([data.longitude, data.latitude], projection, viewProjection)))
          }

          function drawLine(points) {
            trackLine.setGeometry(new ol.geom.LineString(points))
          }

          var wgs84Sphere = new ol.Sphere(6378137);
          var inPost = 0;
          var postPointer = 0; //上传数组下标
          var postPoints = []; //上传数组
          var oval; //历史点

          //绘制第一个点
          var oval = positionService.getPosition();
          if (!oval.status) {
            oval = positionService.getLowPosition();
          }
          scope.properties.startTime = new Date().valueOf();
          scope.properties.postTime = new Date().valueOf();
          scope.properties.distance = 0;
          drawStart(oval.coords);
          scope.properties.endTime = new Date().valueOf();

          var firstP = ol.proj.transform([oval.coords.longitude, oval.coords.latitude], projection, viewProjection)
          points.push(firstP);
          //postPoints.push(oval.coords);
          car.setGeometry(new ol.geom.Point(firstP));
          view.setCenter(firstP);
          view.setZoom(16);

          scope.timer = $interval(function () {
            var nval = positionService.getPosition();
            scope.properties.endTime = new Date().valueOf();
            if (nval.status && (nval.coords.latitude !== oval.coords.latitude || nval.coords.longitude !== oval.coords.longitude)) {

              points.push(ol.proj.transform([nval.coords.longitude, nval.coords.latitude], projection, viewProjection));
              postPoints.push([nval.coords.longitude, nval.coords.latitude]);

              if (oval) {
                drawLine(points);
                scope.properties.distance += wgs84Sphere.haversineDistance([oval.coords.longitude, oval.coords.latitude], [nval.coords.longitude, nval.coords.latitude]);
              }
              if (!inPost) {
                if (postPoints.length > 30 || (scope.properties.endTime - scope.properties.postTime) > 60000) {
                  scope.properties.postTime = new Date().valueOf();
                  inPost = 1;
                  postPointer = postPoints.length;
                  //上传的是postPoints[0-postPointer]=>a a[[120,30]]
                  var a = postPoints.slice(0, postPointer);
                  var inspectPoints = "";
                  var l = a.length;
                  for (i = 0; i < l; i++) {
                    inspectPoints += a[i][0] + "," + a[i][1] + ";";
                  }
                  $http.post(ApiAction.recordInspectPoint(), {},{
                      params:{
                          longitudeAndLatitude:inspectPoints.substring(0, inspectPoints.length - 1),
                          inspect_id:scope.properties.id
                      }
                  }).success(function (data) {
                      postPoints.splice(0, postPointer);
                      inPost = 0;
                  }).error(function (err) {
                    inPost = 0;
                  })
                }
              }

              //绘制car n = new ol.geom.Point; f.setGeometry(n)
              var CarGeo = new ol.geom.Point(ol.proj.transform([nval.coords.longitude, nval.coords.latitude], projection, viewProjection))
              car.setGeometry(CarGeo);
//                            if (nval.direction) {
//                                carStyle.getImage().setRotation(Math.PI * (nval.direction / 360) * 2)
//                                car.setStyle(carStyle) //如果有旋转
//                            }


              var requestedPosition;
              requestedPosition = ol.proj.transform([nval.coords.longitude, nval.coords.latitude], projection, viewProjection);

              if (isCenter) { //是否让车辆一直位于地图的中心
                view.setCenter(requestedPosition);
              } else { //若车辆跑到了可视范围之外，移动地图居中
                var size = map.getSize();
                var extent = view.calculateExtent(size);
                if (!ol.extent.containsCoordinate(extent, requestedPosition)) {
                  view.setCenter(requestedPosition);
                  //                                    view.setZoom(15)
                }
              }
              oval = angular.copy(nval);
            }
          }, 1000)

        });
      }
    }
  }]);
  angular.module('openlayers-directive').directive('olRiver', ["$log", "$q", "olMapDefaults", "$compile", "olHelpers", "$timeout", "positionService", "$interval", "$rootScope", function ($log, $q, olMapDefaults, $compile, olHelpers, $timeout, positionService, $interval, $rootScope) {
    return {
      restrict: 'E',
      require: '^openlayers',
      scope: {
        clickHandle: '&', //click-handle="postOk()" 调用外部$scope.postOk()
      },
      link: function (scope, element, attrs, controller) {
        var olScope = controller.getOpenlayersScope();
        var points = [];
        var projection = attrs.projection ? attrs.projection : "EPSG:4326";

        var riverLayer;
        var riverLines = [];
        var createVectorLayer = olHelpers.createVectorLayer;
        var createStyle = olHelpers.createStyle;

        olScope.getMap().then(function (map) {
          scope.$on('$destroy', function () {
            ol.Observable.unByKey(listenerRiver);
            riverLayer.setMap(null);
            riverLayer = null;
            riverLine = null;
          });
          var mapDefaults = olMapDefaults.getDefaults(olScope);
          var viewProjection = mapDefaults.view.projection;
          var clickStyle = new ol.style.Style({
            stroke: new ol.style.Stroke({
              color: '#FF0000',
              width: 11
            })
          })

          riverLayer = createVectorLayer();
          riverLayer.set('name', 'river');
          riverLayer.setStyle(new ol.style.Style({
            stroke: new ol.style.Stroke({
              color: '#21C2F7',
              width: 10
            })
          }))
          //                    trackLayer.setMaxResolution(69.44444444444444);
          riverLayer.setMap(map)

          var ps = $rootScope.account.reachAll;

          angular.forEach(ps, function (value, i) {
            if (value.linePoints && typeof (value.linePoints) == "string") {
              var v = value.linePoints;
              var points = [];
              var pt = v.split(";");
              var ptl = pt.length;
              for (var i = 0; i < ptl; i++) {
                var po = pt[i].split(",");
                var lon=parseFloat(po[0]);
                var lat=parseFloat(po[1]);
                if(!isNaN(lat)&&!isNaN(lon))
                  points.push(ol.proj.transform([lon,lat], projection, viewProjection));
              }

              riverLines.push(new ol.Feature({
                geometry: new ol.geom.LineString(points),
                name: value.reach_Id
              }))
            }
          })
          riverLines[0].setStyle(clickStyle);
          riverLayer.getSource().addFeatures(riverLines);

          scope.$on('changeRiver', function (ev, id) {
            angular.forEach(riverLines, function (v) {
              if (id === v.get('name')) {
                v.setStyle(clickStyle)
              } else {
                v.setStyle(null);
              }
            })
          })

          var listenerRiver = map.on('click', function (evt) {
            var clickR = map.forEachFeatureAtPixel(evt.pixel, function (f) {
              return f;
            }, {
              layerFilter: function (lay) {
                return lay.get('name') === 'river';
              }
            })
            if (clickR) {
              angular.forEach(riverLines, function (v) {
                v.setStyle(null);
              })
              clickR.setStyle(clickStyle)
              var rId = clickR.get('name');
              angular.forEach(ps, function (v, i) {
                if (v.reach_Id === rId) {
                  $rootScope.account.reachNow = ps[i];
                }
              })
            } else {

            }
          })

        });
      }
    }
  }]);


  /*
   <ol-static-track points="hisTrack.points" track-style="hisTrack.style"></ol-static-track>
   controller:
   $scope.hisTrack = {
   points: [{lon:, lat:}],
   style: {
   startStyle: 'styleConfig.startPoint',
   endStyle: 'styleConfig.endPoint',
   carStyle: {
   image: {
   icon: {
   opacity: 1,
   src: 'img/car.png',
   rotation: 0,
   scale: 0.5,
   anchor: [0.5, 1]
   }
   },
   zIndex: 1
   },
   lineStyle: 'styleConfig.line',
   //trackLineStyle:'styleConfig.trackLine'//非必要
   }
   }

   */
  angular.module('openlayers-directive').directive('olStaticTrack', ["$log", "$q", "olMapDefaults", "$interval", "olHelpers", '$compile', function ($log, $q, olMapDefaults, $interval, olHelpers, $compile) {
    return {
      restrict: 'E',
      require: '^openlayers',
      scope: {
        points: '=points',
        trackStyle: '=trackStyle',
        curIndex: '='
      },
      link: function (scope, element, attrs, controller) {
        var trackLayer, trackLabel;
        var createVectorLayer = olHelpers.createVectorLayer;
        var olScope = controller.getOpenlayersScope();
        var isCenter = attrs.isCenter;
        var projection = attrs.projection ? attrs.projection : "EPSG:4326";
        var createStyle = olHelpers.createStyle;

        var mapDefaults = olMapDefaults.getDefaults(olScope);
        var viewProjection = mapDefaults.view.projection;
        var isDefined = olHelpers.isDefined;
        var getGreatCircleDistance = olHelpers.getGreatCircleDistance;

        var startPointStyle = createStyle(scope.trackStyle.startStyle);
        var endPointStyle = createStyle(scope.trackStyle.endStyle);
        var carStyleObj = scope.trackStyle.carStyle;
        var carStyle = createStyle(carStyleObj);


        olScope.getMap().then(function (map) {
          scope.$on('$destroy', function () {
            trackLayer.setMap(null);
            trackLayer = null;
            watchP();
            watchC();
//                        map.removeOverlay(trackLabel);
//                        trackLabel = null;
          });

          trackLayer = createVectorLayer();
          trackLayer.set('name', 'track');
          //                    trackLayer.setMaxResolution(69.44444444444444);
          trackLayer.setMap(map)
          var car; //存放carfeature
          var trackLine = new ol.Feature();
          var line = new ol.Feature();

          trackLine.setStyle(createStyle(scope.trackStyle.trackLineStyle));
          line.setStyle(createStyle(scope.trackStyle.lineStyle));

          function drawLine(points) {
            if (points instanceof Array && points.length > 0) {
              var ps = [];
              for (var i = 0; i < points.length; i++) {
                ps.push(ol.proj.transform([points[i].lon, points[i].lat], projection, viewProjection));
              }
              var g = new ol.geom.LineString(ps);
              line.setGeometry(g);
              trackLayer.getSource().addFeature(line);
              map.getView().fit(g, {padding: [20, 20, 20, 20]});
            }
          }

          function drawTrackLine(points) {
            if (points instanceof Array && points.length > 0) {
              var ps = [];
              for (var i = 0; i < points.length; i++) {
                ps.push(ol.proj.transform([points[i].lon, points[i].lat], projection, viewProjection));
              }
              trackLine.setGeometry(new ol.geom.LineString(ps));
              trackLayer.getSource().addFeature(trackLine);
            }
          }

          function loadPoints(points) {
            if (points instanceof Array && points.length > 0) {
              //设置起点终点的feature
              var startPoint = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.transform([points[0].lon, points[0].lat], projection, viewProjection))
              })
              startPoint.setStyle(startPointStyle)
              trackLayer.getSource().addFeature(startPoint);

              var endPoint = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.transform([points[points.length - 1].lon, points[points.length - 1].lat], projection, viewProjection))
              })
              endPoint.setStyle(endPointStyle);
              trackLayer.getSource().addFeature(endPoint);

              // car = new ol.Feature({
              //   geometry: new ol.geom.Point(ol.proj.transform([points[0].lon, points[0].lat], projection, viewProjection))
              // })
              // car.setStyle(carStyle)
              // trackLayer.getSource().addFeature(car)

            }
          }


          var watchC = scope.$watch("curIndex", function (nval, oval) {
            if (!nval || nval < 0) {
              return;
            }
            //绘制trackLine
            drawTrackLine(scope.points.slice(0, nval));

            // scope.carTrack.trackLine=(nval>0)?scope.carTrack.route.coords.slice(0,nval):[];

            //绘制car n = new ol.geom.Point; f.setGeometry(n)
            var CarGeo = new ol.geom.Point(ol.proj.transform([scope.points[nval].lon, scope.points[nval].lat], projection, viewProjection))
            car.setGeometry(CarGeo);
            if (scope.points[nval].direction) {
              carStyle.getImage().setRotation(Math.PI * (scope.points[nval].direction / 360) * 2);
              car.setStyle(carStyle) //如果有旋转
            }

            var requestedPosition;
            requestedPosition = ol.proj.transform([parseFloat(scope.points[nval].lon), parseFloat(scope.points[nval].lat)], projection, viewProjection);

            var view = map.getView();
            if (isCenter) { //是否让车辆一直位于地图的中心
              view.setCenter(requestedPosition);
            } else { //若车辆跑到了可视范围之外，移动地图居中
              var size = map.getSize();
              var extent = view.calculateExtent(size);
              if (!ol.extent.containsCoordinate(extent, requestedPosition)) {
                view.setCenter(requestedPosition);
//                                view.setZoom(15)
              }
            }

          })


          var watchP = scope.$watch("points", function (nval, oval) {

            if (!nval) {
              return
            }
            if (nval) {
              trackLayer.getSource().clear(true);
              loadPoints(nval);
              drawLine(nval)
            }

          })
        })
      }
    }
  }]);
    /*
      * xiarx 20161230
      * olmarker指令代码整理
     {
         id: marker.ID,
         lat: marker.LATITUDE,
         lon: marker.LONGITUDE,
         overLabel: {    //悬浮显示的信息
             message: '<div style="white-space:nowrap;">'+marker.NAME+'</div>',
             classNm: "markerOver",
             placement: "right"
         },
         clickLabel: {    //点击显示的信息
             id: marker.ID,
             title: marker.NAME,
             url: device.popUrl,
             classNm: classNm,
             placement: "top",
             keepOneOverlayVisible: true      //是否只显示一个弹出框
         },
         label: {         //直接显示的信息
             message: '',
             show: false
         },
         style: {
              image: {
                  icon: {
                      anchor: [0.5, 1],
                      color: sColorChange,
                      opacity: 0.7,
                      src: 'images/locate.png'
                  }
              }
         }
     }
      */
  angular.module('openlayers-directive').directive('olMarker', ["$log", "$q", "olMapDefaults", "olHelpers", function ($log, $q, olMapDefaults, olHelpers) {

      var getMarkerDefaults = function () {
          return {
              id: "",
              projection: 'EPSG:4326',
              lat: 0,
              lon: 0,
              coord: [],
              show: true,
              showOnMouseOver: false,
              showOnMouseClick: false,
              keepOneOverlayVisible: true,
              ngClick: false,
              clickLabel: {},
              overLabel: {},
              info: {}
          };
      };

      var markerLayerManager = (function () {
          var mapDict = [];

          function getMapIndex(map) {
              return mapDict.map(function (record) {
                  return record.map;
              }).indexOf(map);
          }

          return {
              getInst: function getMarkerLayerInst(scope, map) {
                  var mapIndex = getMapIndex(map);

                  if (mapIndex === -1) {
                      var markerLayer = olHelpers.createVectorLayer();
                      markerLayer.set('markers', true);
                      map.addLayer(markerLayer);
                      mapDict.push({
                          map: map,
                          markerLayer: markerLayer,
                          instScopes: []
                      });
                      mapIndex = mapDict.length - 1;
                  }

                  mapDict[mapIndex].instScopes.push(scope);

                  return mapDict[mapIndex].markerLayer;
              },
              deregisterScope: function deregisterScope(scope, map) {
                  var mapIndex = getMapIndex(map);
                  if (mapIndex === -1) {
                      throw Error('This map has no markers');
                  }

                  var scopes = mapDict[mapIndex].instScopes;
                  var scopeIndex = scopes.indexOf(scope);
                  if (scopeIndex === -1) {
                      throw Error('Scope wan\'t registered');
                  }

                  scopes.splice(scopeIndex, 1);

                  if (!scopes.length) {
                      map.removeLayer(mapDict[mapIndex].markerLayer);
                      delete mapDict[mapIndex].markerLayer;
                      delete mapDict[mapIndex];
                  }
              }
          };
      })();
      return {
          restrict: 'E',
          scope: {
              lat: '=lat',
              lon: '=lon',
              properties: '=olMarkerProperties',
              style: '=olStyle'
          },
          transclude: true,
          require: '^openlayers',
          replace: true,
          template: '<div class="popup-label marker">' +
          '<div ng-bind-html="message"></div>' +
          '<ng-transclude></ng-transclude>' +
          '</div>',

          link: function (scope, element, attrs, controller) {
              var isDefined = olHelpers.isDefined;
              var olScope = controller.getOpenlayersScope();
              var createFeature = olHelpers.createFeature;
              var createOverlay = olHelpers.createOverlay;
              var createStyle = olHelpers.createStyle;

              var hasTranscluded = element.find('ng-transclude').children().length > 0;

              olScope.getMap().then(function (map) {
                  var markerLayer = markerLayerManager.getInst(scope, map);
                  markerLayer.setZIndex(2);
                  var data = getMarkerDefaults();

                  var mapDefaults = olMapDefaults.getDefaults(olScope);
                  // var viewProjection = mapDefaults.view.projection;
                  var viewProjection = map.getView().getProjection().getCode();
                  var label;
                  var pos;
                  var marker;

                  scope.$on('$destroy', function () {
                      markerLayer.getSource().removeFeature(marker);
                      angular.forEach(map.getOverlays(), function (value) {
                          if (scope.properties.clickLabel && value.getId() == scope.properties.clickLabel.id) {
                              map.removeOverlay(value);
                          }
                      });
                      markerLayerManager.deregisterScope(scope, map);
                  });

                  //////一般不用这种方法定义marker，可以考虑移除///////////
                  if (!isDefined(scope.properties)) {
                      data.lat = scope.lat ? scope.lat : data.lat;
                      data.lon = scope.lon ? scope.lon : data.lon;
                      data.message = attrs.message;
                      data.label = {
                          title: attrs.title ? attrs.title : "",
                          message: attrs.message ? attrs.message : "",
                          classNm: attrs.classNm ? attrs.classNm : "",
                          placement: attrs.placement ? attrs.placement : "top"
                      };
                      data.style = scope.style ? scope.style : mapDefaults.styles.marker;

                      if (attrs.hasOwnProperty('ngClick')) {
                          data.ngClick = true;
                      }

                      marker = createFeature(data, viewProjection);
                      if (!isDefined(marker)) {
                          $log.error('[AngularJS - Openlayers] Received invalid data on ' +
                              'the marker.');
                      }
                      // Add a link between the feature and the marker properties
                      marker.set('featureInfo', {
                          type: 'marker',
                          data: data
                      });
                      markerLayer.getSource().addFeature(marker);

                      if (data.message || hasTranscluded) {
                          scope.message = attrs.message;
                          pos = ol.proj.transform([data.lon, data.lat], data.projection,
                              viewProjection);
                          label = createOverlay(element, pos);
                          map.addOverlay(label);
                      }
                      return;
                  }
                  ////////////////////////////////////////////////////////////////////////////

                  scope.$watch('properties', function (properties) {
                      properties.lon = parseFloat(properties.lon);
                      properties.lat = parseFloat(properties.lat);

                      if (!isDefined(marker)) {
                          //生成新的marker
                          data.id = properties.id ? properties.id : data.id;
                          data.projection = properties.projection ? properties.projection :
                              data.projection;
                          data.coord = properties.coord ? properties.coord : data.coord;
                          data.lat = properties.lat ? properties.lat : data.lat;
                          data.lon = properties.lon ? properties.lon : data.lon;
                          data.info = properties.info ? properties.info : data.info;

                          //鼠标悬浮事件 标签
                          if (isDefined(properties.overLabel)) {
                              var overLabel = properties.overLabel;
                              if (overLabel.url) { //单独的文件
                                  $.get(properties.overLabel.url, function (response) {
                                      data.overLabel = {
                                          title: overLabel.title ? overLabel.title : "",
                                          message: response,
                                          classNm: overLabel.classNm ? overLabel.classNm : "markerOver",
                                          placement: overLabel.placement ? overLabel.placement : "top"
                                      }
                                  });
                              } else if (overLabel.message) {
                                  data.overLabel = {
                                      title: overLabel.title ? overLabel.title : "",
                                      message: overLabel.message ? overLabel.message : "",
                                      classNm: overLabel.classNm ? overLabel.classNm : "",
                                      placement: overLabel.placement ? overLabel.placement : "top"
                                  }
                              }
                          }

                          //鼠标点击事件 标签
                          if (isDefined(properties.clickLabel)) {
                              var clickLabel = properties.clickLabel;
                              data.clickLabel = {
                                  id: clickLabel.id ? clickLabel.id : "",
                                  title: clickLabel.title ? clickLabel.title : "",
                                  message: clickLabel.message ? clickLabel.message : "",
                                  url: clickLabel.url ? clickLabel.url : "",
                                  classNm: clickLabel.classNm ? clickLabel.classNm : "",
                                  placement: clickLabel.placement ? clickLabel.placement : "top"
                              }
                              data.keepOneOverlayVisible = isDefined(clickLabel.keepOneOverlayVisible) ? clickLabel.keepOneOverlayVisible : data.keepOneOverlayVisible;
                          }

                          //直接在元素上定义ng-click方法
                          if (attrs.hasOwnProperty('ngClick')) {
                              data.ngClick = element;
                          }

                          if (isDefined(properties.style)) {
                              data.style = properties.style;
                          } else {
                              data.style = mapDefaults.styles.marker;
                          }

                          marker = createFeature(data, viewProjection);
                          if (!isDefined(marker)) {
                              $log.error('[AngularJS - Openlayers] Received invalid data on ' +
                                  'the marker.');
                          }

                          // Add a link between the feature and the marker properties
                          marker.set('featureInfo', {
                              type: 'marker',
                              data: data
                          });

                          markerLayer.getSource().addFeature(marker);

                          //适应屏幕
                          /*var extent = markerLayer.getSource().getExtent();
                          map.getView().fit(extent, {
                              size: map.getSize(),
                              padding: [15, 15, 15, 15],
                              duration: 150
                          });*/
                      } else { //改变已存在的marker的属性
                          var requestedPosition;
                          if (properties.projection === 'pixel') {
                              requestedPosition = properties.coord;
                          } else {
                              requestedPosition = ol.proj.transform([properties.lon, properties.lat], data.projection,
                                  map.getView().getProjection());
                          }

                          if (!angular.equals(marker.getGeometry().getCoordinates(), requestedPosition)) {
                              var geometry = new ol.geom.Point(requestedPosition);
                              marker.setGeometry(geometry);
                          }
                          if (isDefined(properties.style)) {
                              var requestedStyle = createStyle(properties.style);
                              if (!angular.equals(marker.getStyle(), requestedStyle)) {
                                  marker.setStyle(requestedStyle);
                              }
                          }

                          //显示着的overlay随着marker的移动而移动
                          if (marker.get("overLay") && marker.get("overLay").getMap()) {
                              marker.get("overLay").setPosition(requestedPosition);
                          }

                          //更新存储的属性
                          data.coord = properties.coord ? properties.coord : data.coord;
                          data.lat = properties.lat ? properties.lat : data.lat;
                          data.lon = properties.lon ? properties.lon : data.lon;
                          data.info = properties.info ? properties.info : data.info;

                          if (isDefined(properties.style)) {
                              data.style = properties.style;
                          }
                      }

                      if (isDefined(label)) {
                          map.removeOverlay(label);
                      }

                      if (!isDefined(properties.label)) {
                          return;
                      }
                      if (isDefined(properties.label)) {
                          var labelShow = properties.label;
                          if (labelShow.url) { //单独的文件
                              $.get(labelShow.url, function (response) {
                                  scope.$apply(function () {
                                      scope.message = response;
                                  });
                              });
                          } else if (labelShow.message) {
                              scope.message = labelShow.message;
                          }
                      }

                      if (properties.label && properties.label.show === true) {
                          if (data.projection === 'pixel') {
                              pos = data.coord;
                          } else {
                              pos = ol.proj.transform([properties.lon, properties.lat], data.projection,
                                  viewProjection);
                          }
                          label = createOverlay(element, pos);
                          map.addOverlay(label);
                      }

                      if (label && properties.label && properties.label.show === false) {
                          map.removeOverlay(label);
                          label = undefined;
                      }

                      //监控点击事件生成的overlay的移除
                      if (properties.clickLabel && properties.clickLabel.remove == true) {
                          angular.forEach(map.getOverlays(), function (value) {
                              if (value.getId() == properties.clickLabel.id) {
                                  map.removeOverlay(value);
                                  delete scope.properties.clickLabel.remove;
                              }
                          });
                      }
                  }, true);
              });
          }
      };
  }]);
  angular.module('openlayers-directive').directive('olView', ["$log", "$q", "olData", "olMapDefaults", "olHelpers", function ($log, $q, olData, olMapDefaults, olHelpers) {
    return {
      restrict: 'A',
      scope: false,
      replace: false,
      require: 'openlayers',
      link: function (scope, element, attrs, controller) {
        var olScope = controller.getOpenlayersScope();
        var isNumber = olHelpers.isNumber;
        var safeApply = olHelpers.safeApply;
        var createView = olHelpers.createView;

        olScope.getMap().then(function (map) {
          var defaults = olMapDefaults.getDefaults(olScope);
          var view = olScope.view;

          if (!view.projection) {
            view.projection = defaults.view.projection;
          }

          if (!view.maxZoom) {
            view.maxZoom = defaults.view.maxZoom;
          }

          if (!view.minZoom) {
            view.minZoom = defaults.view.minZoom;
          }

          if (!view.rotation) {
            view.rotation = defaults.view.rotation;
          }

          var mapView = createView(view);
          map.setView(mapView);

          olScope.$watchCollection('view', function (view) {
            if (isNumber(view.rotation)) {
              mapView.setRotation(view.rotation);
            }
          });

          var rotationEventKey = mapView.on('change:rotation', function () {
            safeApply(olScope, function (scope) {
              scope.view.rotation = map.getView().getRotation();
            });
          });

          olScope.$on('$destroy', function () {
            ol.Observable.unByKey(rotationEventKey);
          });

        });
      }
    };
  }]);
  angular.module('openlayers-directive').service('olData', ["$log", "$q", function ($log, $q) {

    var maps = {};

    var setResolvedDefer = function (d, mapId) {
      var id = obtainEffectiveMapId(d, mapId);
      d[id].resolvedDefer = true;
    };

    var getUnresolvedDefer = function (d, mapId) {
      var id = obtainEffectiveMapId(d, mapId);
      var defer;

      if (!angular.isDefined(d[id]) || d[id].resolvedDefer === true) {
        defer = $q.defer();
        d[id] = {
          defer: defer,
          resolvedDefer: false
        };
      } else {
        defer = d[id].defer;
      }
      return defer;
    };

    var getDefer = function (d, mapId) {
      var id = obtainEffectiveMapId(d, mapId);
      var defer;

      if (!angular.isDefined(d[id]) || d[id].resolvedDefer === false) {
        defer = getUnresolvedDefer(d, mapId);
      } else {
        defer = d[id].defer;
      }
      return defer;
    };

    this.setMap = function (olMap, scopeId) {
      var defer = getUnresolvedDefer(maps, scopeId);
      defer.resolve(olMap);
      setResolvedDefer(maps, scopeId);
    };

    this.getMap = function (scopeId) {
      var defer = getDefer(maps, scopeId);
      return defer.promise;
    };

    function obtainEffectiveMapId(d, mapId) {
      var id;
      var i;
      if (!angular.isDefined(mapId)) {
        if (Object.keys(d).length === 1) {
          for (i in d) {
            if (d.hasOwnProperty(i)) {
              id = i;
            }
          }
        } else if (Object.keys(d).length === 0) {
          id = 'main';
        } else {
          $log.error('[AngularJS - Openlayers] - You have more than 1 map on the DOM, ' +
            'you must provide the map ID to the olData.getXXX call');
        }
      } else {
        id = mapId;
      }
      return id;
    }

    this.resetMap = function (scopeId) {
      if (angular.isDefined(maps[scopeId])) {
        delete maps[scopeId];
      }
    };

  }]);
  angular.module('openlayers-directive').provider('olStyle', function () {
    var styleOptions = {};
    this.setStyleOptions = function (args) {
      if (args) {
        styleOptions = args;
      }
    };
    this.$get = function () {
      return styleOptions;
    };
  });
  angular.module('openlayers-directive').factory('olHelpers', ["$q", "$log", "$http", "$compile", "olStyle", function ($q, $log, $http, $compile, olStyle) {

    var isDefined = function (value) {
      return angular.isDefined(value);
    };

    var isDefinedAndNotNull = function (value) {
      return angular.isDefined(value) && value !== null;
    };

    /*16进制颜色转为RGB格式*/
    var colorRgb = function (sColor) {

      //十六进制颜色值的正则表达式
      var reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;
      var sColor = sColor.toLowerCase();
      if (sColor && reg.test(sColor)) {
        if (sColor.length === 4) {
          var sColorNew = "#";
          for (var i = 1; i < 4; i += 1) {
            sColorNew += sColor.slice(i, i + 1).concat(sColor.slice(i, i + 1));
          }
          sColor = sColorNew;
        }

        //处理六位的颜色值
        var sColorChange = [];
        for (var i = 1; i < 7; i += 2) {
          sColorChange.push(parseInt("0x" + sColor.slice(i, i + 2)));
        }
        return sColorChange.join(",");
      } else if (sColor && sColor.indexOf("rgb") != -1) {
        var temp = sColor.split("(")[1];
        temp = temp.slice(0, temp.length - 1);
        sColor = temp;
        return sColor;
      } else {
        return null;
      }
    };

    var setEvent = function (map, eventType, scope) {
      map.on(eventType, function (event) {
        var coord = event.coordinate;
        var proj = map.getView().getProjection().getCode();
        if (proj === 'pixel') {
          coord = coord.map(function (v) {
            return parseInt(v, 10);
          });
        }

        /*xiarx 20161108*/
        var feature = "";
        if (eventType == "singleclick") {
          var feature = map.forEachFeatureAtPixel(event.pixel, function (feature) {
            return feature;
          });
        }

        feature = feature ? feature : "";

        scope.$emit('openlayers.map.' + eventType, {
          'coord': coord,
          'projection': proj,
          'event': event,
          "feature": feature
        });
      });

    };

    /*
     * xiarx 20161124
     * 生成弹框
     */
    var createOverlay = function (element, pos, id, positioning) {
      element.css('display', 'block');
      var ov = new ol.Overlay({
        id: id,
        position: pos,
        element: element[0],
        positioning: 'center-left',
        insertFirst: false
      });

      return ov;
    };

    /*
     * xiarx 20170223
     * 移除弹框
     */
    var removeOverlay = function (map, id, property) {
      var layArr = map.getOverlays();
      var len = layArr.getLength();
      if (!id && !property) { //移除所有
        layArr.clear();
      } else if (id) {
        for (var i = len - 1; i >= 0; i--) {
          if (layArr.item(i).getId() == id) {
            layArr.removeAt(i);
          }
        }
      } else {
        for (var i = len - 1; i >= 0; i--) {
          if (layArr.item(i).get(property)) {
            layArr.removeAt(i);
          }
        }
      }
    };

    //计算两个经纬度坐标之间的距离
    var EARTH_RADIUS = 6378137.0; //单位M
    var PI = Math.PI;

    function getRad(d) {
      return d * PI / 180.0;
    }

    /**
     * caculate the great circle distance
     * @param {Object} lat1
     * @param {Object} lng1
     * @param {Object} lat2
     * @param {Object} lng2
     */

    function getGreatCircleDistance(projection, point1, point2) {
      var point1 = ol.proj.transform(point1, projection, 'EPSG:4326'),
        point2 = ol.proj.transform(point2, projection, 'EPSG:4326');
      var lat1 = point1[0],
        lng1 = point1[1],
        lat2 = point2[0],
        lng2 = point2[1];
      var radLat1 = getRad(lat1);
      var radLat2 = getRad(lat2);

      var a = radLat1 - radLat2;
      var b = getRad(lng1) - getRad(lng2);

      var s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)));
      s = s * EARTH_RADIUS;
      s = Math.round(s * 10000) / 10000.0;

      return s;
    }

    function getGeodesicDistance(projection, point1, point2) {
      var point1 = ol.proj.transform(point1, projection, 'EPSG:4326'),
        point2 = ol.proj.transform(point2, projection, 'EPSG:4326');
      var wgs84Sphere = new ol.Sphere(6378137); //定义一个球对象
      var s = wgs84Sphere.haversineDistance(point1, point2);

      return s;
    }

    /*
     * xiarx 20161124
     * marker事件绑定
     * data = {
     projection: "EPSG:4326",
     lat: 0,
     lon: 0,
     label:{
     classNm: "",
     title: "",
     placement: "top",
     message: "",
     id: ""
     }
     }
     */
    var setClickMarker = function (feature, map, data, scope) {
      if (data.keepOneOverlayVisible) { //点击时，只保留一个显示，移除以前所有overlay
        removeOverlay(map, null, "clickLabel");
      }

      var tempData = angular.copy(data);
      tempData.label = angular.copy(data.clickLabel);
      scope.selectedLayid = tempData.label.id; //传值
      if (tempData.label.url) {
        $.get(tempData.label.url, function (response) {
          tempData.label.message = response;
          var label = setMarkerEvent(feature, map, tempData, scope);
          label.set("clickLabel", "true"); //与其他的弹出框区分
        });
      } else {
        var label = setMarkerEvent(feature, map, tempData, scope);
        label.set("clickLabel", "true"); //与其他的弹出框区分
      }
    }
    var setOverMarker = function (feature, map, data, scope) {
      //悬浮时，先移除其它的弹出框
      removeOverlay(map, null, "overLabel");

      var tempData = angular.copy(data);
      tempData.label = angular.copy(data.overLabel);
      tempData.label.classNm = "featureOver " + tempData.label.classNm;
      if (tempData.label.url) {
        $.get(tempData.label.url, function (response) {
          tempData.label.message = response;

          var label = setMarkerEvent(feature, map, tempData, scope);
          label.set("overLabel", "true"); //与其他的弹出框区分
        });
      } else {
        var label = setMarkerEvent(feature, map, tempData, scope);
        label.set("overLabel", "true"); //与其他的弹出框区分
      }
    }
    var setMarkerEvent = function (feature, map, data, scope) {
      var viewProjection = map.getView().getProjection().getCode();
      var pos;
      if (data.coord && data.coord.length == 2) {
        pos = ol.proj.transform(data.coord, data.projection, viewProjection);
      } else {
        pos = ol.proj.transform([data.lon, data.lat], data.projection, viewProjection);
      }

      //如果没有内容，就不产生弹出框
      if (!(data.label && data.label.message)) {
        return;
      }

      var divHtml = "<div class='ol-popover " + data.label.placement + "' style='display:block;background-color: white;'>";
      if (!data.label.placement || data.label.placement == "top") {
        divHtml += "<div class='arrow' style='left:50%;'></div>";
      } else {
        divHtml += "<div class='arrow'></div>";
      }
      if (data.label.title) {
        divHtml += "<h3 class='popover-title'>" + data.label.title + "</h3>";
      }
      divHtml += "<div class='popover-content'>" + data.label.message + "</div>";

      var layEle = $('<div class="' + data.label.classNm + '"></div>');

      var ele = $compile(divHtml)(scope);
      scope.$apply();
      angular.element(layEle).html(ele);

      var label = createOverlay(layEle, pos, data.label.id);

      map.addOverlay(label);

      //关联起feature和overLay?
      /*   if (feature) {
       feature.set("overLay", label);
       }*/

      return label;
    };

    var bingImagerySets = [
      'Road',
      'Aerial',
      'AerialWithLabels',
      'collinsBart',
      'ordnanceSurvey'
    ];

    var getControlClasses = function () {
      return {
        attribution: ol.control.Attribution,
        fullscreen: ol.control.FullScreen,
        mouseposition: ol.control.MousePosition,
        overviewmap: ol.control.OverviewMap,
        rotate: ol.control.Rotate,
        scaleline: ol.control.ScaleLine,
        zoom: ol.control.Zoom,
        zoomslider: ol.control.ZoomSlider,
        zoomtoextent: ol.control.ZoomToExtent
      };
    };

    /* author xiarx 20161019
     * interaction
     */
    var getInteractionClasses = function () {
      return {
        dragZoom: ol.interaction.DragZoom,
        draw: ol.interaction.Draw,
        select: ol.interaction.Select,
        modify: ol.interaction.Modify
      };
    };

    var mapQuestLayers = ['osm', 'sat', 'hyb'];

    var esriBaseLayers = ['World_Imagery', 'World_Street_Map', 'World_Topo_Map',
      'World_Physical_Map', 'World_Terrain_Base',
      'Ocean_Basemap', 'NatGeo_World_Map'];

    var styleMap = {
      'style': ol.style.Style,
      'fill': ol.style.Fill,
      'stroke': ol.style.Stroke,
      'circle': ol.style.Circle,
      'icon': ol.style.Icon,
      'image': ol.style.Image,
      'regularshape': ol.style.RegularShape,
      'text': ol.style.Text
    };

    var optionalFactory = function (style, Constructor) {
      if (Constructor && style instanceof Constructor) {
        return style;
      } else if (Constructor) {
        return new Constructor(style);
      } else {
        return style;
      }
    };

    //Parse the style tree calling the appropriate constructors.
    //The keys in styleMap can be used and the OpenLayers constructors can be
    //used directly.
    var createStyle = function recursiveStyle(data, styleName) {
      var style;
      if (typeof data == "string") {
        if (data.split(".")[0] === 'styleConfig') {
          return (data.split(".")[1] && styleConfig[data.split(".")[1]]) ? styleConfig[data.split(".")[1]] : style;
        }
      }
      if (!styleName) {
        styleName = 'style';
        style = data;
      } else {
        style = data[styleName];
      }
      //Instead of defining one style for the layer, we've been given a style function
      //to apply to each feature.
      if (styleName === 'style' && data instanceof Function) {
        return data;
      }

      if (!(style instanceof Object)) {
        return style;
      }

      var styleObject;
      if (Object.prototype.toString.call(style) === '[object Object]') {
        styleObject = {};
        var styleConstructor = styleMap[styleName];
        if (styleConstructor && style instanceof styleConstructor) {
          return style;
        }
        Object.getOwnPropertyNames(style).forEach(function (val, idx, array) {
          //Consider the case
          //image: {
          //  circle: {
          //     fill: {
          //       color: 'red'
          //     }
          //   }
          //
          //An ol.style.Circle is an instance of ol.style.Image, so we do not want to construct
          //an Image and then construct a Circle.  We assume that if we have an instanceof
          //relationship, that the JSON parent has exactly one child.
          //We check to see if an inheritance relationship exists.
          //If it does, then for the parent we create an instance of the child.
          var valConstructor = styleMap[val];
          if (styleConstructor && valConstructor &&
            valConstructor.prototype instanceof styleMap[styleName]) {
            console.assert(array.length === 1, 'Extra parameters for ' + styleName);
            styleObject = recursiveStyle(style, val);
            return optionalFactory(styleObject, valConstructor);
          } else {
            styleObject[val] = recursiveStyle(style, val);

            // if the value is 'text' and it contains a String, then it should be interpreted
            // as such, 'cause the text style might effectively contain a text to display
            if (val !== 'text' && typeof styleObject[val] !== 'string') {
              styleObject[val] = optionalFactory(styleObject[val], styleMap[val]);
            }
          }
        });
      } else {
        styleObject = style;
      }
      return optionalFactory(styleObject, styleMap[styleName]);
    };

    //预先设置style样式组
    var styleOptions = olStyle;
    var styleConfig = {};
    angular.forEach(styleOptions, function (styleOption, key) {
      styleConfig[key] = createStyle(styleOption);
    });

    var detectLayerType = function (layer) {
      if (layer.type) {
        return layer.type;
      } else {
        switch (layer.source.type) {
          case 'ImageWMS':
            return 'Image';
          case 'ImageStatic':
          case 'ImageArcGISRest':
            return 'Image';
          case 'GeoJSON':
          case 'JSONP':
          case 'TopoJSON':
          case 'KML':
          case 'KMLBbox':
          case 'WKT':
          case 'EsriJson':
            return 'Vector';
          case 'TileVector':
            return 'TileVector';
          default:
            return 'Tile';
        }
      }
    };

    var createProjection = function (view) {
      var oProjection;

      switch (view.projection) {
        case 'pixel':
          if (!isDefined(view.extent)) {
            $log.error('[AngularJS - Openlayers] - You must provide the extent of the image ' +
              'if using pixel projection');
            return;
          }
          oProjection = new ol.proj.Projection({
            code: 'pixel',
            units: 'pixels',
            extent: view.extent
          });
          break;
        default:
          oProjection = new ol.proj.get(view.projection);
          break;
      }

      return oProjection;
    };

    var isValidStamenLayer = function (layer) {
      return ['watercolor', 'terrain', 'toner'].indexOf(layer) !== -1;
    };

    var createSource = function (source, projection) {
      var oSource;
      var url;
      var geojsonFormat = new ol.format.GeoJSON(); // used in various switch stmnts below

      switch (source.type) {
        case 'MapBox':
          if (!source.mapId || !source.accessToken) {
            $log.error('[AngularJS - Openlayers] - MapBox layer requires the map id and the access token');
            return;
          }
          url = 'http://api.tiles.mapbox.com/v4/' + source.mapId + '/{z}/{x}/{y}.png?access_token=' +
            source.accessToken;

          var pixelRatio = window.devicePixelRatio;
          if (pixelRatio > 1) {
            url = url.replace('.png', '@2x.png');
          }

          oSource = new ol.source.XYZ({
            url: url,
            tileLoadFunction: source.tileLoadFunction,
            attributions: createAttribution(source),
            tilePixelRatio: pixelRatio > 1 ? 2 : 1
          });
          break;
        case 'MapBoxStudio':
          if (!source.mapId || !source.accessToken || !source.userId) {
            $log.error('[AngularJS - Openlayers] - MapBox Studio layer requires the map id' +
              ', user id  and the access token');
            return;
          }
          url = 'https://api.mapbox.com/styles/v1/' + source.userId +
            '/' + source.mapId + '/tiles/{z}/{x}/{y}?access_token=' +
            source.accessToken;

          oSource = new ol.source.XYZ({
            url: url,
            tileLoadFunction: source.tileLoadFunction,
            attributions: createAttribution(source),
            tileSize: source.tileSize || [512, 512]
          });
          break;
        case 'ImageWMS':
          if (!source.url || !source.params) {
            $log.error('[AngularJS - Openlayers] - ImageWMS Layer needs ' +
              'valid server url and params properties');
          }
          oSource = new ol.source.ImageWMS({
            url: source.url,
            imageLoadFunction: source.imageLoadFunction,
            attributions: createAttribution(source),
            crossOrigin: (typeof source.crossOrigin === 'undefined') ? 'anonymous' : source.crossOrigin,
            params: deepCopy(source.params),
            ratio: source.ratio
          });
          break;

        case 'TileWMS':
          if ((!source.url && !source.urls) || !source.params) {
            $log.error('[AngularJS - Openlayers] - TileWMS Layer needs ' +
              'valid url (or urls) and params properties');
          }

          var wmsConfiguration = {
            tileLoadFunction: source.tileLoadFunction,
            crossOrigin: (typeof source.crossOrigin === 'undefined') ? 'anonymous' : source.crossOrigin,
            params: deepCopy(source.params),
            attributions: createAttribution(source)
          };

          if (source.serverType) {
            wmsConfiguration.serverType = source.serverType;
          }

          if (source.url) {
            wmsConfiguration.url = source.url;
          }

          if (source.urls) {
            wmsConfiguration.urls = source.urls;
          }

          oSource = new ol.source.TileWMS(wmsConfiguration);
          break;

        case 'WMTS':
          if ((!source.url && !source.urls) || !source.tileGrid) {
            $log.error('[AngularJS - Openlayers] - WMTS Layer needs valid url ' +
              '(or urls) and tileGrid properties');
          }

          var wmtsConfiguration = {
            tileLoadFunction: source.tileLoadFunction,
            projection: projection,
            layer: source.layer,
            attributions: createAttribution(source),
            matrixSet: (source.matrixSet === 'undefined') ? projection : source.matrixSet,
            format: (source.format === 'undefined') ? 'image/jpeg' : source.format,
            requestEncoding: (source.requestEncoding === 'undefined') ?
              'KVP' : source.requestEncoding,
            tileGrid: new ol.tilegrid.WMTS({
              origin: source.tileGrid.origin,
              resolutions: source.tileGrid.resolutions,
              matrixIds: source.tileGrid.matrixIds
            }),
            style: (source.style === 'undefined') ? 'normal' : source.style
          };

          if (isDefined(source.url)) {
            wmtsConfiguration.url = source.url;
          }

          if (isDefined(source.urls)) {
            wmtsConfiguration.urls = source.urls;
          }

          oSource = new ol.source.WMTS(wmtsConfiguration);
          break;

        case 'OSM':
          oSource = new ol.source.OSM({
            tileLoadFunction: source.tileLoadFunction,
            attributions: createAttribution(source)
          });

          if (source.url) {
            oSource.setUrl(source.url);
          }

          break;
        case 'BingMaps':
          if (!source.key) {
            $log.error('[AngularJS - Openlayers] - You need an API key to show the Bing Maps.');
            return;
          }

          var bingConfiguration = {
            key: source.key,
            tileLoadFunction: source.tileLoadFunction,
            attributions: createAttribution(source),
            imagerySet: source.imagerySet ? source.imagerySet : bingImagerySets[0],
            culture: source.culture
          };

          if (source.maxZoom) {
            bingConfiguration.maxZoom = source.maxZoom;
          }

          oSource = new ol.source.BingMaps(bingConfiguration);
          break;

        case 'MapQuest':
          if (!source.layer || mapQuestLayers.indexOf(source.layer) === -1) {
            $log.error('[AngularJS - Openlayers] - MapQuest layers needs a valid \'layer\' property.');
            return;
          }

          oSource = new ol.source.MapQuest({
            attributions: createAttribution(source),
            layer: source.layer
          });

          break;

        case 'EsriBaseMaps':
          if (!source.layer || esriBaseLayers.indexOf(source.layer) === -1) {
            $log.error('[AngularJS - Openlayers] - ESRI layers needs a valid \'layer\' property.');
            return;
          }

          var _urlBase = 'http://services.arcgisonline.com/ArcGIS/rest/services/';
          var _url = _urlBase + source.layer + '/MapServer/tile/{z}/{y}/{x}';

          oSource = new ol.source.XYZ({
            attributions: createAttribution(source),
            tileLoadFunction: source.tileLoadFunction,
            url: _url
          });

          break;

        case 'TileArcGISRest':
          if (!source.url) {
            $log.error('[AngularJS - Openlayers] - TileArcGISRest Layer needs valid url');
          }

          oSource = new ol.source.TileArcGISRest({
            attributions: createAttribution(source),
            tileLoadFunction: source.tileLoadFunction,
            url: source.url
          });

          break;

        case 'GeoJSON':
          if (!(source.geojson || source.url)) {
            $log.error('[AngularJS - Openlayers] - You need a geojson ' +
              'property to add a GeoJSON layer.');
            return;
          }

          if (isDefined(source.url)) {
            oSource = new ol.source.Vector({
              format: new ol.format.GeoJSON(),
              url: source.url
            });
          } else {
            oSource = new ol.source.Vector();

            var projectionToUse = projection;
            var dataProjection; // Projection of geojson data
            if (isDefined(source.geojson.projection)) {
              dataProjection = new ol.proj.get(source.geojson.projection);
            } else {
              dataProjection = projection; // If not defined, features will not be reprojected.
            }

            var features = geojsonFormat.readFeatures(
              source.geojson.object, {
                featureProjection: projectionToUse.getCode(),
                dataProjection: dataProjection.getCode()
              });

            oSource.addFeatures(features);
          }

          break;
        case 'EsriJson':
          if (!source.url) {
            $log.error('[AngularJS - Openlayers] - You need a esrijson ' +
              'property to add a EsriJSON layer.');
            return;
          }
          if (!isDefined(source.url)) {
            oSource = new ol.source.Vector({
              format: new ol.format.EsriJSON(),
              url: source.url,
              style: new ol.style.Style({
                stroke: new ol.style.Stroke({
                  color: '#FF0000',
                  width: 3
                })
              })
            });
          } else {

            var esrijsonFormat = new ol.format.EsriJSON();
            oSource = new ol.source.Vector({
              loader: function (extent, resolution, projection) {
                var url = source.url;
                $.ajax({
                  url: url,
                  dataType: 'json',
                  success: function (response) {
                    if (response.error) {
                      alert(response.error.message + '\n' +
                        response.error.details.join('\n'));
                    } else {
                      // dataProjection will be read from document
                      var features = esrijsonFormat.readFeatures(response, {
                        dataProjection: source.projection ? source.projection : 'EPSG:4326',
                        featureProjection: projection
                      });

                      features.forEach(function (feature) {
                        //feature.set("esriFeature", id);
                        /*if(feature.get("color")){
                         var style = new ol.style.Style({
                         stroke: new ol.style.Stroke({
                         color: feature.get("color"),
                         width: 2
                         })
                         });
                         feature.setStyle(style);
                         }*/
                        //                                                var s = new ol.style.Style({
                        //                                                    fill: new ol.style.Fill({
                        //                                                        color: 'rgba(56, 168, 0, 255)'
                        //                                                    }),
                        //                                                    stroke: new ol.style.Stroke({
                        //                                                        color: 'rgba(110, 110, 110, 255)',
                        //                                                        width: 2
                        //                                                    })
                        //                                                });
                        //                                                feature.setStyle(s);
                        if (source.style == "random") {
                          var styles = {
                            style0: new ol.style.Style({
                              stroke: new ol.style.Stroke({
                                color: '#FF0000',
                                width: 2
                              })
                            }),
                            style1: new ol.style.Style({
                              stroke: new ol.style.Stroke({
                                color: '#FFFF00',
                                width: 2
                              })
                            }),
                            style2: new ol.style.Style({
                              stroke: new ol.style.Stroke({
                                color: '#00FF00',
                                width: 2
                              })
                            }),
                            style3: new ol.style.Style({
                              stroke: new ol.style.Stroke({
                                color: '#FF7D00',
                                width: 2
                              })
                            }),
                            style4: new ol.style.Style({
                              stroke: new ol.style.Stroke({
                                color: 'green',
                                width: 2
                              })
                            })
                          }
                          var random = Math.random();
                          if (random < 0.1)
                            feature.setStyle(styles["style0"]);
                          else if (random < 0.3)
                            feature.setStyle(styles["style1"]);
                          else
                            feature.setStyle(styles["style2"]);
                        }
                      })

                      if (features.length > 0) {
                        oSource.addFeatures(features);
                      }
                    }
                  }
                });
              },
              style: createStyle(source.style)
            });
          }

          break;
        case 'WKT':
          if (!(source.wkt) && !(source.wkt.data)) {
            $log.error('[AngularJS - Openlayers] - You need a WKT ' +
              'property to add a WKT format vector layer.');
            return;
          }

          oSource = new ol.source.Vector();
          var wktFormatter = new ol.format.WKT();
          var wktProjection; // Projection of wkt data
          if (isDefined(source.wkt.projection)) {
            wktProjection = new ol.proj.get(source.wkt.projection);
          } else {
            wktProjection = projection; // If not defined, features will not be reprojected.
          }

          var wktFeatures = wktFormatter.readFeatures(
            source.wkt.data, {
              featureProjection: projection.getCode(),
              dataProjection: wktProjection.getCode()
            });

          oSource.addFeatures(wktFeatures);
          break;

        case 'JSONP':
          if (!(source.url)) {
            $log.error('[AngularJS - Openlayers] - You need an url properly configured to add a JSONP layer.');
            return;
          }

          if (isDefined(source.url)) {
            oSource = new ol.source.ServerVector({
              format: geojsonFormat,
              loader: function (/*extent, resolution, projection*/) {
                var url = source.url +
                  '&outputFormat=text/javascript&format_options=callback:JSON_CALLBACK';
                $http.jsonp(url, {
                  cache: source.cache
                })
                  .success(function (response) {
                    oSource.addFeatures(geojsonFormat.readFeatures(response));
                  })
                  .error(function (response) {
                    $log(response);
                  });
              },
              projection: projection
            });
          }
          break;
        case 'TopoJSON':
          if (!(source.topojson || source.url)) {
            $log.error('[AngularJS - Openlayers] - You need a topojson ' +
              'property to add a TopoJSON layer.');
            return;
          }

          if (source.url) {
            oSource = new ol.source.Vector({
              format: new ol.format.TopoJSON(),
              url: source.url
            });
          } else {
            oSource = new ol.source.Vector(angular.extend(source.topojson, {
              format: new ol.format.TopoJSON()
            }));
          }
          break;
        case 'TileJSON':
          oSource = new ol.source.TileJSON({
            url: source.url,
            attributions: createAttribution(source),
            tileLoadFunction: source.tileLoadFunction,
            crossOrigin: 'anonymous'
          });
          break;

        case 'TileVector':
          if (!source.url || !source.format) {
            $log.error('[AngularJS - Openlayers] - TileVector Layer needs valid url and format properties');
          }
          oSource = new ol.source.VectorTile({
            url: source.url,
            projection: projection,
            attributions: createAttribution(source),
            tileLoadFunction: source.tileLoadFunction,
            format: source.format,
            tileGrid: new ol.tilegrid.createXYZ({
              maxZoom: source.maxZoom || 19
            })
          });
          break;

        case 'TileTMS':
          if (!source.url || !source.tileGrid) {
            $log.error('[AngularJS - Openlayers] - TileTMS Layer needs valid url and tileGrid properties');
          }
          oSource = new ol.source.TileImage({
            url: source.url,
            maxExtent: source.maxExtent,
            attributions: createAttribution(source),
            tileLoadFunction: source.tileLoadFunction,
            tileGrid: new ol.tilegrid.TileGrid({
              origin: source.tileGrid.origin,
              resolutions: source.tileGrid.resolutions
            }),
            tileUrlFunction: function (tileCoord) {

              var z = tileCoord[0];
              var x = tileCoord[1];
              var y = tileCoord[2]; //(1 << z) - tileCoord[2] - 1;

              if (x < 0 || y < 0) {
                return '';
              }

              var url = source.url + z + '/' + x + '/' + y + '.png';

              return url;
            }
          });
          break;
        case 'TileImage':
          oSource = new ol.source.TileImage({
            url: source.url,
            attributions: createAttribution(source),
            tileLoadFunction: source.tileLoadFunction,
            tileGrid: new ol.tilegrid.TileGrid({
              origin: source.tileGrid.origin, // top left corner of the pixel projection's extent
              resolutions: source.tileGrid.resolutions
            }),
            tileUrlFunction: function (tileCoord /*, pixelRatio, projection*/) {
              var z = tileCoord[0];
              var x = tileCoord[1];
              var y = -tileCoord[2] - 1;
              var url = source.url
                .replace('{z}', z.toString())
                .replace('{x}', x.toString())
                .replace('{y}', y.toString());
              return url;
            }
          });
          break;
        case 'KML':
          var extractStyles = source.extractStyles || false;
          oSource = new ol.source.Vector({
            url: source.url,
            format: new ol.format.KML(),
            radius: source.radius,
            extractStyles: extractStyles
          });
          break;
        case 'KMLBbox':
          var extractStyles = source.extractStyles || false;
          oSource = new ol.source.Vector({
            url: source.url,
            format: new ol.format.KML(),
            strategy: function (extent, resolution) {
              return [extent]
            },
            extractStyles: extractStyles
          });
          break;
        case 'Stamen':
          if (!source.layer || !isValidStamenLayer(source.layer)) {
            $log.error('[AngularJS - Openlayers] - You need a valid Stamen layer.');
            return;
          }
          oSource = new ol.source.Stamen({
            tileLoadFunction: source.tileLoadFunction,
            layer: source.layer
          });
          break;
        case 'ImageStatic':
          if (!source.url || !angular.isArray(source.imageSize) || source.imageSize.length !== 2) {
            $log.error('[AngularJS - Openlayers] - You need a image URL to create a ImageStatic layer.');
            return;
          }

          oSource = new ol.source.ImageStatic({
            url: source.url,
            attributions: createAttribution(source),
            imageSize: source.imageSize,
            projection: projection,
            imageExtent: source.imageExtent ? source.imageExtent : projection.getExtent(),
            imageLoadFunction: source.imageLoadFunction
          });
          break;
        case 'XYZ':
          if (!source.url && !source.tileUrlFunction) {
            $log.error('[AngularJS - Openlayers] - XYZ Layer needs valid url or tileUrlFunction properties');
          }
          var pixelRatio = window.devicePixelRatio;
          //                     if (pixelRatio > 1) {
          //                         url = url.replace('.png', '@2x.png');
          //                     }

          oSource = new ol.source.XYZ({
            url: source.url,
            attributions: createAttribution(source),
            minZoom: source.minZoom,
            maxZoom: source.maxZoom,
            projection: source.projection,
            tileUrlFunction: source.tileUrlFunction,
            tileLoadFunction: source.tileLoadFunction,
            tilePixelRatio: pixelRatio > 1 ? 2 : 1
          });
          break;
        case 'Zoomify':
          if (!source.url || !angular.isArray(source.imageSize) || source.imageSize.length !== 2) {
            $log.error('[AngularJS - Openlayers] - Zoomify Layer needs valid url and imageSize properties');
          }
          oSource = new ol.source.Zoomify({
            url: source.url,
            size: source.imageSize
          });
          break;
      }

      // log a warning when no source could be created for the given type
      if (!oSource) {
        $log.warn('[AngularJS - Openlayers] - No source could be found for type "' + source.type + '"');
      }

      return oSource;
    };

    var deepCopy = function (oldObj) {
      var newObj = oldObj;
      if (oldObj && typeof oldObj === 'object') {
        newObj = Object.prototype.toString.call(oldObj) === '[object Array]' ? [] : {};
        for (var i in oldObj) {
          newObj[i] = deepCopy(oldObj[i]);
        }
      }
      return newObj;
    };

    var createAttribution = function (source) {
      var attributions = [];
      if (isDefined(source.attribution)) {
        attributions.unshift(new ol.Attribution({
          html: source.attribution
        }));
      }
      return attributions;
    };

    var createGroup = function (name) {
      var olGroup = new ol.layer.Group();
      olGroup.set('name', name);

      return olGroup;
    };

    var getGroup = function (layers, name) {
      var layer;

      angular.forEach(layers, function (l) {
        if (l instanceof ol.layer.Group && l.get('name') === name) {
          layer = l;
          return;
        }
      });

      return layer;
    };

    var addLayerBeforeMarkers = function (layers, layer) {
      var markersIndex;
      for (var i = 0; i < layers.getLength(); i++) {
        var l = layers.item(i);

        if (l.get('markers')) {
          markersIndex = i;
          break;
        }
      }

      if (isDefined(markersIndex)) {
        var markers = layers.item(markersIndex);
        layer.index = markersIndex;
        layers.setAt(markersIndex, layer);
        markers.index = layers.getLength();
        layers.push(markers);
      } else {
        layer.index = layers.getLength();
        layers.push(layer);
      }

    };

    var removeLayer = function (layers, index) {

      /*
       * xiarx 20161121
       * 此处逻辑错误，olmarker图层并无编号，当移除marker图层时，此处的index作为序号就不再准确
       * 故注释掉原先的，更改为新的
       */

      /*  layers.removeAt(index);
       for (var i = index; i < layers.getLength(); i++) {
       var l = layers.item(i);
       if (l === null) {
       layers.insertAt(i, null);
       break;
       } else {
       l.index = i;
       }
       }*/
      layers.forEach(function (layer, no) {
        if (layer.index === index) {
          layers.removeAt(no);
          return;
        }
      })
    };

    return {
      //2017/4/11 styleConfig
      styleConfig: styleConfig,
      // Determine if a reference is defined
      isDefined: isDefined,

      // Determine if a reference is a number
      isNumber: function (value) {
        return angular.isNumber(value);
      },

      createView: function (view) {
        var projection = createProjection(view);

        var viewConfig = {
          projection: projection,
          maxZoom: view.maxZoom,
          minZoom: view.minZoom
        };

        if (view.center) {
          viewConfig.center = view.center;
        }
        if (view.extent) {
          viewConfig.extent = view.extent;
        }
        if (view.zoom) {
          viewConfig.zoom = view.zoom;
        }
        if (view.resolutions) {
          viewConfig.resolutions = view.resolutions;
        }

        return new ol.View(viewConfig);
      },

      // Determine if a reference is defined and not null
      isDefinedAndNotNull: isDefinedAndNotNull,

      colorRgb: colorRgb,

      // Determine if a reference is a string
      isString: function (value) {
        return angular.isString(value);
      },

      // Determine if a reference is an array
      isArray: function (value) {
        return angular.isArray(value);
      },

      // Determine if a reference is an object
      isObject: function (value) {
        return angular.isObject(value);
      },

      // Determine if two objects have the same properties
      equals: function (o1, o2) {
        return angular.equals(o1, o2);
      },

      isValidCenter: function (center) {
        return angular.isDefined(center) &&
          (typeof center.autodiscover === 'boolean' ||
          angular.isNumber(center.lat) && angular.isNumber(center.lon) ||
          (angular.isArray(center.coord) && center.coord.length === 2 &&
          angular.isNumber(center.coord[0]) && angular.isNumber(center.coord[1])) ||
          (angular.isArray(center.bounds) && center.bounds.length === 4 &&
          angular.isNumber(center.bounds[0]) && angular.isNumber(center.bounds[1]) &&
          angular.isNumber(center.bounds[1]) && angular.isNumber(center.bounds[2])));
      },

      safeApply: function ($scope, fn) {
        var phase = $scope.$root.$$phase;
        if (phase === '$apply' || phase === '$digest') {
          $scope.$eval(fn);
        } else {
          $scope.$apply(fn);
        }
      },

      isSameCenterOnMap: function (center, map) {
        var urlProj = center.projection || 'EPSG:4326';
        var urlCenter = [center.lon, center.lat];
        var mapProj = map.getView().getProjection();
        var mapCenter = ol.proj.transform(map.getView().getCenter(), mapProj, urlProj);
        var zoom = map.getView().getZoom();
        if (mapCenter[1].toFixed(4) === urlCenter[1].toFixed(4) &&
          mapCenter[0].toFixed(4) === urlCenter[0].toFixed(4) &&
          zoom === center.zoom) {
          return true;
        }
        return false;
      },

      setCenter: function (view, projection, newCenter, map) {

        //                if (map && view.getCenter()) {
        //                    if (view.getAnimating()) {
        //                        view.cancelAnimations();
        //                    }
        //                    view.animate({
        //                        center: (view.getCenter()),
        //                        duration: 150,
        //                    });
        //                }

        if (newCenter.projection === projection) {
          view.setCenter([newCenter.lon, newCenter.lat]);
        } else {
          var coord = [newCenter.lon, newCenter.lat];
          view.setCenter(ol.proj.transform(coord, newCenter.projection, projection));
        }
      },

      setZoom: function (view, zoom, map) {
        if (view.getAnimating()) {
          view.cancelAnimations();
        }
        view.animate({
          resolution: map.getView().getResolution(),
          duration: 150
        });
        view.setZoom(zoom);
      },

      isBoolean: function (value) {
        return typeof value === 'boolean';
      },

      createStyle: createStyle,

      setMapEvents: function (events, map, scope) {
        if (isDefined(events) && angular.isArray(events.map)) {
          for (var i in events.map) {
            var event = events.map[i];
            setEvent(map, event, scope);
          }
        }
      },

      getGreatCircleDistance: getGreatCircleDistance,
      getGeodesicDistance: getGeodesicDistance,
      setClickMarker: setClickMarker,
      setOverMarker: setOverMarker,
      setMarkerEvent: setMarkerEvent,

      setVectorLayerEvents: function (events, map, scope, layerName) {
        if (isDefined(events) && angular.isArray(events.layers)) {
          angular.forEach(events.layers, function (eventType) {
            angular.element(map.getViewport()).on(eventType, function (evt) {
              var pixel = map.getEventPixel(evt);
              var feature = map.forEachFeatureAtPixel(pixel, function (feature, olLayer) {
                // only return the feature if it is in this layer (based on the name)
                return (isDefinedAndNotNull(olLayer) && olLayer.get('name') === layerName) ? feature : null;
              });
              if (isDefinedAndNotNull(feature)) {
                scope.$emit('openlayers.layers.' + layerName + '.' + eventType, feature, evt);
              }
            });
          });
        }
      },

      setViewEvents: function (events, map, scope) {
        if (isDefined(events) && angular.isArray(events.view)) {
          var view = map.getView();
          angular.forEach(events.view, function (eventType) {
            view.on(eventType, function (event) {
              scope.$emit('openlayers.view.' + eventType, view, event);
            });
          });
        }
      },

      detectLayerType: detectLayerType,

      createLayer: function (layer, projection, name, onLayerCreatedFn) {
        var oLayer;
        var type = detectLayerType(layer);
        var oSource = createSource(layer.source, projection);
        if (!oSource) {
          return;
        }

        // handle function overloading. 'name' argument may be
        // our onLayerCreateFn since name is optional
        if (typeof (name) === 'function' && !onLayerCreatedFn) {
          onLayerCreatedFn = name;
          name = undefined; // reset, otherwise it'll be used later on
        }

        // Manage clustering
        if ((type === 'Vector') && layer.clustering) {
          oSource = new ol.source.Cluster({
            source: oSource,
            distance: layer.clusteringDistance
          });
        }

        var layerConfig = {
          source: oSource
        };

        // ol.layer.Layer configuration options
        if (isDefinedAndNotNull(layer.opacity)) {
          layerConfig.opacity = layer.opacity;
        }
        if (isDefinedAndNotNull(layer.visible)) {
          layerConfig.visible = layer.visible;
        }
        if (isDefinedAndNotNull(layer.extent)) {
          layerConfig.extent = layer.extent;
        }
        if (isDefinedAndNotNull(layer.zIndex)) {
          layerConfig.zIndex = layer.zIndex;
        }
        if (isDefinedAndNotNull(layer.minResolution)) {
          layerConfig.minResolution = layer.minResolution;
        }
        if (isDefinedAndNotNull(layer.maxResolution)) {
          layerConfig.maxResolution = layer.maxResolution;
        }

        switch (type) {
          case 'Image':
            oLayer = new ol.layer.Image(layerConfig);
            break;
          case 'Tile':
            oLayer = new ol.layer.Tile(layerConfig);
            break;
          case 'Heatmap':
            oLayer = new ol.layer.Heatmap(layerConfig);
            break;
          case 'Vector':
            oLayer = new ol.layer.Vector(layerConfig);
            break;
          case 'TileVector':
            oLayer = new ol.layer.VectorTile(layerConfig);
            break;
        }

        // set a layer name if given
        if (isDefined(name)) {
          oLayer.set('name', name);
        } else if (isDefined(layer.name)) {
          oLayer.set('name', layer.name);
        }

        // set custom layer properties if given
        if (isDefined(layer.customAttributes)) {
          for (var key in layer.customAttributes) {
            oLayer.set(key, layer.customAttributes[key]);
          }
        }

        // invoke the onSourceCreated callback
        if (onLayerCreatedFn) {
          onLayerCreatedFn({
            oLayer: oLayer
          });
        }

        return oLayer;
      },

      createVectorLayer: function () {
        return new ol.layer.Vector({
          source: new ol.source.Vector(),
          zIndex: arguments[0] || 0
        });
      },

      /* author xiarx 20161201
       * cluster
       */
      createClusterLayer: function () {
        return new ol.layer.Vector({
          source: new ol.source.Cluster({
            distance: parseInt(arguments[1] || 20),
            source: new ol.source.Vector()
          }),
          zIndex: arguments[0] || 0
        });
      },

      notifyCenterUrlHashChanged: function (scope, center, search) {
        if (center.centerUrlHash) {
          var centerUrlHash = center.lat.toFixed(4) + ':' + center.lon.toFixed(4) + ':' + center.zoom;
          if (!isDefined(search.c) || search.c !== centerUrlHash) {
            scope.$emit('centerUrlHash', centerUrlHash);
          }
        }
      },

      getControlClasses: getControlClasses,

      detectControls: function (controls) {
        var actualControls = {};
        var controlClasses = getControlClasses();

        controls.forEach(function (control) {
          for (var i in controlClasses) {
            if (control instanceof controlClasses[i]) {
              actualControls[i] = control;
            }
          }
        });

        return actualControls;
      },

      /* author xiarx 20161019
       * interaction
       */
      getInteractionClasses: getInteractionClasses,

      createFeature: function (data, viewProjection) {
        var geometry;

        switch (data.type) {
          case 'Polygon':
            geometry = new ol.geom.Polygon(data.coords);
            break;

          /*xiarx 20161120   添加线的绘制*/
          case 'LineString':
            geometry = new ol.geom.LineString(data.coords);
            break;
          case 'MultiLineString':
            geometry = new ol.geom.MultiLineString(data.coords);
            break;
          case 'Point':
            geometry = new ol.geom.Point(data.coords);
            break;
          case 'Circle':
            geometry = new ol.geom.Circle(data.coords, data.radius);
            break;
          default:
            if (data.coords) {
              geometry = new ol.geom.Point(data.coords);
            } else if (data.lat && data.lon) {
              geometry = new ol.geom.Point([data.lon, data.lat]);
            }
            break;
        }

        if (isDefined(data.projection) && data.projection !== 'pixel') {
          geometry = geometry.transform(data.projection, viewProjection);
        }

        var feature = new ol.Feature({
          id: data.id ? data.id : "",
          geometry: geometry
        });

        if (isDefined(data.style)) {
          var style = createStyle(data.style);
          feature.setStyle(style);
        }
        return feature;
      },

      addLayerBeforeMarkers: addLayerBeforeMarkers,

      getGroup: getGroup,

      addLayerToGroup: function (layers, layer, name) {
        var groupLayer = getGroup(layers, name);

        if (!isDefined(groupLayer)) {
          groupLayer = createGroup(name);
          addLayerBeforeMarkers(layers, groupLayer);
        }

        layer.set('group', name);
        addLayerBeforeMarkers(groupLayer.getLayers(), layer);
      },

      removeLayerFromGroup: function (layers, layer, name) {
        var groupLayer = getGroup(layers, name);
        layer.set('group');
        removeLayer(groupLayer.getLayers(), layer.index);
      },

      removeLayer: removeLayer,

      insertLayer: function (layers, index, layer) {
        if (layers.getLength() < index) {
          // fill up with "null layers" till we get to the desired index
          while (layers.getLength() < index) {
            var nullLayer = new ol.layer.Image();
            nullLayer.index = layers.getLength(); // add index which will be equal to the length in this case
            layers.push(nullLayer);
          }
          layer.index = index;
          layers.push(layer);
        } else {
          layer.index = index;
          layers.insertAt(layer.index, layer);
          for (var i = index + 1; i < layers.getLength(); i++) {
            var l = layers.item(i);
            if (l === null) {
              layers.removeAt(i);
              break;
            } else {
              l.index = i;
            }
          }
        }
      },
      createOverlay: createOverlay,
      removeOverlay: removeOverlay
    };
  }]);
  angular.module('openlayers-directive').factory('olMapDefaults', ["$q", "olHelpers", function ($q, olHelpers) {

    var base64icon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAApCAYAAADAk4LOAAAGmklEQVRYw' +
      '7VXeUyTZxjvNnfELFuyIzOabermMZEeQC/OclkO49CpOHXOLJl/CAURuYbQi3KLgEhbrhZ1aDwmaoGq' +
      'KII6odATmH/scDFbdC7LvFqOCc+e95s2VG50X/LLm/f4/Z7neY/ne18aANCmAr5E/xZf1uDOkTcGcWR' +
      '6hl9247tT5U7Y6SNvWsKT63P58qbfeLJG8M5qcgTknrvvrdDbsT7Ml+tv82X6vVxJE33aRmgSyYtcWV' +
      'MqX97Yv2JvW39UhRE2HuyBL+t+gK1116ly06EeWFNlAmHxlQE0OMiV6mQCScusKRlhS3QLeVJdl1+23' +
      'h5dY4FNB3thrbYboqptEFlphTC1hSpJnbRvxP4NWgsE5Jyz86QNNi/5qSUTGuFk1gu54tN9wuK2wc3o' +
      '+Wc13RCmsoBwEqzGcZsxsvCSy/9wJKf7UWf1mEY8JWfewc67UUoDbDjQC+FqK4QqLVMGGR9d2wurKzq' +
      'Bk3nqIT/9zLxRRjgZ9bqQgub+DdoeCC03Q8j+0QhFhBHR/eP3U/zCln7Uu+hihJ1+bBNffLIvmkyP0g' +
      'pBZWYXhKussK6mBz5HT6M1Nqpcp+mBCPXosYQfrekGvrjewd59/GvKCE7TbK/04/ZV5QZYVWmDwH1mF' +
      '3xa2Q3ra3DBC5vBT1oP7PTj4C0+CcL8c7C2CtejqhuCnuIQHaKHzvcRfZpnylFfXsYJx3pNLwhKzRAw' +
      'AhEqG0SpusBHfAKkxw3w4627MPhoCH798z7s0ZnBJ/MEJbZSbXPhER2ih7p2ok/zSj2cEJDd4CAe+5W' +
      'YnBCgR2uruyEw6zRoW6/DWJ/OeAP8pd/BGtzOZKpG8oke0SX6GMmRk6GFlyAc59K32OTEinILRJRcha' +
      'h8HQwND8N435Z9Z0FY1EqtxUg+0SO6RJ/mmXz4VuS+DpxXC3gXmZwIL7dBSH4zKE50wESf8qwVgrP1E' +
      'IlTO5JP9Igu0aexdh28F1lmAEGJGfh7jE6ElyM5Rw/FDcYJjWhbeiBYoYNIpc2FT/SILivp0F1ipDWk' +
      '4BIEo2VuodEJUifhbiltnNBIXPUFCMpthtAyqws/BPlEF/VbaIxErdxPphsU7rcCp8DohC+GvBIPJS/' +
      'tW2jtvTmmAeuNO8BNOYQeG8G/2OzCJ3q+soYB5i6NhMaKr17FSal7GIHheuV3uSCY8qYVuEm1cOzqdW' +
      'r7ku/R0BDoTT+DT+ohCM6/CCvKLKO4RI+dXPeAuaMqksaKrZ7L3FE5FIFbkIceeOZ2OcHO6wIhTkNo0' +
      'ffgjRGxEqogXHYUPHfWAC/lADpwGcLRY3aeK4/oRGCKYcZXPVoeX/kelVYY8dUGf8V5EBRbgJXT5QIP' +
      'hP9ePJi428JKOiEYhYXFBqou2Guh+p/mEB1/RfMw6rY7cxcjTrneI1FrDyuzUSRm9miwEJx8E/gUmql' +
      'yvHGkneiwErR21F3tNOK5Tf0yXaT+O7DgCvALTUBXdM4YhC/IawPU+2PduqMvuaR6eoxSwUk75ggqsY' +
      'J7VicsnwGIkZBSXKOUww73WGXyqP+J2/b9c+gi1YAg/xpwck3gJuucNrh5JvDPvQr0WFXf0piyt8f8/' +
      'WI0hV4pRxxkQZdJDfDJNOAmM0Ag8jyT6hz0WGXWuP94Yh2jcfjmXAGvHCMslRimDHYuHuDsy2QtHuIa' +
      'vznhbYURq5R57KpzBBRZKPJi8eQg48h4j8SDdowifdIrEVdU+gbO6QNvRRt4ZBthUaZhUnjlYObNagV' +
      '3keoeru3rU7rcuceqU1mJBxy+BWZYlNEBH+0eH4vRiB+OYybU2hnblYlTvkHinM4m54YnxSyaZYSF6R' +
      '3jwgP7udKLGIX6r/lbNa9N6y5MFynjWDtrHd75ZvTYAPO/6RgF0k76mQla3FGq7dO+cH8sKn0Vo7nDl' +
      'lwAhqwLPkxrHwWmHJOo+AKJ4rab5OgrM7rVu8eWb2Pu0Dh4eDgXoOfvp7Y7QeqknRmvcTBEyq9m/HQQ' +
      'SCSz6LHq3z0yzsNySRfMS253wl2KyRDbcZPcfJKjZmSEOjcxyi+Y8dUOtsIEH6R2wNykdqrkYJ0RV92' +
      'H0W58pkfQk7cKevsLK10Py8SdMGfXNXATY+pPbyJR/ET6n9nIfztNtZYRV9XniQu9IA2vOVgy4ir7GC' +
      'LVmmd+zjkH0eAF9Po6K61pmCXHxU5rHMYd1ftc3owjwRSVRzLjKvqZEty6cRUD7jGqiOdu5HG6MdHjN' +
      'cNYGqfDm5YRzLBBCCDl/2bk8a8gdbqcfwECu62Fg/HrggAAAABJRU5ErkJggg==';

    var _getDefaults = function () {
      return {
        view: {
          projection: 'EPSG:3857',
          minZoom: undefined,
          maxZoom: undefined,
          rotation: 0,
          extent: undefined
        },
        center: {
          lat: 0,
          lon: 0,
          zoom: 1,
          autodiscover: false,
          bounds: [],
          centerUrlHash: false,
          projection: 'EPSG:4326'
        },
        styles: {
          path: {
            fill: {
              color: "rgba(255,0,0,0.2)"
            },
            stroke: {
              color: 'blue',
              width: 4
            }
          },
          marker: {
            image: new ol.style.Icon({
              anchor: [0.5, 1],
              anchorXUnits: 'fraction',
              anchorYUnits: 'fraction',
              opacity: 0.90,
              src: base64icon
            })
          },
          feature: {
            /* xiarx 20161031  默认样式*/
            fill: new ol.style.Fill({
              color: "#0099ff"
            }),
            stroke: new ol.style.Stroke({
              color: "#1F497D",
              width: 1
            }),
            image: new ol.style.Circle({
              radius: 7,
              fill: new ol.style.Fill({
                color: "#0099ff"
              }),
              stroke: new ol.style.Stroke({
                color: "#1F497D",
                width: 1
              })
            })
          }
        },
        events: {
          map: [],
          markers: [],
          layers: []
        },
        controls: {
          attribution: false,
          rotate: false,
          zoom: false
        },
        interactions: {
          mouseWheelZoom: false,
          pinchRotate: false
        },
        renderer: 'canvas'
      };
    };

    var isDefined = olHelpers.isDefined;
    var defaults = {};

    // Get the _defaults dictionary, and override the properties defined by the user
    return {
      getDefaults: function (scope) {
        if (!isDefined(scope)) {
          for (var i in defaults) {
            return defaults[i];
          }
        }
        return defaults[scope.$id];
      },

      setDefaults: function (scope) {
        var userDefaults = scope.defaults;
        var scopeId = scope.$id;
        var newDefaults = _getDefaults();

        if (isDefined(userDefaults)) {

          if (isDefined(userDefaults.layers)) {
            newDefaults.layers = angular.copy(userDefaults.layers);
          }

          if (isDefined(userDefaults.controls)) {
            newDefaults.controls = angular.copy(userDefaults.controls);
          }

          if (isDefined(userDefaults.events)) {
            newDefaults.events = angular.copy(userDefaults.events);
          }

          if (isDefined(userDefaults.interactions)) {
            newDefaults.interactions = angular.copy(userDefaults.interactions);
          }

          if (isDefined(userDefaults.renderer)) {
            newDefaults.renderer = userDefaults.renderer;
          }

          if (isDefined(userDefaults.view)) {
            newDefaults.view.maxZoom = userDefaults.view.maxZoom || newDefaults.view.maxZoom;
            newDefaults.view.minZoom = userDefaults.view.minZoom || newDefaults.view.minZoom;
            newDefaults.view.projection = userDefaults.view.projection || newDefaults.view.projection;
            newDefaults.view.extent = userDefaults.view.extent || newDefaults.view.extent;
            newDefaults.view.resolutions = userDefaults.view.resolutions || newDefaults.view.resolutions;
          }

          if (isDefined(userDefaults.styles)) {
            newDefaults.styles = angular.extend(newDefaults.styles, userDefaults.styles);
          }

          if (isDefined(userDefaults.loadTilesWhileAnimating)) {
            newDefaults.loadTilesWhileAnimating = userDefaults.loadTilesWhileAnimating;
          }

          if (isDefined(userDefaults.loadTilesWhileInteracting)) {
            newDefaults.loadTilesWhileInteracting = userDefaults.loadTilesWhileInteracting;
          }
        }

        defaults[scopeId] = newDefaults;
        return newDefaults;
      }
    };
  }]);
}));
