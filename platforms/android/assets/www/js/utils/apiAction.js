define(['app'], function (app) {
    app
        .service("ApiAction", function () {
            return {
                _host: "http://172.18.69.54:8080",
                _fileHost: "http://172.18.21.58:8084",
                "login": function () {
                    return this._host + "/rest/app/login";
                    // username:admin
                    // password:1234561
                },
                "uploadUri": function () {
                    return this._fileHost + "/file.center/api/uploads/zhpt";
                },
                "downloadUri": function () {
                    return this._fileHost + "/file.center/api/download/zhpt/";
                },
            }
        })
});
