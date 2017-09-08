/**
 * Created by ylzc on 2017/6/20.
 */
(function () {
    var style = document.createElement("style");
    style.tyle = "text/css";
    /* 设置日历表格样式 */
    style.innerHTML += ".calendar-table {width: 100%;border-collapse: collapse;text-align: center;height:100%;}"
    style.innerHTML += ".calendar-table th{background:#ececec;}"
    /* 表格行高 */
    style.innerHTML += ".calendar-table tr {height: 45px;line-height: 45px;}"
    style.innerHTML += ".calendar-table td {vertical-align:middle;border-left: 3px solid #ffffff;border-right: 3px solid #ffffff;}"
    style.innerHTML += ".calendar-table td p {margin: 0 auto;display:block;border-radius:15px;height:30px;width:30px;line-height:30px;text-align:center;}"
    style.innerHTML += ".calendar-table td span {display:block;border-radius:2px;height:4px;width:4px;margin:0 auto;margin-top:3px;}"
    /* 当前天 颜色特殊显示 */
    style.innerHTML += ".calendar-table td.currentDay p{background-color:#39A4E8;color:#fff;}"

    /* 本月 文字颜色 */
    style.innerHTML += ".currentMonth {color: #222;}"

    /* 其他月颜色 */
    style.innerHTML += ".calendar-table td.otherMonth p,.calendar-table td.otherMonth span {display:none;}"

    style.innerHTML += ".qj span{background-color:#F46C7E;}"

    style.innerHTML += ".cc span{background-color:#6485F0;}"

    style.innerHTML += ".qd span{background-color:#2FA9E2;}"

    angular.element(document.getElementsByTagName('head')[0]).prepend(style);
})()
angular.module("cgs.ionic.directive", [])
    .service("dateObj", function () {
        return {
            _date: new Date(),
            getDate: function () {
                return this._date;
            },
            setDate: function (date) {
                this._date = date;
            },
            toPrevMonth: function () {
                date = this.getDate();
                this.setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1));
            },
            toNextMonth: function () {
                date = this.getDate();
                this.setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1));
            },
            getDateStr: function (date) {
                var _year = date.getFullYear();
                var _month = date.getMonth() + 1;    // 月从0开始计数
                var _d = date.getDate();

                _month = (_month > 9) ? ("" + _month) : ("0" + _month);
                _d = (_d > 9) ? ("" + _d) : ("0" + _d);
                return _year + _month + _d;
            },
            getDays: function () {
                var _year = this.getDate().getFullYear();
                var _month = this.getDate().getMonth() + 1;
                var _dateStr = this.getDateStr(this.getDate());
                // 设置表格中的日期数据
                var days = [[], [], [], [], [], []];
                var _firstDay = new Date(_year, _month - 1, 1);  // 当前月第一天
                for (var i = 0; i < 42; i++) {
                    var _thisDay = new Date(_year, _month - 1, i + 1 - _firstDay.getDay());

                    var _thisDayStr = this.getDateStr(_thisDay);

                    if (_thisDayStr == this.getDateStr(new Date())) {    // 当前天
                        _className = 'currentDay';
                    } else if (_thisDayStr.substr(0, 6) == this.getDateStr(_firstDay).substr(0, 6)) {
                        _className = 'currentMonth';  // 当前月
                    } else {    // 其他月
                        _className = 'otherMonth';
                    }
                    var j = Math.floor(i / 7);
                    days[j].push({day: _thisDay.getDate(), date: _thisDay, className: _className})
                }
                return days;
            }
        }
    })
    .directive("cgsCalendar", function ($compile, dateObj, $document, $window, $filter) {
        return {
            require: '?ngModel',
            restrict: 'A',
            scope: {
                month: "=",
                selectDay: "="
            },
            template: '<div class="calendar-body-box"> ' +
            '<table class="calendar-table">' +
            ' <tr> <th>日</th> <th>一</th> <th>二</th> <th>三</th> <th>四</th> <th>五</th> <th>六</th> </tr> ' +
            '<tr ng-repeat="week in month">' +
            ' <td ng-repeat="day in week" class="{{day.className}}"><p>{{day.day}}</p><span></span></td> ' +
            '</tr> ' +
            '</table> ' +
            '</div>',
            link: function (scope, element, attrs, controller, ngModel) {
                if (typeof scope.selectDay !== "function") {
                    scope.selectDay = function (day) {
                        console.log(day)
                    }
                }
            },
            controller: function ($scope, $window, $document, dateObj) {

            }
        }
    })
    .directive('keyboardshow', function ($rootScope, $ionicPlatform, $timeout, $ionicHistory, $cordovaKeyboard) {
        return {
            restrict: 'A',
            link: function (scope, element, attributes) {
                window.addEventListener('native.keyboardshow', function (e) {
                    angular.element(element).css({
                        'bottom': e.keyboardHeight + 'px'
                    });
                });

                window.addEventListener('native.keyboardhide', function (e) {
                    angular.element(element).css({
                        'bottom': 0
                    });
                });
            }
        };
    })
    .factory('viewerService',
        ['$document', '$window', function ($document, $window) {
            var _type = "";
            var _open;
            $document[0].addEventListener("deviceready", function () {
                _open = $window.open;
                // _open = $cordovaInAppBrowser.open;
                if (device.platform === "iOS") {
                    _type = "_blank";
                }
                else if (device.platform === "Android") {
                    _type = "_system";
                }
                else {
                    _type = "_system";
                }

            }, false);
            return {
                showPDF: function (fileToShow) {
                    _open(encodeURI(fileToShow), _type, 'location=no')
                }
            }
        }])
    .factory('downloadService',
        ['$document', '$q', function ($document, $q) {
            var _saveDirectory = "";
            var _fileTransfer;
            // Set attributes from Cordova plugins
            $document[0].addEventListener("deviceready", function () {
                _fileTransfer = new FileTransfer();
                if (device.platform === "iOS") {
                    _saveDirectory = cordova.file.dataDirectory;
                }
                else if (device.platform === "Android") {
                    _saveDirectory = cordova.file.externalApplicationStorageDirectory;
                }
                else {
                    _saveDirectory = cordova.file.dataDirectory;
                }

            }, false);

            return {
                download: function (url, fileName) {
                    return $q(function (resolve, reject) {
                        window.resolveLocalFileSystemURL
                        (_saveDirectory, function (dir) {
                            dir.getDirectory("PDF",
                                {create: true}, function (finalDir) {

                                    if (!_fileTransfer) {
                                        reject('error.noTransfer');
                                    }
                                    if (!_saveDirectory) {
                                        reject('error.noDirectory');
                                    }

                                    var fileURL = _saveDirectory + fileName;
                                    var uri = encodeURI(url);
                                    _fileTransfer.download(
                                        uri,
                                        fileURL,
                                        function (entry) {
                                            resolve(entry.toURL());
                                        },
                                        function (error) {
                                            reject(error);
                                        },
                                        true
                                    );
                                });

                        });
                    });
                }
            }
        }])
    // .directive("itemHeight",function(){
    //     return {
    //         link:function(scope,element,attrs){
    //             var item=$(element[0]);
    //
    //             var h=item.width()/1125*819;
    //
    //             item.height(item.parent().height()-h-6);
    //         }
    //     }
    // })
    .directive("loginBk",function(){
        return {
            link:function(scope,element,attrs){
                var item=$(element[0]);

                item.height(item.parent().height());
            }
        }
    })