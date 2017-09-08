define(['ionic', 'app', 'routes', 'appConfig', 'appCtrl','apiAction','storage'],
    function (ionic,app,routes,appConfig,storage) {
        if(window.$$appConfig.appType==='release'||window.$$appConfig.appType==='develop')
        {
            window.document.addEventListener('deviceready', function onDeviceReady() {
                window.$$appConfig.accountDB = window.sqlitePlugin.openDatabase({name: 'account.db', location: 'default'});
                window.$$appConfig.accountDB.transaction(function (db) {
                    db.executeSql('CREATE TABLE IF NOT EXISTS accountTable (username, password, id)');

                    db.executeSql("SELECT * FROM accountTable", [],
                        function (db, res) {
                            if (res.rows.length > 0) {
                                window.$$appConfig.appUser.appUser = res.rows.item(0)
                            }
                            else {
                                db.executeSql("INSERT INTO accountTable (username, password, id) VALUES (?,?,?)", ["", "", "LOGIN"]);
                                window.$$appConfig.appUser.isNewApp = true;
                            }
                        })
                }, function (error) {
                    console.log('Transaction ERROR: ' + error.message);
                    window.angular.bootstrap(document, ['zhly']);
                    navigator.splashscreen.hide();
                }, function () {
                    console.log('Populated database OK');
                    window.angular.bootstrap(document, ['zhly']);
                    navigator.splashscreen.hide();
                })

            }, false);
        }
        else if(window.$$appConfig.appType==='debug')
        {
            window.angular.bootstrap(document, ['zhly']);
        }
    });

