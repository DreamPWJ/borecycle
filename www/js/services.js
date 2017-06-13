angular.module('starter.services', [])
//service在使用this指针，而factory直接返回一个对象
  .service('CommonService', function ($ionicPopup, $ionicPopover, $rootScope, $state, $ionicModal, $cordovaCamera, $cordovaImagePicker, $ionicPlatform, $ionicActionSheet, $ionicHistory, $timeout, $cordovaToast, $cordovaGeolocation, $cordovaBarcodeScanner, $ionicViewSwitcher, $ionicLoading, AccountService, WeiXinService) {
    return {
      platformPrompt: function (msg, stateurl) {
        if ($ionicPlatform.is('android') || $ionicPlatform.is('ios')) {
          try {
            $cordovaToast.showLongCenter(msg);
          } catch (e) {
            this.showAlert("标题", msg, stateurl);
          }
        } else {
          this.showAlert("标题", msg, stateurl);
        }
      },
      showAlert: function (title, template, stateurl) {
        // 一个提示对话框
        var alertPopup = $ionicPopup.alert({
          cssClass: "show-alert",
          title: title,
          template: template,
          okText: '确定',
          okType: 'button-calm'
        });
        alertPopup.then(function (res) {
          if (stateurl == null || stateurl == '') {
            $ionicHistory.goBack();
          } else if (stateurl == 'close') {//不处理

          } else {
            $state.go(stateurl, {}, {reload: true});
          }

        });
      },
      showConfirm: function (title, template, okText, cancelText, stateurl, closeurl, confirmfunction) {
        var confirmPopup = $ionicPopup.confirm({
          cssClass: "show-confirm",
          title: '<strong>' + title + '</strong>',
          template: template,
          okText: okText,
          cancelText: cancelText,
          okType: 'button-calm',
          cancelType: 'button-assertive'
        });

        confirmPopup.then(function (res) {
          if (res) {
            if (stateurl != '') {
              $state.go(stateurl, {}, {reload: true});
              $ionicViewSwitcher.nextDirection("forward");//前进画效果
            } else {
              confirmfunction();
            }

          } else {
            if (closeurl == 'close') {//不处理
              return;
            }
            $state.go((closeurl == null || closeurl == '') ? 'tab.main' : closeurl, {}, {reload: true})
            $ionicViewSwitcher.nextDirection("back");//后退动画效果
          }
        });
      },

      customModal: function ($scope, templateurl, index, animation) { //自定义modal ndex页面出现多个模态框的情况 进行命名区别 index 可以为1.2.3.   animation动画slide-in-left slide-in-right
        index = index == undefined ? "" : index;
        $ionicModal.fromTemplateUrl(templateurl, {
          scope: $scope,
          animation: 'slide-in-up'
        }).then(function (modal) {
          $scope["modal" + index] = modal;
        });
        $scope.openModal = function () {
          $scope["modal" + index].show();
        };
        $scope.closeModal = function () {
          $scope["modal" + index].hide();
        };
        //当我们用到模型时，清除它！
        $scope.$on('$destroy', function () {
          $scope["modal" + index].remove();
        });
        // 当隐藏的模型时执行动作
        $scope.$on('modal' + index + '.hide', function () {
          // 执行动作
        });
        // 当移动模型时执行动作
        $scope.$on('modal' + index + '.removed', function () {
          // 执行动作
        });
      }
      ,
      ionicPopover: function ($scope, templateUrl,index) {//页面出现多个Popover框的情况 进行命名区别 index 可以为1.2.3
        index = index == undefined ? "" : index;
        $ionicPopover.fromTemplateUrl('templates/popover/' + templateUrl, {
          scope: $scope,
        }).then(function (popover) {
          $scope["popover"+index] = popover;
        });
        $scope.openPopover = function ($event) {
          $scope["popover"+index].show($event);
          //动态计算popover高度
          $rootScope.popoversize = document.querySelectorAll("#mypopover a").length * 55 + 'px';
        };
        $scope.closePopover = function () {
          $scope["popover"+index].hide();
        };
        //Cleanup the popover when we're done with it! 清除浮动框
        $scope.$on('$destroy', function () {
          $scope["popover"+index].remove();
        });
        $scope.$on('$ionicView.leave', function () {
          $scope["popover"+index].hide();
        });
        // 在隐藏浮动框后执行
        $scope.$on('popover'+index+'.hidden', function () {
          // Execute action
        });
        // 移除浮动框后执行
        $scope.$on('popover'+index+'.removed', function () {
          // Execute action
        });
      },

      ionicLoadingShow: function (content) {
        $ionicLoading.show({
          template: '<ion-spinner icon="bubbles" class="spinner-calm"></ion-spinner><p>' + (content ? content : '') + '</p>',
          animation: 'fade-in',
          showBackdrop: false

        });
      },
      ionicLoadingHide: function () {
        $ionicLoading.hide();
      },

      //扫一扫
      barcodeScanner: function ($scope) {
        //是否是微信
        if (WeiXinService.isWeiXin()) {
          //通过config接口注入权限验证配置
          WeiXinService.weichatConfig(localStorage.getItem("timestamp"), localStorage.getItem("noncestr"), localStorage.getItem("signature"));
          //通过ready接口处理成功验证
          wx.ready(function () {
            WeiXinService.wxscanQRCode($scope, $scope ? 1 : 0); //调起微信扫一扫接口
          })
          return;
        }
        /*      先检测设备是否就绪，通过cordova内置的原生事件deviceready来检测*/
        document.addEventListener("deviceready", function () {
          $cordovaBarcodeScanner
            .scan()
            .then(function (barcodeData) {
              // Success! Barcode data is here 扫描数据：barcodeData.text
              var reg = new RegExp("^((http)||(https)){1}://[\s]{0,}");//二维码信息是否有http链接
              if (reg.test(barcodeData.text)) {
                //通过默认浏览器打开
                window.open(barcodeData.text, '_system', 'location=yes');
              } else {
                $cordovaToast.showShortCenter('扫一扫信息:'+ barcodeData.text);
              }
            }, function (error) {
              $cordovaToast.showShortCenter('扫描失败,请重新扫描');
            });


          // NOTE: encoding not functioning yet 编不能正常工作
          $cordovaBarcodeScanner
            .encode(BarcodeScanner.Encode.TEXT_TYPE, "http://www.nytimes.com")
            .then(function (success) {
              // Success!
            }, function (error) {
              // An error occurred
            });
        }, false);
      }
      ,
      shareActionSheet: function (title, desc, link, imgUrl) {
        //通过config接口注入权限验证配置
        WeiXinService.weichatConfig(localStorage.getItem("timestamp"), localStorage.getItem("noncestr"), localStorage.getItem("signature"));
        //通过ready接口处理成功验证
        wx.ready(function () {
          // config信息验证后会执行ready方法，所有接口调用都必须在config接口获得结果之后，config是一个客户端的异步操作，所以如果需要在页面加载时就调用相关接口，则须把相关接口放在ready函数中调用来确保正确执行。对于用户触发时才调用的接口，则可以直接调用，不需要放在ready函数中。
          //自动调用分享按钮注册和自定义分享
          WeiXinService.wxonMenuShareTimeline(title, link, imgUrl);//微信朋友圈
          WeiXinService.wxonMenuShareAppMessage(title, desc, link, imgUrl);//微信好友
          WeiXinService.wxonMenuShareQQ(title, desc, link, imgUrl);//QQ好友
          WeiXinService.wxonMenuShareQZone(title, desc, link, imgUrl);//QQ空间

        });

      },
      uploadActionSheet: function ($scope, filename,isSingle) {//上传图片  isSingle是否是单张上传
        isSingle = (isSingle == undefined) ? false : isSingle;
        CommonService = this;
        $ionicActionSheet.show({
          cssClass: 'action-s',
          titleText: '上传照片',
          buttons: [
            {text: '图库'},
            {text: '拍照'},
          ],
          cancelText: '取消',
          cancel: function () {
            return true;
          },
          buttonClicked: function (index) {
            switch (index) {
              case 0:
                CommonService.takePicture($scope, 0, filename,isSingle)
                break;
              case 1:
                CommonService.takePicture($scope, 1, filename,isSingle)
                break;
              default:
                break;
            }
            return true;
          }
        });
      },
      //调用摄像头和相册 type 0是图库 1是拍照
      takePicture: function ($scope, type, filenames,isSingle) {
        //统计上传成功数量
        $scope.imageSuccessCount = 0;
        //是否是微信
        if (WeiXinService.isWeiXin()) {
          //通过config接口注入权限验证配置
          WeiXinService.weichatConfig(localStorage.getItem("timestamp"), localStorage.getItem("noncestr"), localStorage.getItem("signature"));
          //通过ready接口处理成功验证
          wx.ready(function () {
            WeiXinService.wxchooseImage($scope, type); //拍照或从手机相册中选图接口
          })
          return;
        }
        if (type == 0 && !isSingle) {//图库
          var options = {
            maximumImagesCount: 6 - $scope.imageList.length,//需要显示的图片的数量
            width: 800,
            height: 800,
            quality: 80
          };
          $cordovaImagePicker.getPictures(options).then(function (results) {
            $scope.imageUploadCount = results.length;
            for (var i = 0, len = results.length; i < len; i++) {
              $scope.imageList.push(results[i]);
              AccountService.addFilenames($scope, {filenames: filenames}, results[i]);
            }

          }, function (error) {
            $cordovaToast.showLongCenter('获取图片失败');
          });
        }
        if (type == 1|| (type == 0 && isSingle)) {  //拍照
          //$cordovaCamera.cleanup();
          var options = {
            quality: 100,//相片质量0-100
            destinationType: Camera.DestinationType.FILE_URI,        //返回类型：DATA_URL= 0，返回作为 base64 編碼字串。 FILE_URI=1，返回影像档的 URI。NATIVE_URI=2，返回图像本机URI (例如，資產庫)
            sourceType: type == 0 ? Camera.PictureSourceType.PHOTOLIBRARY : Camera.PictureSourceType.CAMERA,//从哪里选择图片：PHOTOLIBRARY=0，相机拍照=1，SAVEDPHOTOALBUM=2。0和1其实都是本地图库
            allowEdit: false,                                        //在选择之前允许修改截图
            encodingType: Camera.EncodingType.JPEG,                   //保存的图片格式： JPEG = 0, PNG = 1
            targetWidth: 500,                                        //照片宽度
            targetHeight: 500,                                       //照片高度
            mediaType: 0,                                             //可选媒体类型：圖片=0，只允许选择图片將返回指定DestinationType的参数。 視頻格式=1，允许选择视频，最终返回 FILE_URI。ALLMEDIA= 2，允许所有媒体类型的选择。
            cameraDirection: 0,                                       //枪后摄像头类型：Back= 0,Front-facing = 1
            saveToPhotoAlbum: true                                   //保存进手机相册
          };

          $cordovaCamera.getPicture(options).then(function (imageUrl) {
            $scope.imageUploadCount = 1;
            $scope.imageList.push(imageUrl);
            AccountService.addFilenames($scope, {filenames: filenames}, imageUrl);

          }, function (err) {
            // An error occured. Show a message to the user
            $cordovaToast.showLongCenter('获取照片失败');

          });
        }

      },
      getLocation: function (callback) { //获取当前经纬度
        //是否是微信
        if (WeiXinService.isWeiXin()) {
          //通过config接口注入权限验证配置
          WeiXinService.weichatConfig(localStorage.getItem("timestamp"), localStorage.getItem("noncestr"), localStorage.getItem("signature"));
          //通过ready接口处理成功验证
          wx.ready(function () {
            WeiXinService.wxgetLocation(); //获取地理位置接口
          })
          return;
        }
        CommonService = this;
        var posOptions = {timeout: 10000, enableHighAccuracy: false};
        $cordovaGeolocation
          .getCurrentPosition(posOptions)
          .then(function (position) {
            localStorage.setItem("latitude", position.coords.latitude);
            localStorage.setItem("longitude", position.coords.longitude);
            callback.call(this);
          }, function (err) {
            CommonService.platformPrompt("获取定位失败", 'close');
          });
      },
      isLogin: function (flag) {//判断是否登录
        if (!localStorage.getItem("usertoken")) {
          if (flag) {
            $state.go('login');
          } else {
            this.showConfirm('标题', '温馨提示:此功能需要登录才能使用,请先登录', '登录', '关闭', 'login');
            return;
          }
          return false;
        } else {
          return true;
        }
      },
      getStateName: function () {    //得到上一个路由名称方法
        var stateName = "";
        if ($ionicHistory.backView() && $ionicHistory.backView().stateName != "tab.account") {
          stateName = $ionicHistory.backView().stateName;
        }
        if (stateName) {
          $ionicHistory.goBack();
        } else {
          $state.go("tab.main", {}, {reload: true});
        }
      },

      windowOpen: function (url) {        //通过默认浏览器打开
        if (ionic.Platform.isWebView()) {  // Check if we are running within a WebView (such as Cordova)
          window.open(url, '_system', 'location=yes');
        } else {//如果是H5浏览器页面或者微信
          window.open(url, "_self");
        }

      },

      toolTip: function (msg, type) { //全局tooltip提示
        this.message = msg;
        this.type = type;
        //提示框显示最多3秒消失
        var _self = this;
        $timeout(function () {
          _self.message = null;
          _self.type = null;
        }, 3000);
      },


    }
  })
  .service('MainService', function ($q, $http, BoRecycle) { //主页服务定义
    return {
      authLogin: function () {
        var deferred = $q.defer();// 声明延后执行，表示要去监控后面的执行
        var promise = deferred.promise
        promise = $http({
          method: 'POST',
          url: BoRecycle.api + "/Auth/Login",
          data: data
        }).success(function (data) {
          deferred.resolve(data);// 声明执行成功，即http请求数据成功，可以返回数据了
        }).error(function (err) {
          deferred.reject(err);// 声明执行失败，即服务器返回错误
        });
        return promise; // 返回承诺，这里并不是最终数据，而是访问最终数据的API
      }
    }
  })
  .service('AccountService', function ($q, $http, BoRecycle, $cordovaFileTransfer, $state, $cordovaToast, $interval, $timeout, $ionicPopup, $ionicLoading, $cordovaFile, $cordovaFileOpener2) {
    return {
      login: function (datas) { //登录
        var deferred = $q.defer();// 声明延后执行，表示要去监控后面的执行
        var promise = deferred.promise
        promise = $http({
          method: 'POST',
          url: BoRecycle.api + "/user/login",
          data: datas
        }).success(function (data) {
          deferred.resolve(data);// 声明执行成功，即http请求数据成功，可以返回数据了
        }).error(function (err) {
          deferred.reject(err);// 声明执行失败，即服务器返回错误
        });
        return promise; // 返回承诺，这里并不是最终数据，而是访问最终数据的API
      },
      addFilenames: function ($scope, params, imageUrl) {//上传附件
        AccountService = this;
        //图片上传upImage（图片路径）
        //http://ngcordova.com/docs/plugins/fileTransfer/  资料地址

        var url = BoRecycle.api + "/UploadImg/Add/" + params.filenames;//Filenames:上传附件根目录文件夹名称发货，签收，验货统一用Receipt这个名称  会员头像用User这个名称
        var options = {
          fileKey: "file",//相当于form表单项的name属性
          fileName: imageUrl.substr(imageUrl.lastIndexOf('/') + 1),
          mimeType: "image/jpeg"
        };
        $cordovaFileTransfer.upload(url, imageUrl, options)
          .then(function (result) {
            $scope.ImgsPicAddr.push(JSON.parse(result.response).Des);
            $scope.imageSuccessCount++;
            if ($scope.imageSuccessCount == $scope.imageUploadCount) {
              $cordovaToast.showLongCenter("上传成功");
            }
            console.log("success=" + result.response);
          }, function (err) {
            $cordovaToast.showLongCenter("上传失败");
            $scope.imageList.splice(imageUrl, 1);//删除失败以后不显示
            console.log("err=" + err.response);
          }, function (progress) {
            // constant progress updates
          });
      },
      showUpdateConfirm: function (updatecontent, appurl, version) {    // 显示是否更新对话框
        var confirmPopup = $ionicPopup.confirm({
          cssClass: "show-updateconfirm",
          title: '<strong>发现新版本' + version + '</strong>',
          template: updatecontent, //从服务端获取更新的内容
          cancelText: '稍后再说',
          okText: '立刻更新',
          okType: 'button-calm',
          cancelType: 'button-assertive'
        });
        confirmPopup.then(function (res) {
          if (res) {
            $ionicLoading.show({
              template: "已经下载：0%"
            });
            var url = appurl; //可以从服务端获取更新APP的路径
            try {
              var targetPath = cordova.file.externalRootDirectory + "/boolv/boolv.apk"; //APP下载存放的路径，可以使用cordova file插件进行相关配置
            } catch (e) {
              $ionicLoading.hide();
            }

            var trustHosts = true;
            var options = {};
            $cordovaFileTransfer.download(url, targetPath, options, trustHosts).then(function (result) {
              // 打开下载下来的APP
              $cordovaFileOpener2.open(targetPath, 'application/vnd.android.package-archive'
              ).then(function () {
                // 成功
              }, function (err) {
                // 错误
              });
              $ionicLoading.hide();
            }, function (err) {
              $cordovaToast.showLongCenter("APP下载失败," + err);
              $ionicLoading.hide();
              return;
            }, function (progress) {
              //进度，这里使用文字显示下载百分比
              $timeout(function () {
                var downloadProgress = (progress.loaded / progress.total) * 100;
                $ionicLoading.show({
                  template: "已经下载：" + Math.floor(downloadProgress) + "%"
                });
                if (downloadProgress > 99) {
                  $ionicLoading.hide();
                }
              })
            });
          } else {
            // 取消更新
          }
        })
      }
    }
  })
  .service('NewsService', function ($q, $http, BoRecycle) {//通知消息服务
    return {
      setDeviceInfo: function (datas) { //提交设备信息到服务器
        var deferred = $q.defer();// 声明延后执行，表示要去监控后面的执行
        var promise = deferred.promise;
        promise = $http({
          method: 'POST',
          url: BoRecycle.api + "/push/set",
          data: datas
        }).success(function (data) {
          deferred.resolve(data);// 声明执行成功，即http请求数据成功，可以返回数据了
        }).error(function (err) {
          deferred.reject(err);// 声明执行失败，即服务器返回错误
        });
        return promise; // 返回承诺，这里并不是最终数据，而是访问最终数据的API
      },
      getNewsList: function (params) { //获取通知数据
        var deferred = $q.defer();// 声明延后执行，表示要去监控后面的执行
        var promise = deferred.promise;
        promise = $http({
          method: 'GET',
          url: BoRecycle.api + "/push/get/" + params.page + '/' + params.size + '/' + params.userid,
        }).success(function (data) {
          deferred.resolve(data);// 声明执行成功，即http请求数据成功，可以返回数据了
        }).error(function (err) {
          deferred.reject(err);// 声明执行失败，即服务器返回错误
        });
        return promise; // 返回承诺，这里并不是最终数据，而是访问最终数据的API
      },
      updateNewsLook: function (params) { //新闻设置已读未读
        var deferred = $q.defer();// 声明延后执行，表示要去监控后面的执行
        var promise = deferred.promise;
        promise = $http({
          method: 'POST',
          url: BoRecycle.api + "/push/look/" + params.look,
          params: {ids: params.ids}
        }).success(function (data) {
          deferred.resolve(data);// 声明执行成功，即http请求数据成功，可以返回数据了
        }).error(function (err) {
          deferred.reject(err);// 声明执行失败，即服务器返回错误
        });
        return promise; // 返回承诺，这里并不是最终数据，而是访问最终数据的API
      }
    }
  })
  .service('WeiXinService', function ($q, $http, BoRecycle) { //微信 JS SDK 接口服务定义
    return {
      //获取微信签名
      getWCSignature: function (params) {
        var deferred = $q.defer();// 声明延后执行，表示要去监控后面的执行
        var promise = deferred.promise
        promise = $http({
          method: 'POST',
          url: BoRecycle.api + "/wc/signature",
          params: params
        }).success(function (data) {
          deferred.resolve(data);// 声明执行成功，即http请求数据成功，可以返回数据了
        }).error(function (err) {
          deferred.reject(err);// 声明执行失败，即服务器返回错误
        });
        return promise; // 返回承诺，这里并不是最终数据，而是访问最终数据的API
      },
      //获取下载微信媒体文件
      getWCMedia: function (params) {
        var deferred = $q.defer();// 声明延后执行，表示要去监控后面的执行
        var promise = deferred.promise
        promise = $http({
          method: 'GET',
          url: BoRecycle.api + "/wc/media",
          params: params
        }).success(function (data) {
          deferred.resolve(data);// 声明执行成功，即http请求数据成功，可以返回数据了
        }).error(function (err) {
          deferred.reject(err);// 声明执行失败，即服务器返回错误
        });
        return promise; // 返回承诺，这里并不是最终数据，而是访问最终数据的API
      },
      isWeiXin: function isWeiXin() { //判断是否是微信内置浏览器
        var ua = window.navigator.userAgent.toLowerCase();
        if (ua.match(/MicroMessenger/i) == 'micromessenger') {
          return true;
        } else {
          return false;
        }
      },
      /*    所有需要使用JS-SDK的页面必须先注入配置信息，否则将无法调用（同一个url仅需调用一次，对于变化url的SPA的web app可在每次url变化时进行调用,
       目前Android微信客户端不支持pushState的H5新特性，所以使用pushState来实现web app的页面会导致签名失败，此问题会在Android6.2中修复*/
      weichatConfig: function (timestamp, nonceStr, signature) { //微信JS SDK 通过config接口注入权限验证配置
        wx.config({
          debug: false, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
          appId: 'wx39ba5b2a2f59ef2c', // 必填，公众号的唯一标识
          timestamp: timestamp, // 必填，生成签名的时间戳
          nonceStr: nonceStr, // 必填，生成签名的随机串
          signature: signature,// 必填，签名，见附录1
          jsApiList: ['checkJsApi', 'chooseImage', 'uploadImage', 'getLocation', 'openAddress','scanQRCode', 'chooseWXPay', 'onMenuShareAppMessage', 'onMenuShareTimeline', 'onMenuShareQQ', 'onMenuShareQZone'] // 必填，需要使用的JS接口列表，所有JS接口列表见附录2
        });
      },
      wxcheckJsApi: function () { //判断当前客户端版本是否支持指定微信 JS SDK接口
        wx.checkJsApi({
          jsApiList: ['chooseImage'], // 需要检测的JS接口列表，所有JS接口列表见附录2,
          success: function (res) {
            // 以键值对的形式返回，可用的api值true，不可用为false
            // 如：{"checkResult":{"chooseImage":true},"errMsg":"checkJsApi:ok"}
          }
        });

      },
      wxchooseImage: function ($scope, type) { //拍照或从手机相册中选图接口
        WeiXinService = this;
        wx.chooseImage({
          count: 6, // 默认9
          sizeType: ['original', 'compressed'], // 可以指定是原图还是压缩图，默认二者都有
          sourceType: type == 0 ? ['album'] : ['camera'], // 可以指定来源是相册还是相机，默认二者都有
          success: function (results) {
            var localIds = results.localIds; // 返回选定照片的本地ID列表，localId可以作为img标签的src属性显示图片
            for (var i = 0, len = localIds.length; i < len; i++) {
              WeiXinService.wxuploadImage($scope, localIds[i].toString(), $scope.uploadtype)
            }
          }
        });
      },
      wxuploadImage: function ($scope, localId, uploadtype) {//微信上传图片接口
        WeiXinService = this;
        wx.uploadImage({
          localId: localId, // 需要上传的图片的本地ID，由chooseImage接口获得
          isShowProgressTips: 1, // 默认为1，显示进度提示
          success: function (res) {
            var serverId = res.serverId; // 返回图片的服务器端ID
            //获取下载微信媒体文件
            $scope.mediaparams = {
              mediaId: serverId,//返回图片的服务器端ID
              optId: uploadtype //上传媒体操作类型 1.卖货单 2 供货单 3 买货单 4身份证 5 头像
            }
            WeiXinService.getWCMedia($scope.mediaparams).success(function (data) {
              $scope.imageList.push(data.Values.url);//客户端显示的url
            })
          }
        });
      },
      wxgetLocation: function () { //获取地理位置接口
        wx.getLocation({
          type: 'wgs84', // 默认为wgs84的gps坐标，如果要返回直接给openLocation用的火星坐标，可传入'gcj02'
          success: function (res) {
            var latitude = res.latitude; // 纬度，浮点数，范围为90 ~ -90
            var longitude = res.longitude; // 经度，浮点数，范围为180 ~ -180。
            var speed = res.speed; // 速度，以米/每秒计
            var accuracy = res.accuracy; // 位置精度
            localStorage.setItem("latitude", latitude);
            localStorage.setItem("longitude", longitude);
          }
        });
      },
      wxscanQRCode: function ($scope, type) {//调起微信扫一扫接口
        wx.scanQRCode({
          needResult: type, // 默认为0，扫描结果由微信处理，1则直接返回扫描结果，
          scanType: ["qrCode", "barCode"], // 可以指定扫二维码还是一维码，默认二者都有
          success: function (res) {
            if (type == 1) {// 当needResult 为 1 时，扫码返回的结果
              var result = res.resultStr.split(",")[1];
            }
          }
        });
      },
      wxopenAddress: function ($scope) {//编辑并获取收货地址
        wx.openAddress({
          success: function (res) {

          },
          cancel: function () {
            // 用户取消拉出地址
          }
        });
      },
      wxchooseWXPay: function (data) {//微信支付请求接口
        function onBridgeReady() {
          WeixinJSBridge.invoke(
            'getBrandWCPayRequest', {
              "appId": "wx7a6a63e9ee94e24d",     //公众号名称，由商户传入
              "timeStamp": data.timeStamp,         //时间戳，自1970年以来的秒数
              "nonceStr": data.nonceStr, //随机串
              "package": data.package,
              "signType": "MD5",         //微信签名方式:
              "paySign": data.paySign //微信签名
            },
            function (res) {
              // alert(JSON.stringify(res));
              console.log(res.err_msg);  // 使用以上方式判断前端返回,微信团队郑重提示：res.err_msg将在用户支付成功后返
            }
          );
        }

        if (typeof WeixinJSBridge == "undefined") {
          if (document.addEventListener) {
            document.addEventListener('WeixinJSBridgeReady', onBridgeReady, false);
          } else if (document.attachEvent) {
            document.attachEvent('WeixinJSBridgeReady', onBridgeReady);
            document.attachEvent('onWeixinJSBridgeReady', onBridgeReady);
          }
        } else {
          onBridgeReady();
        }

      },
      wxonMenuShareAppMessage: function (title, desc, link, imgUrl) { //获取“分享给朋友”按钮点击状态及自定义分享内容接口
        wx.onMenuShareAppMessage({
          title: title, // 分享标题
          desc: desc, // 分享描述
          link: link, // 分享链接
          imgUrl: imgUrl, // 分享图标
          type: '', // 分享类型,music、video或link，不填默认为link
          dataUrl: '', // 如果type是music或video，则要提供数据链接，默认为空
          success: function () {
            // 用户确认分享后执行的回调函数
          },
          cancel: function () {
            // 用户取消分享后执行的回调函数
          }
        });
      },
      wxonMenuShareTimeline: function (title, link, imgUrl) {//获取“分享到朋友圈”按钮点击状态及自定义分享内容接口
        wx.onMenuShareTimeline({
          title: title, // 分享标题
          link: link, // 分享链接
          imgUrl: imgUrl, // 分享图标
          success: function () {
            // 用户确认分享后执行的回调函数
          },
          cancel: function () {
            // 用户取消分享后执行的回调函数
          }
        });
      },
      wxonMenuShareQQ: function (title, desc, link, imgUrl) {//获取“分享到QQ”按钮点击状态及自定义分享内容接口
        wx.onMenuShareQQ({
          title: title, // 分享标题
          desc: desc, // 分享描述
          link: link, // 分享链接
          imgUrl: imgUrl, // 分享图标
          success: function () {
            // 用户确认分享后执行的回调函数
          },
          cancel: function () {
            // 用户取消分享后执行的回调函数
          }
        });
      },
      wxonMenuShareQZone: function (title, desc, link, imgUrl) {//获取“分享到QQ空间”按钮点击状态及自定义分享内容接口
        wx.onMenuShareQZone({
          title: title, // 分享标题
          desc: desc, // 分享描述
          link: link, // 分享链接
          imgUrl: imgUrl, // 分享图标
          success: function () {
            // 用户确认分享后执行的回调函数
          },
          cancel: function () {
            // 用户取消分享后执行的回调函数
          }
        });
      }
    }
  })
  .factory('MyInterceptor', function ($injector) {//设置请求头信息的地方是$httpProvider.interceptors。也就是为请求或响应注册一个拦截器。使用这种方式首先需要定义一个服务

    return {
      request: function (config) {////通过实现 request 方法拦截请求: 该方法会在 $http 发送请求道后台之前执行
        if (config.url.toString().indexOf('http://') === 0) {
          //http请求Loading加载动画
          $injector.get('$ionicLoading').show({
            template: '<ion-spinner icon="bubbles" class="spinner-calm"></ion-spinner><p>'
          });
        }
        //授权
        config.headers = config.headers || {};
        var token = localStorage.getItem('token');
        if (token) {
          config.headers.authorization = token;
        }
        return config;
      },
      requestError: function (config) {//通过实现 requestError 方法拦截请求异常: 请求发送失败或者被拦截器拒绝
        if (config.url.toString().indexOf('http://') === 0) {
          $injector.get('$ionicLoading').hide();
        }
        return config;
      },
      response: function (response) {//通过实现 response 方法拦截响应: 该方法会在 $http 接收到从后台过来的响应之后执行
        if (response.config.url.toString().indexOf('http://') === 0) {
          $injector.get('$ionicLoading').hide();
        }
        return response;
      },
      responseError: function (response) {////通过实现 responseError 方法拦截响应异常:后台调用失败 响应异常拦截器可以帮助我们恢复后台调用
        if (response.config.url.toString().indexOf('http://') === 0) {
          $injector.get('$ionicLoading').hide();
        }
        return response;
      }
    };
  })
