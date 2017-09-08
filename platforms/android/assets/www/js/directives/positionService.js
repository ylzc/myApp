angular.module("positionService",[])
    .service("positionService", function () {
        return {
            _currentPosition: {status: false},
            _lastPosition: {},
            _positionError: {status: false, message: "GPS 信号搜索中"},
            _lowPosition: {status: false},
            getPosition: function () {
                if (this._currentPosition.status) {
                    return this._currentPosition;
                }
                else {
                    if (this._lastPosition.hasOwnProperty("timestamp")) {
                        var _last = new Date(this._lastPosition.timestamp).valueOf();
                        var _now = new Date().valueOf();
                        if (_now - _last < 6000) {
                            return this._lastPosition;
                        }
                        else {
                            return this._positionError;
                        }
                    }
                    else {
                        return this._positionError;
                    }
                }
            },
            getLowPosition: function () {
                return this._lowPosition;
            },
            setLowPosition: function (position) {
                this._lowPosition = position;
            },
            setPosition: function (position) {
                if (this._currentPosition.status) {
                    this._lastPosition = this._currentPosition;
                    this._lastPosition.type = "lastPosition";
                }
                this._currentPosition = position;
                this._currentPosition.status = true;
                this._currentPosition.type = "currentPosition";
            },
            setError: function (error) {
                this._currentPosition.status = false;
                this._positionError = error;
                this._positionError.status = false;
            }
        }
    })

