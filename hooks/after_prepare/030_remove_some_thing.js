#!/usr/bin/env node

/**
 * After prepare, files are copied to the platforms/ios and platforms/android folders.
 * Lets clean up some of those files that arent needed with this hook.
 */
var fs = require('fs');
var path = require('path');

var deleteFolderRecursive = function(removePath) {
    if( fs.existsSync(removePath) ) {
        fs.readdirSync(removePath).forEach(function(file,index){
            var curPath = path.join(removePath, file);
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        try { //异常捕获
            fs.rmdirSync(removePath);
        } catch (err) {

        }
    }
};
var deleteFolderNotUse = function(removePath) {
    var flag=true;
    if( fs.existsSync(removePath) ) {
        fs.readdirSync(removePath).forEach(function(file,index){
            var curPath = path.join(removePath, file);
            if(fs.lstatSync(curPath).isDirectory())
            { // recurse
                deleteFolderNotUse(curPath);
            }
            else if(path.extname(curPath)=='.json'
                ||path.extname(curPath)=='.md'
                ||path.extname(curPath)=='')
            { // delete file
                fs.unlinkSync(curPath);
                console.log(curPath)
            }
        });
        return true;
    }
};


var iosPlatformsDir = path.resolve(__dirname, '../../platforms/ios/www/lib/ionic/scss');
var androidPlatformsDir = path.resolve(__dirname, '../../platforms/android/assets/www/lib/ionic/scss');
var iosIonicAngular=path.resolve(__dirname,"../../platforms/ios/www/lib/ionic/js/angular");
var iosIonicAngularUiRouter=path.resolve(__dirname,"../../platforms/ios/www/lib/ionic/js/angular-ui");
var androidIonicAngular = path.resolve(__dirname, '../../platforms/android/assets/www/lib/ionic/js/angular');
var androidIonicAngularUiRouter = path.resolve(__dirname, '../../platforms/android/assets/www/lib/ionic/js/angular-ui');


var iosLib=path.resolve(__dirname, '../../platforms/ios/www/lib');
var androidLib = path.resolve(__dirname, '../../platforms/android/assets/www/lib');

deleteFolderNotUse(iosLib);
deleteFolderNotUse(androidLib);

var deleteIonicCss = function() {
    var ios=path.resolve(__dirname, '../../platforms/ios/www');
    var android = path.resolve(__dirname, '../../platforms/android/assets/www');
    if( fs.existsSync(ios) ) {
        var iosCss=path.resolve(__dirname, '../../platforms/ios/www/css/ionic.app.css');
        var iosMinCss=path.resolve(__dirname, '../../platforms/ios/www/css/ionic.app.min.css');
        if(fs.existsSync(iosCss)&&fs.existsSync(iosMinCss))
        {
            var iosLibCss=path.resolve(__dirname, '../../platforms/ios/www/lib/ionic/css');
            deleteFolderRecursive(iosLibCss)
        }
    }
    else if(fs.existsSync(android))
    {
        var androidCss=path.resolve(__dirname, '../../platforms/android/assets/www/css/ionic.app.css');
        var androidMinCss=path.resolve(__dirname, '../../platforms/android/assets/www/css/ionic.app.min.css');
        if(fs.existsSync(androidCss)&&fs.existsSync(androidMinCss))
        {
            var androidLibCss=path.resolve(__dirname, '../../platforms/android/assets/www/lib/ionic/css');
            deleteFolderRecursive(androidLibCss)
        }
    }
};

deleteIonicCss()