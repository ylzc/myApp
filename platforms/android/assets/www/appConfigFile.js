(function (window) {
    var appConfig = {
        olMapDefault: {
            map: [
                {
                    name: "satelliteMap_base",
                    source: {
                        type: 'XYZ',
                        url: 'http://t0.tianditu.com/DataServer?T=vec_w&x={x}&y={y}&l={z}'
                    },
                    visible: true
                },
                {
                    name: "satelliteMap_symbol",
                    source: {
                        type: 'XYZ',
                        url: 'http://t1.tianditu.com/DataServer?T=cva_w&x={x}&y={y}&l={z}'
                    },
                    visible: true
                },
                {
                    name: "imageMap_base",
                    source: {
                        type: 'XYZ',
                        url: 'http://t0.tianditu.com/DataServer?T=img_w&x={x}&y={y}&l={z}'
                    },
                    "visible": false
                },
                {
                    name: "imageMap_symbol",
                    source: {
                        type: 'XYZ',
                        url: 'http://t1.tianditu.com/DataServer?T=cia_w&x={x}&y={y}&l={z}'
                    },
                    "visible": false
                }
            ],
            center: {
                lat: 28.97,
                lon: 118.88,
                zoom: 11
            },
            view: {
                rotation: 0,
                maxZoom: 18,
                minZoom: 6
            },
            defaults: {
                interactions: {
                    mouseWheelZoom: false,
                    pinchRotate: false
                }
            }
        },
        appType: "debug", //debug,release,develop
        appUser: {
            username: "",
            password: "",
            id: "LOGIN"
        },
        isNewApp: false,
        accountDB: null
    }
    window.$$appConfig = appConfig;
})(window);