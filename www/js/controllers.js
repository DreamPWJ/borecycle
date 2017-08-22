angular.module('starter.controllers', [])
  .config(function ($httpProvider) { //统一配置设置
    //服务注册到$httpProvider.interceptors中  用于接口授权
    $httpProvider.interceptors.push('MyInterceptor');
    /* $httpProvider.defaults.headers.common['Authorization'] = localStorage.getItem('token');*/
    /*    $http.defaults.cache = true/false;*/
  })

  //Tabs Ctrl
  .controller('TabsCtrl', function ($scope) {
    /*    $scope.isLogin = localStorage.getItem("userid") ? true : false;*///是否登录
    //  $scope.usertype = localStorage.getItem("usertype") || 0; //用户会员类型  0 无 1信息提供者  2回收者
    //$on用于事件 接收子级数据
    /*    $scope.$on("usertype", function (event, data) {
     localStorage.setItem("usertype", data.usertype);
     $scope.usertype = data.usertype; //用户会员类型  0 无 1信息提供者  2回收者
     });*/

  })

  //APP首页面
  .controller('MainCtrl', function ($scope, $rootScope,$state,$document, CommonService, MainService, OrderService, BoRecycle, $location, $ionicHistory, $interval, NewsService, AccountService, $ionicPlatform, WeiXinService,AddressService,$timeout) {
    //授权之后执行的方法
    $scope.afterAuth = function () {
      //首页统计货量
      $scope.cargoQuantity = {};
      OrderService.getCargoQuantity().success(function (data) {
        if (data.code == 1001) {
          $scope.cargoQuantity = data.data;
        } else {
          CommonService.platformPrompt("获取统计货量数据失败", 'close');
        }
      });
      $scope.isrole=true;
      //当为信息提供者时
      if (localStorage.getItem("usertype") == 1) {
        $scope.isrole = false;
        $scope.isinvitecode="0";
        //获取当前位置 定位
        $scope.location = function () {
          CommonService.getLocation(function () {
            //当前位置 定位
            AccountService.getCurrentCity({
              key: BoRecycle.gaoDeKey,
              location: Number($scope.handlongitude || localStorage.getItem("longitude")).toFixed(6) + "," + Number($scope.handlatitude || localStorage.getItem("latitude")).toFixed(6),
              radius: 3000,//	查询POI的半径范围。取值范围：0~3000,单位：米
              extensions: 'all',//返回结果控制
              batch: false, //batch=true为批量查询。batch=false为单点查询
              roadlevel: 0 //可选值：1，当roadlevel=1时，过滤非主干道路，仅输出主干道路数据
            }).success(function (data) {
              var addressComponent = data.regeocode.addressComponent;
              $scope.city = addressComponent.city;
            }).then(function () {
              AddressService.getAddressBySSX({
                ssx: $scope.city,
                level:2
              }).success(function (data) {
                if (data.code == 1001) {
                  $scope.isinvitecode = data.data.isinvitecode;
                } else {
                  $scope.isinvitecode = "0";
                }
              })
            })
          })
        }
        //页面加载完成自动定位
        $scope.$on('$ionicView.afterEnter', function () {
          $scope.location();//自动定位
          $timeout(function () {
            //调出分享面板
            CommonService.customModal($scope, 'templates/modal/share.html', 2);
            CommonService.customModal($scope, 'templates/modal/dl_modal.html');
            //发起分享
            $scope.shareCode = function () {
              //判断是否是WebView或微信，如果是则显示广告
              if (!WeiXinService.isWeiXin()) {
                if (!ionic.Platform.isWebView()) {
                  $state.go('download');
                }
                else {
                  $scope.modal2.show();
                }
              }
              else {
                $scope.share_arrow = "./img/share_arrow.png";
                $scope.modal.show();
              }
            }
            $scope.invitecode;//邀请码
            //获取邀请码
            AccountService.getInvitecode({
              userid: localStorage.getItem("userid"),
              isinvitecode: $scope.isinvitecode
            }).success(function (data) {
              $scope.invitecode = data.data;
              if ($scope.invitecode) {
                if (WeiXinService.isWeiXin()) { //如果是微信
                  CommonService.shareActionSheet("提供回收信息赚现金，首次下单额外奖励15元", "人人提供信息得信息费，信息越多赚钱越多，邀请使用成功登记回收信息得现金奖励", BoRecycle.mobApi + '/#/invitedown/' + $scope.invitecode.id, '');
                } else {
                  //调用分享面板
                  $scope.shareActionSheet = function (type) {
                    CommonService.shareActionSheet("提供回收信息赚现金，首次下单额外奖励15元", "人人提供信息得信息费，信息越多赚钱越多，邀请使用成功登记回收信息得现金奖励", BoRecycle.mobApi + '/#/invitedown/' + $scope.invitecode.id, '', type);
                  }
                }
              }
              else {
                if (WeiXinService.isWeiXin()) { //如果是微信
                  CommonService.shareActionSheet("提供回收信息赚现金，首次下单额外奖励15元", "人人提供信息得信息费，信息越多赚钱越多，邀请使用成功登记回收信息得现金奖励", BoRecycle.mobApi + '/#/download', '');
                } else {
                  //调用分享面板
                  $scope.shareActionSheet = function (type) {
                    CommonService.shareActionSheet("提供回收信息赚现金，首次下单额外奖励15元", "人人提供信息得信息费，信息越多赚钱越多，邀请使用成功登记回收信息得现金奖励", BoRecycle.mobApi + '/#/download', '', type);
                  }
                }
              }
            });
          },2000);
        })
      }
      //判断是否是WebView或微信，如果是则显示广告
      if (ionic.Platform.isWebView()) {
        $scope.isWebView = true;
      }
      //加载广告图
      if(!localStorage.getItem("adv")&&$scope.isWebView) {
        MainService.getAdv().success(function (data) {
          if (data.code = 1001 && data.data.length > 0) {
            $scope.adv = data.data[0];
            $scope.adv_img = BoRecycle.imgUrl + "/" + $scope.adv.imgurl;
            CommonService.customModal($scope, 'templates/modal/advmodal.html',3);
            localStorage.setItem("adv",1);
            var adv_show = function () {
              $scope.modal3.show().then(function () {
                //动态计算按钮高度及top值
                $scope.btnstyle={
                  'top':(document.querySelector("#adv-img").offsetHeight+document.querySelector("#adv-img").offsetTop+10)+'px'
                };
                CommonService.customModal($scope, 'templates/modal/share.html',1);
                //调用分享面板
                $scope.shareActionSheet = function (type) {
                  if (localStorage.getItem("usertype") == 1) {
                    CommonService.shareActionSheet("提供回收信息赚现金，首次下单额外奖励15元", "人人提供信息得信息费，信息越多赚钱越多，邀请使用成功登记回收信息得现金奖励", BoRecycle.mobApi + '/#/download', '', type);
                  } else {
                    CommonService.shareActionSheet("告别风吹日晒的蹲点回收，为回收人员增加真实货源", "下载“收收”在家接单轻松回收，告别蹲点回收，几千万回收人员的必备工具", BoRecycle.mobApi + '/#/download', '', type);
                  }
                }
              });
            }
            var adv_hide = function () {
              $scope.modal3.hide();
            }

            window.setTimeout(adv_show, 1000);
            window.setTimeout(adv_hide, 12000);
          }
        });
      }

      //获取极光推送registrationID
      if (ionic.Platform.isWebView() && localStorage.getItem("userid") && !localStorage.getItem("jPushRegistrationID")) { //包含cordova插件的应用
        //获取极光推送registrationID
        var getRegistrationID = function () {
          window.plugins.jPushPlugin.getRegistrationID(onGetRegistrationID);
        };

        var onGetRegistrationID = function (data) {

          try {
            if (data.length == 0) {
              window.setTimeout(getRegistrationID, 1000);
              return;
            }
            $scope.jPushRegistrationID = data;
            localStorage.setItem("jPushRegistrationID", data);
            //提交设备信息到服务器
            $scope.datas = {
              registration_id: $scope.jPushRegistrationID,	//极光注册id
              user: localStorage.getItem("userid"),	//用户id 必填
              mobile: localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")).mobile : '',	//手机号码 获取不到为空
              alias: "",	//设备别名
              device: $ionicPlatform.is('android') ? 0 : 1,	//设备类型:0-android,1-ios
              Lat: localStorage.getItem("latitude") || 22.5224500,
              Lon: localStorage.getItem("longitude") || 114.0557100,
              type: 2 //新app 2
            }
            NewsService.setDeviceInfo($scope.datas).success(function (data) {
              if (data.code == 1001) {
                localStorage.setItem("jPushRegistrationID", $scope.jPushRegistrationID);
              } else {
                CommonService.platformPrompt("提交设备信息到服务器失败", 'close');
                //错误信息收集 传到服务器
                AccountService.getErrorlog({
                  key: localStorage.getItem("userid") || "",
                  url: "/api/MessagePush/set",
                  content: "提交设备信息(极光ID)到服务器失败原因:" + data.message + ", 提交的数据是:" + JSON.stringify($scope.datas)
                }).success(function (data) {
                })
              }
            })

          } catch (exception) {
            //console.log(exception);
          }
        };

        //延迟调用获取极光注册ID
        window.setTimeout(getRegistrationID, 3000);
      }

      if (ionic.Platform.isWebView() && $ionicPlatform.is('android')) {//android系统自动更新软件版本
        $scope.versionparams = {
          ID: 3,//编码 ,等于空时取所有
          Name: '',//软件名称（中文）
          NameE: '',//软件名称（英文）
          Enable: 1 //是否启用 1启用 2禁用
        }
        AccountService.getVersionsList($scope.versionparams).success(function (data) {
          if (data.code == 1001) {
            $scope.versions = data.data.data_list[0];
            if (BoRecycle.version < $scope.versions.vercode) {
              AccountService.showUpdateConfirm($scope.versions.remark, $scope.versions.attached, $scope.versions.vercode);
            }
          }
        })
      }
    }


    $scope.getMainData = function () {
      if (!localStorage.getItem("userid")) {
        var authLogin = function () {
          //获取公共接口授权token  公共接口授权token两个小时失效  超过两个小时重新请求
          if (!localStorage.getItem("token") || localStorage.getItem("token") == "undefined" || ((new Date().getTime() - new Date(localStorage.getItem("expires_in")).getTime()) / 1000) > 7199) {
            MainService.authLogin({grant_type: 'client_credentials'}).success(function (data) {

              if (data.access_token) {
                localStorage.setItem("token", data.access_token);//公共接口授权token
                localStorage.setItem("expires_in", new Date());//公共接口授权token 有效时间
              } else {
                CommonService.platformPrompt("获取公众接口授权token失败", 'close');
                return;
              }
            }).then(function () {
              //授权之后执行的方法
              $scope.afterAuth();
            })
          } else {
            $scope.afterAuth();//未登录已经公共授权
          }
        }
        $rootScope.publicAuth = $interval(function () {
          authLogin();
        }, 7199000);
        authLogin();
      } else {
        $interval.cancel($rootScope.publicAuth);
        var authLogin = function () {
          MainService.authLogin(
            {
              grant_type: 'password',
              username: localStorage.getItem("userid"),
              password: localStorage.getItem("usersecret")
            }).success(function (data) {
            if (data.access_token) {
              localStorage.setItem("token", data.access_token);//登录接口授权token
              localStorage.setItem("expires_in", new Date());//登录接口授权token 有效时间
            } else {
              CommonService.platformPrompt("获取登录接口授权token失败", 'close');
              return;
            }
          }).then(function () {
            //授权之后执行的方法
            $scope.afterAuth();
          })
        }
        $rootScope.loginAuth = $interval(function () {
          authLogin();
        }, 7199000);
        authLogin();
      }

      $scope.$broadcast('scroll.refreshComplete');
    }

//执行方法
    $scope.getMainData();

//定位
    //  CommonService.getLocation();

//在首页中清除导航历史退栈
    $scope.$on('$ionicView.afterEnter', function () {
      $ionicHistory.clearHistory();
    })

  })

  //APP初次启动轮播引导图片
  .controller('StartCtrl', function ($scope, $state, BoRecycle, $ionicPlatform, $timeout, $ionicSlideBoxDelegate) {
    var width = window.screen.width * window.devicePixelRatio;//屏幕的宽分辨率
    var height = window.screen.height * window.devicePixelRatio;//屏幕的高分辨率
    $scope.imgname = [];
    if ($ionicPlatform.is('android')) {//android设备
      if (width == 240 || height == 320) {
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/1/drawable-port-ldpi-screen.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/2/drawable-port-ldpi-screen.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/3/drawable-port-ldpi-screen.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/4/drawable-port-ldpi-screen.png")
      } else if (width == 320 || height == 480) {
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/1/drawable-port-mdpi-screen.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/2/drawable-port-mdpi-screen.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/3/drawable-port-mdpi-screen.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/4/drawable-port-mdpi-screen.png")
      } else if (width == 480 || height == 800) {
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/1/drawable-port-hdpi-screen.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/2/drawable-port-hdpi-screen.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/3/drawable-port-hdpi-screen.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/4/drawable-port-hdpi-screen.png")
      } else if (width == 720 || height == 1280) {
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/1/drawable-port-xhdpi-screen.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/2/drawable-port-xhdpi-screen.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/3/drawable-port-xhdpi-screen.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/4/drawable-port-xhdpi-screen.png")
      } else if (width == 1080 || height == 1920) {
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/1/drawable-port-xxhdpi-screen.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/2/drawable-port-xxhdpi-screen.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/3/drawable-port-xxhdpi-screen.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/4/drawable-port-xxhdpi-screen.png")
      } else if (width == 2160 || height == 3840) {
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/1/drawable-port-xxxhdpi-screen.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/2/drawable-port-xxxhdpi-screen.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/3/drawable-port-xxxhdpi-screen.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/4/drawable-port-xxxhdpi-screen.png")
      } else {
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/1/drawable-port-xxhdpi-screen.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/2/drawable-port-xxhdpi-screen.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/3/drawable-port-xxhdpi-screen.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/4/drawable-port-xxhdpi-screen.png")
      }
    } else if ($ionicPlatform.is('ios')) { //ios设备

      if (width == 320 || height == 480) {
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/1/Default~iphone.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/2/Default~iphone.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/3/Default~iphone.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/4/Default~iphone.png")
      } else if (width == 640 || height == 960) {
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/1/Default@2x~iphone.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/2/Default@2x~iphone.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/3/Default@2x~iphone.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/4/Default@2x~iphone.png")
      } else if (width == 640 || height == 1136) {
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/1/Default-568h@2x~iphone.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/2/Default-568h@2x~iphone.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/3/Default-568h@2x~iphone.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/4/Default-568h@2x~iphone.png")
      } else if (width == 750 || height == 1134) {
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/1/Default-667h.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/2/Default-667h.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/3/Default-667h.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/4/Default-667h.png")
      } else if (width == 1242 || height == 2208) {
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/1/Default-736h.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/2/Default-736h.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/3/Default-736h.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/4/Default-736h.png")
      } else if (width == 768 || height == 1024) {
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/1/Default-Portrait~ipad.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/2/Default-Portrait~ipad.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/3/Default-Portrait~ipad.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/4/Default-Portrait~ipad.png")
      } else if (width == 1536 || height == 2048) {
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/1/Default-Portrait@2x~ipad.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/2/Default-Portrait@2x~ipad.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/3/Default-Portrait@2x~ipad.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/4/Default-Portrait@2x~ipad.png")
      }
      else {
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/1/Default-736h.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/2/Default-736h.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/3/Default-736h.png")
        $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/4/Default-736h.png")
      }
    } else {//h5
      $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/1/drawable-port-xxxhdpi-screen.png")
      $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/2/drawable-port-xxxhdpi-screen.png")
      $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/3/drawable-port-xxxhdpi-screen.png")
      $scope.imgname.push(BoRecycle.imgUrl + "/ShouShou/4/drawable-port-xxxhdpi-screen.png")
    }


    //ng-repeat遍历生成一个个slide块的时候，执行完成页面是空白的 手动在渲染之后更新一下，在控制器注入$ionicSlideBoxDelegate，然后渲染数据之后
    $timeout(function () {
      $ionicSlideBoxDelegate.$getByHandle("startslideboximgs").update();
    }, 100)

    //去首页
    $scope.tomain = function () {
      $state.go('tab.main', {}, {reload: true});
    }
  })

  //用户密码登录页面
  .controller('LoginCtrl', function ($scope, $state, $rootScope, $interval, CommonService, MainService, AccountService,AddressService,BoRecycle) {
    $rootScope.commonService = CommonService;
    //删除记住用户信息
    localStorage.removeItem("userid");
    localStorage.removeItem("usersecret");
    localStorage.removeItem("user");
    localStorage.removeItem("usertype");
    localStorage.removeItem("openid");
    localStorage.removeItem("token");
    localStorage.removeItem("expires_in");

    //如果没有授权先授权 或者超过两个小时
    if (!localStorage.getItem("token") || ((new Date().getTime() - new Date(localStorage.getItem("expires_in")).getTime()) / 1000) > 7199) {
      //接口授权
      MainService.authLogin({grant_type: 'client_credentials'}).success(function (data) {
        if (data.access_token) {
          localStorage.setItem("token", data.access_token);//公共接口授权token
          localStorage.setItem("expires_in", new Date());//公共接口授权token 有效时间
        }
      })
    }

    $scope.user = {};//提前定义用户对象
    $scope.user.isinvitecode="0";
    $scope.agreedeal = true;//同意用户协议
    $scope.paraclass = true;
    //获取当前位置 定位
    $scope.location = function () {
      CommonService.getLocation(function () {
        //当前位置 定位
        AccountService.getCurrentCity({
          key: BoRecycle.gaoDeKey,
          location: Number($scope.handlongitude || localStorage.getItem("longitude")).toFixed(6) + "," + Number($scope.handlatitude || localStorage.getItem("latitude")).toFixed(6),
          radius: 3000,//	查询POI的半径范围。取值范围：0~3000,单位：米
          extensions: 'all',//返回结果控制
          batch: false, //batch=true为批量查询。batch=false为单点查询
          roadlevel: 0 //可选值：1，当roadlevel=1时，过滤非主干道路，仅输出主干道路数据
        }).success(function (data) {
          var addressComponent = data.regeocode.addressComponent;
          $scope.city = addressComponent.city;
        }).then(function () {
          AddressService.getAddressBySSX({
            ssx: $scope.city,
            level:2
          }).success(function (data) {
            if (data.code == 1001) {
              $scope.user.isinvitecode = data.data.isinvitecode;
            } else {
              $scope.user.isinvitecode = "0";
            }
          })
        })
      })

    }
    //页面加载完成自动定位
    $scope.$on('$ionicView.afterEnter', function () {
      $scope.location();//自动定位
    });
    //从上一个登陆页面传递账号
    if ($rootScope.account_login) {
      $scope.user.account = $rootScope.account_login;
    }
    //根据会员账号检查是否需要邀请码
    $scope.getIsInvite = function (account) {
      if (!account || account == undefined || account == "") {
        return;
      }
      $rootScope.account_login = account;
      if (!localStorage.getItem("token")) {
        return;
      }

      //是否存在
      AccountService.getuserexist(account).success(function (datas) {
        if (datas.code == 1401 && account.toString().length == 11) {
          $rootScope.noExists = true;
          CommonService.showConfirm('收收提示', datas.message, '立即注册', '返回登陆', 'register', 'login', '', '', '');
        }
        else {
          if($scope.user.isinvitecode=="0") {
            AccountService.getIsInvite({account: account}).success(function (data) {
              if (data.code == 1001) {
                $scope.isInvite = false;
              } else {
                $scope.isInvite = true;
              }
            });
          }
          else {
            $scope.isInvite = false;
          }
        }
      });
    }
    $scope.loginSubmit = function () {
      $scope.user.openID = localStorage.getItem("openid") || "";//微信openID
      $scope.user.client = ionic.Platform.isWebView() ? 0 : (ionic.Platform.is('android') ? 1 : 2);
      AccountService.login($scope.user).success(function (data) {
        $scope.userdata = data.data;
        if (data.code == 1001) {
          $rootScope.account_login = null;
          localStorage.setItem("userid", data.data.userid);
          localStorage.setItem("usersecret", data.data.usersecret);
          //根据会员ID获取会员账号基本信息
          if (localStorage.getItem("userid")) {
            AccountService.getUser({userid: localStorage.getItem("userid")}).success(function (data) {
              if (data.code == 1001) {
                localStorage.setItem("user", JSON.stringify(data.data));
                var services = data.data.services;
                //用户会员类型  0 无 1信息提供者  2回收者
                localStorage.setItem("usertype", (services == null || services.length == 0 ) ? 0 : (services.length == 1 && services.indexOf('1') != -1) ? 1 : 2);
                if (services == null || services.length == 0) {//旧会员 完善信息
                  CommonService.showConfirm('收收提示', '尊敬的用户,您好！旧会员需完善资料后才能进行更多的操作！', '完善资料', '暂不完善', 'organizingdata', 'close');
                }
              } else {
                CommonService.platformPrompt(data.message, 'close');
              }
            }).then(function () {
              CommonService.getStateName();   //跳转页面
            })
          }

        } else {
          CommonService.platformPrompt(data.message, 'close');
          return;
        }

      }).then(function () {
        var authLogin = function () {
          MainService.authLogin(
            {
              grant_type: 'password',
              username: $scope.userdata.userid,
              password: $scope.userdata.usersecret
            }).success(function (data) {
            if (data.access_token) {
              localStorage.setItem("token", data.access_token);//登录接口授权token
              localStorage.setItem("expires_in", new Date());//登录接口授权token 有效时间
            }

          }).error(function () {
            CommonService.platformPrompt("获取登录接口授权token失败", 'close');
            return;
          })
        }
        $rootScope.loginAuth = $interval(function () {
          authLogin();
        }, 7199000);
        authLogin();
      })
    }
  })

  //手机验证登录页面
  .controller('MobileLoginCtrl', function ($scope, $state, $rootScope, $interval, $ionicGesture, CommonService, MainService, AccountService,AddressService,BoRecycle) {
    $rootScope.commonService = CommonService;
    //删除记住用户信息
    localStorage.removeItem("userid");
    localStorage.removeItem("usersecret");
    localStorage.removeItem("user");
    localStorage.removeItem("usertype");
    localStorage.removeItem("openid");
    localStorage.removeItem("token");
    localStorage.removeItem("expires_in");

    //如果没有授权先授权 或者超过两个小时
    if (!localStorage.getItem("token") || ((new Date().getTime() - new Date(localStorage.getItem("expires_in")).getTime()) / 1000) > 7199) {
      //接口授权
      MainService.authLogin({grant_type: 'client_credentials'}).success(function (data) {
        if (data.access_token) {
          localStorage.setItem("token", data.access_token);//公共接口授权token
          localStorage.setItem("expires_in", new Date());//公共接口授权token 有效时间
        }
      })
    }

    $scope.user = {};//提前定义用户对象
    $scope.user.isinvitecode="0";
    $scope.agreedeal = true;//同意用户协议
    $scope.paracont = "获取验证码"; //初始发送按钮中的文字
    $scope.paraclass = false; //控制验证码的disable
    $scope.isKeyup = false;//是否执行Keyup事件
    //获取当前位置 定位
    $scope.location = function () {
      CommonService.getLocation(function () {
        //当前位置 定位
        AccountService.getCurrentCity({
          key: BoRecycle.gaoDeKey,
          location: Number($scope.handlongitude || localStorage.getItem("longitude")).toFixed(6) + "," + Number($scope.handlatitude || localStorage.getItem("latitude")).toFixed(6),
          radius: 3000,//	查询POI的半径范围。取值范围：0~3000,单位：米
          extensions: 'all',//返回结果控制
          batch: false, //batch=true为批量查询。batch=false为单点查询
          roadlevel: 0 //可选值：1，当roadlevel=1时，过滤非主干道路，仅输出主干道路数据
        }).success(function (data) {
          var addressComponent = data.regeocode.addressComponent;
          $scope.city = addressComponent.city;
        }).then(function () {
          AddressService.getAddressBySSX({
            ssx: $scope.city,
            level:2
          }).success(function (data) {
            if (data.code == 1001) {
              $scope.user.isinvitecode = data.data.isinvitecode;
            } else {
              $scope.user.isinvitecode = "0";
            }
          })
        })
      })

    }
    //页面加载完成自动定位
    $scope.$on('$ionicView.afterEnter', function () {
      $scope.location();//自动定位
    })
    //从上一个登陆页面传递账号
    if ($rootScope.account_login) {
      $scope.user.mobile = $rootScope.account_login;
      $scope.paraclass = true;
    }
    $scope.checkphone = function (mobilephone) {//检查手机号
      if (/^1(3|4|5|7|8)\d{9}$/.test(mobilephone)) {
        $rootScope.account_login = mobilephone;
        //是否存在
        AccountService.getuserexist(mobilephone).success(function (datas) {
          if (datas.code == 1401 && mobilephone.toString().length == 11) {
            $rootScope.noExists = true;
            CommonService.showConfirm('收收提示', datas.message, '立即注册', '返回登陆', 'register', 'mobilelogin', '', '', '');
            $scope.paraclass = false;
            $scope.isKeyup = true;
          }
          else {
            $scope.paraclass = true;
          }
        });
      }
      else {
        $scope.paraclass = false;
      }
    }
    //获取验证码
    $scope.getVerifyCode = function () {
      CommonService.getVerifyCode($scope, $scope.user.mobile);
    }

//根据会员账号检查是否需要邀请码
    $scope.getIsInvite = function (account) {
      if (!account || account == undefined || account == "" || $scope.isKeyup) {
        return;
      }
      $rootScope.account_login = account;
      if (!localStorage.getItem("token")) {
        return;
      }
      //是否存在
      AccountService.getuserexist(account).success(function (datas) {
        if (datas.code == 1401 && account.toString().length == 11) {
          $rootScope.noExists = true;
          CommonService.showConfirm('收收提示', datas.message, '立即注册', '返回登陆', 'register', 'mobilelogin', '', '', '');
        }
        else {
          if($scope.user.isinvitecode=="0") {
            AccountService.getIsInvite({account: account}).success(function (data) {
              if (data.code == 1001) {
                $scope.isInvite = false;
              } else {
                $scope.isInvite = true;
              }
            });
          }
          else {
            $scope.isInvite = false;
          }
        }
      });
    }
    $scope.loginSubmit = function () {
      if ($scope.verifycode != $scope.user.code) {
        CommonService.platformPrompt("输入的验证码不正确", 'close');
        return;
      }
      $scope.user.openID = localStorage.getItem("openid") || "";//微信openID
      $scope.user.client = ionic.Platform.isWebView() ? 0 : (ionic.Platform.is('android') ? 1 : 2);
      AccountService.loginMobile($scope.user).success(function (data) {
        $scope.userdata = data.data;
        if (data.code == 1001) {
          $rootScope.account_login = null;
          localStorage.setItem("userid", data.data.userid);
          localStorage.setItem("usersecret", data.data.usersecret);
          //根据会员ID获取会员账号基本信息
          if (localStorage.getItem("userid")) {
            AccountService.getUser({userid: localStorage.getItem("userid")}).success(function (data) {
              if (data.code == 1001) {
                localStorage.setItem("user", JSON.stringify(data.data));
                var services = data.data.services;
                //用户会员类型  0 无 1信息提供者  2回收者
                localStorage.setItem("usertype", (services == null || services.length == 0) ? 0 : (services.length == 1 && services.indexOf('1') != -1) ? 1 : 2);
                if (services == null || services.length == 0) {//旧会员 完善信息
                  CommonService.showConfirm('收收提示', '尊敬的用户,您好！旧会员需完善资料后才能进行更多的操作！', '完善资料', '暂不完善', 'organizingdata', 'close');
                }
              } else {
                CommonService.platformPrompt(data.message, 'close');
              }
            }).then(function () {
              CommonService.getStateName();   //跳转页面
            })

          }
        } else {
          CommonService.platformPrompt(data.message, 'close');
        }

      }).then(function () {
        var authLogin = function () {
          MainService.authLogin(
            {
              grant_type: 'password',
              username: $scope.userdata.userid,
              password: $scope.userdata.usersecret
            }).success(function (data) {
            if (data.access_token) {
              localStorage.setItem("token", data.access_token);//登录接口授权token
              localStorage.setItem("expires_in", new Date());//登录接口授权token 有效时间
            }

          }).error(function () {
            CommonService.platformPrompt("获取登录接口授权token失败", 'close');
            return;
          })
        }
        $rootScope.loginAuth = $interval(function () {
          authLogin();
        }, 7199000);
        authLogin();

      })

    }
  })

  //注册页面
  .controller('RegisterCtrl', function ($scope, $rootScope, $state, CommonService, MainService, AccountService,AddressService,BoRecycle) {
    $scope.user = {//定义用户对象
      usertype: 1 //用户类型
    };
    $scope.user.isinvitecode="0";
    $scope.isInvite = true;
    $scope.agreedeal = true;//同意用户协议
    $scope.paracont = "获取验证码"; //初始发送按钮中的文字
    $scope.paraclass = false; //控制验证码的disable;
    $scope.services = [{key: 2, value: "上门回收者"}, {key: 3, value: "货场"}, {key: 4, value: "二手商家"}];//用户类型数组
    if ($rootScope.account_login && $rootScope.noExists) {
      $scope.user.account = $rootScope.account_login;
      $rootScope.account_login = null;
      $rootScope.noExists = null;
      $scope.paraclass = true;
    }
    //获取当前位置 定位
    $scope.location = function () {
      CommonService.getLocation(function () {
        //当前位置 定位
        AccountService.getCurrentCity({
          key: BoRecycle.gaoDeKey,
          location: Number($scope.handlongitude || localStorage.getItem("longitude")).toFixed(6) + "," + Number($scope.handlatitude || localStorage.getItem("latitude")).toFixed(6),
          radius: 3000,//	查询POI的半径范围。取值范围：0~3000,单位：米
          extensions: 'all',//返回结果控制
          batch: false, //batch=true为批量查询。batch=false为单点查询
          roadlevel: 0 //可选值：1，当roadlevel=1时，过滤非主干道路，仅输出主干道路数据
        }).success(function (data) {
          var addressComponent = data.regeocode.addressComponent;
          $scope.city = addressComponent.city;
        }).then(function () {
          AddressService.getAddressBySSX({
            ssx: $scope.city,
            level:2
          }).success(function (data) {
            if (data.code == 1001) {
              $scope.user.isinvitecode = data.data.isinvitecode;
              if( $scope.user.isinvitecode=="1")
              {
                $scope.isInvite = false;
              }
            } else {
              $scope.user.isinvitecode = "0";
            }
          })
        })
      })
    }
    //页面加载完成自动定位
    $scope.$on('$ionicView.afterEnter', function () {
      $scope.location();//自动定位
    });
    //如果没有授权先授权 或者超过两个小时
    if (!localStorage.getItem("token") || ((new Date().getTime() - new Date(localStorage.getItem("expires_in")).getTime()) / 1000) > 7199) {
      //接口授权
      MainService.authLogin({grant_type: 'client_credentials'}).success(function (data) {
        if (data.access_token) {
          localStorage.setItem("token", data.access_token);//公共接口授权token
          localStorage.setItem("expires_in", new Date());//公共接口授权token 有效时间
        }
      })
    }
    // $scope.checkphoneandemail = function (account) {//检查手机号和邮箱
    //   AccountService.checkMobilePhoneAndEmail($scope, account);
    // }
    $scope.checkphoneandemail = function (mobilephone) {//检查手机号
      if (/^1(3|4|5|7|8)\d{9}$/.test(mobilephone)) {

        //是否存在
        AccountService.getuserexist(mobilephone).success(function (datas) {
          if (datas.code != 1001) {
            $scope.paraclass = true;
          }
          else {
            CommonService.toolTip("注册账号已存在,请重新输入!", "")
            $scope.paraclass = false;
          }
        });
      }
      else {
        $scope.paraclass = false;
      }
    }
    $scope.checkrepwd = function (pwd, repwd) {//检查密码一致
      AccountService.checkPwdEqual($scope, pwd, repwd);
    }
    $scope.blurcheckrepwd = function (pwd, repwd) {
      if (!AccountService.checkPwdEqual($scope, pwd, repwd)) {
        CommonService.toolTip("请确保与上面密码一致", "");
      }
    }
    //获取验证码
    $scope.getVerifyCode = function () {
      CommonService.getVerifyCode($scope, $scope.user.account);
    }
    $scope.checkChecded = function () {
      CommonService.checkChecded($scope, $scope.services)
    }
    //注册
    $scope.register = function () {
      if ($scope.user.password != $scope.user.confirmpassword) {
        CommonService.platformPrompt("两次输入的密码不一致", 'close');
        return;
      }
      if ($scope.verifycode != $scope.user.code) {
        CommonService.platformPrompt("输入的验证码不正确", 'close');
        return;
      }

      $scope.user.services = [];//用户类型数组key
      if ($scope.user.usertype == 2) {
        angular.forEach($scope.services, function (item) {
          if (item.checked) {
            $scope.user.services.push(item.key)
          }
        })
      } else {
        $scope.user.services.push(1)
      }

      $scope.user.client = ionic.Platform.isWebView() ? 0 : (ionic.Platform.is('android') ? 1 : 2);
      $scope.user.openID = localStorage.getItem("openid") || "";//微信openID

      AccountService.registernew($scope.user).success(function (data) {
        if (data.code == 1001) {
          $rootScope.registerUserType = $scope.user.usertype;
          $rootScope.registerUserServices = $scope.user.services;
          $rootScope.isPhoneRegister = (/^1(3|4|5|7|8)\d{9}$/.test($scope.user.account))
          if ($rootScope.isPhoneRegister) {
            $rootScope.phoneRegister = $scope.user.account;
          }
          //   $state.go('organizingdata', {type: $scope.user.usertype});
          localStorage.setItem("userid", data.data.userid);
          localStorage.setItem("usersecret", data.data.usersecret);
          //根据会员ID获取会员账号基本信息
          AccountService.getUser({userid: localStorage.getItem("userid")}).success(function (data) {
            if (data.code == 1001) {
              localStorage.setItem("user", JSON.stringify(data.data));
              var services = data.data.services;
              //用户会员类型  0 无 1信息提供者  2回收者
              localStorage.setItem("usertype", (services == null || services.length == 0 ) ? 0 : (services.length == 1 && services.indexOf('1') != -1) ? 1 : 2);
              if ($scope.user.usertype == 1) {
                $state.go('tab.main');
              } else {
                $state.go('organizingdata', {type: $scope.user.usertype});
              }
            } else {
              CommonService.platformPrompt(data.message, 'close');
            }
          }).then(function () {
            MainService.authLogin(
              {
                grant_type: 'password',
                username: localStorage.getItem("userid"),
                password: localStorage.getItem("usersecret")
              }).success(function (data) {
              if (data.access_token) {
                localStorage.setItem("token", data.access_token);//登录接口授权token
                localStorage.setItem("expires_in", new Date());//登录接口授权token 有效时间
              }

            }).error(function () {
              CommonService.platformPrompt("获取登录接口授权token失败", 'close');
              return;
            })
          });
        }
        CommonService.platformPrompt(data.message, 'close');
      })

    }
  })

  //找回密码
  .controller('FindPasswordCtrl', function ($scope, $state, CommonService, MainService, AccountService) {
    $scope.user = {};//定义用户对象
    $scope.paracont = "获取验证码"; //初始发送按钮中的文字
    $scope.paraclass = false; //控制验证码的disable;

    //如果没有授权先授权 或者超过两个小时
    if (!localStorage.getItem("token") || ((new Date().getTime() - new Date(localStorage.getItem("expires_in")).getTime()) / 1000) > 7199) {
      //接口授权
      MainService.authLogin({grant_type: 'client_credentials'}).success(function (data) {
        if (data.access_token) {
          localStorage.setItem("token", data.access_token);//公共接口授权token
          localStorage.setItem("expires_in", new Date());//公共接口授权token 有效时间
        }
      })
    }
    $scope.checkphoneandemail = function (account) {//检查手机号和邮箱
      AccountService.checkMobilePhoneAndEmail($scope, account);
    }
    $scope.checkrepwd = function (pwd, repwd) {//检查密码一致
      AccountService.checkPwdEqual($scope, pwd, repwd);
    }
    $scope.blurcheckrepwd = function (pwd, repwd) {
      if (!AccountService.checkPwdEqual($scope, pwd, repwd)) {
        CommonService.toolTip("请确保与上面密码一致", "");
      }
    }
    //获取验证码
    $scope.getVerifyCode = function () {
      CommonService.getVerifyCode($scope, $scope.user.account);
    }

    //找回密码
    $scope.findPassword = function () {
      if ($scope.user.password != $scope.user.confirmpassword) {
        CommonService.platformPrompt("两次输入的密码不一致", 'close');
        return;
      }
      if ($scope.verifycode != $scope.user.code) {
        CommonService.platformPrompt("输入的验证码不正确", 'close');
        return;
      }
      AccountService.findPassword($scope.user).success(function (data) {
        if (data.code == 1001) {
          CommonService.platformPrompt("新密码设置成功", 'login');
        } else {
          CommonService.platformPrompt(data.message, 'close');
        }
      })

    }
  })

  //完善资料页面
  .controller('OrganizingDataCtrl', function ($scope, $rootScope, $stateParams, $state, CommonService, MainService, $ionicHistory, BoRecycle, OrderService, AccountService, AddressService) {
    //上传图片数组集合
    $scope.imageList = [];
    $scope.ImgsPicAddr = [];//图片信息数组
    $scope.uploadtype = 4;//上传媒体操作类型 1.卖货单 2 供货单 3 买货单 4身份证 5 头像
    $scope.usertype = 0;//默认旧会员
    $scope.addresspois = [];//附近地址数组
    $scope.user = {//定义用户对象
      usertype: 0 //用户类型默认
    };
    // $scope.isInfoProvider = true;
    $scope.uploadActionSheet = function () {
      CommonService.uploadActionSheet($scope, 'User', true);
    }
    CommonService.customModal($scope, 'templates/modal/addressmodal.html');
    CommonService.customModal($scope, 'templates/modal/nearbyaddressmodal.html', 1);
    $scope.$on('$ionicView.beforeEnter', function () {
      if ($ionicHistory.backView() && $ionicHistory.backView().stateName == "register") { //上一级路由名称
        $scope.usertype = $rootScope.registerUserType; //是从注册页面进入
        $scope.user.usertype = $rootScope.registerUserType;
        $scope.isPhoneRegister = $rootScope.isPhoneRegister;
        if ($rootScope.isPhoneRegister) {
          $scope.user.mobile = Number($rootScope.phoneRegister);
        }
        if ($rootScope.registerUserType == 2) {
          $scope.isUpgradeRecycler = true; //升级成为回收商
        }
      } else if ($ionicHistory.backView() && $ionicHistory.backView().stateName == "accountinfo" || $ionicHistory.backView() && $ionicHistory.backView().stateName == "jiedan") {
        if ($stateParams.type == 2) {
          $scope.isUpgradeRecycler = true; //升级成为回收商
        } else if ($stateParams.type == 1) {
          $scope.user.usertype = 1;
        }
      }
    })
    $scope.isLogin = localStorage.getItem("userid") ? true : false;//是否登录

    $scope.paracont = "获取验证码"; //初始发送按钮中的文字
    $scope.paraclass = false; //控制验证码的disable
    $scope.addrinfo = {};//地址信息
    $scope.recyclingCategory = [];//回收品类数组

    $scope.services = [{key: 2, value: "上门回收者"}, {key: 3, value: "货场"}, {key: 4, value: "二手商家"}];

    if (localStorage.getItem("userid")) {  //获取用户信息
      //根据会员ID获取会员账号基本信息
      AccountService.getUser({userid: localStorage.getItem("userid")}).success(function (datas) {
        if (datas.code == 1001) {
          $rootScope.userdata = datas.data;
          localStorage.setItem("user", JSON.stringify(datas.data));
          var services = datas.data.services;
          //用户会员类型  0 无 1信息提供者  2回收者
          var usertype = (services == null || services.length == 0) ? 0 : (services.length == 1 && services.indexOf('1') != -1) ? 1 : 2
          localStorage.setItem("usertype", usertype);
          $scope.usertype = usertype;
          $scope.isOrganizingData = datas.data.userext == null ? false : true;//是否完善资料

          if ((usertype == 1 && datas.data.userext != null) || usertype == 2) {
            // $scope.isInfoProvider = false;
            $scope.isUpgradeRecycler = true; //升级成为回收商
          }
          $scope.isPhoneRegister = AccountService.checkMobilePhone($scope, datas.data.mobile);

          if ($scope.isPhoneRegister) { //赋值
            $scope.user.mobile = Number(datas.data.mobile);
          }
          //赋值
          var userext = datas.data.userext;
          if (userext != null) {
            $scope.user = {
              username: userext.name,//姓名
              mobile: Number(userext.phone),//手机号码
              recoveryqty: 0,// 月回收量
              usertype: $scope.isUpgradeRecycler ? 2 : usertype, //用户类型
              shopname: userext.shopname,//企业名称
              shopphone: userext.shopphone ? Number(userext.shopphone) : '',//企业电话
              addrdetail: userext.addrdetail //企业详细地址
            }
          } else {
            $scope.user.usertype = $scope.isUpgradeRecycler ? 2 : usertype //用户类型
          }

        } else {
          CommonService.platformPrompt(datas.message, 'close');
        }
      })
    } else {

      //如果没有授权先授权 或者超过两个小时
      if (!localStorage.getItem("token") || ((new Date().getTime() - new Date(localStorage.getItem("expires_in")).getTime()) / 1000) > 7199) {
        //接口授权
        MainService.authLogin({grant_type: 'client_credentials'}).success(function (data) {
          if (data.access_token) {
            localStorage.setItem("token", data.access_token);//公共接口授权token
            localStorage.setItem("expires_in", new Date());//公共接口授权token 有效时间
          }
        })
      }
    }
    //如果是从注册页面进来的，且是回收商用户，自动赋值回收商子类
    if ($rootScope.registerUserServices) {
      var uss = $rootScope.registerUserServices;
      angular.forEach(uss, function (item) {
        angular.forEach($scope.services, function (item2) {
          if (item2.key == item) {
            item2.checked = true;
            $scope.ischecked = true;
          }
        });
      });
    }
//获取产品品类
    OrderService.getProductList({ID: "", Name: ""}).success(function (data) {
      if (data.code == 1001) {
        $scope.productList = data.data;
      } else {
        CommonService.platformPrompt(data.message, 'close');
      }
    }).then(function () {
      $scope.checkChecded = function (array) {
        $scope.ischecked = false;
        angular.forEach(array, function (item) {
          if (item.checked) {
            $scope.ischecked = true;
          }
        })
      }
      $scope.checkChecded1 = function (array) {
        $scope.ischecked1 = false;
        angular.forEach(array, function (item) {
          if (item.checked) {
            $scope.ischecked1 = true;
          }
        })
      }
    })
    $scope.checkphone = function (mobilephone) {//检查手机号
      AccountService.checkMobilePhone($scope, mobilephone);
    }

//获取验证码
    $scope.getVerifyCode = function () {
      CommonService.getVerifyCode($scope, $scope.user.mobile);
    }


//获取省市县
    $scope.getAddressPCCList = function (item) {
      if ($scope.user.usertype == 2) { //注册完善资料和“我的”那里升级回收商，那里只选省市，不要县。信息提供者才需要县
        $scope.pccLevel = 2;//省市县选择的层级
      }
      AddressService.getAddressPCCList($scope, item);
    }

    //modal打开 加载数据
    $scope.$on('modal.shown', function () {
      if ($scope.modalName == 'addressmodal') {
        $scope.getAddressPCCList();
      }
    })

//打开选择省市县modal
    $scope.openModal = function () {
      $scope.modalName = 'addressmodal'
      $scope.modal.show();
    }

    //打开附近地址modal
    $scope.openNearAddrModal = function () {
      $scope.location();//自动定位
      $scope.modal1.show();
    }

    // 选择打开附近地址
    $scope.getAddressPois = function (item) {
      // $scope.user.addrdetail = item.name;
      // $scope.modal1.hide();
      $scope.addrinfo.addressname= item.name;
    }
    $scope.searchaddrquery = function (addressname) {
      $scope.user.addrdetail =addressname;
      $scope.modal1.hide();
    }

    //关键字搜索：通过用POI的关键字进行条件搜索，例如：肯德基、朝阳公园等；同时支持设置POI类型搜索，例如：银行称
    $scope.getPlaceBySearch = function (addrname) {
      AccountService.getPlaceBySearch({
        key: BoRecycle.gaoDeKey,
        keywords: addrname,//查询关键词
        city: $scope.city || "深圳",
        extensions: 'all'//返回结果控制
      }).success(function (data) {
        $scope.addresspois = data.pois;
      })
    }

    //获取当前位置 定位
    $scope.location = function () {
      CommonService.getLocation(function () {
        //当前位置 定位
        AccountService.getCurrentCity({
          key: BoRecycle.gaoDeKey,
          location: Number($scope.handlongitude || localStorage.getItem("longitude")).toFixed(6) + "," + Number($scope.handlatitude || localStorage.getItem("latitude")).toFixed(6),
          radius: 3000,//	查询POI的半径范围。取值范围：0~3000,单位：米
          extensions: 'all',//返回结果控制
          batch: false, //batch=true为批量查询。batch=false为单点查询
          roadlevel: 0 //可选值：1，当roadlevel=1时，过滤非主干道路，仅输出主干道路数据
        }).success(function (data) {
          var addressComponent = data.regeocode.addressComponent;
          $scope.addresspois = data.regeocode.pois;
          $scope.city = addressComponent.city;
          $scope.ssx = addressComponent.province + addressComponent.city + ($scope.user.usertype == 2 ? "" : addressComponent.district);//省市县
          $scope.user.addrdetail = addressComponent.township + addressComponent.streetNumber.street;
        }).then(function () {
          AddressService.getAddressBySSX({
            ssx: $scope.ssx,
            level: $scope.user.usertype == 2 ? 2 : 3
          }).success(function (data) {
            if (data.code == 1001) {
              $scope.addrareacountyone = data.data;
            } else {
              CommonService.platformPrompt(data.message, "close")
            }
          })
        })
      })

    }
    //页面加载完成自动定位
    $scope.$on('$ionicView.afterEnter', function () {
      $scope.location();//自动定位
    })

    //用户类型选择
    $scope.userTypeSelect = function (type) {
      $scope.user.usertype = type;
      $scope.location();//自动定位
    }

//完善资料提交
    $scope.organizingdataSubmit = function () {

      if (!$scope.isPhoneRegister && $scope.verifycode != $scope.user.code) {
        CommonService.platformPrompt("输入的验证码不正确", 'close');
        return;
      }
      if ($scope.ImgsPicAddr.length == 0 && $scope.user.usertype == 1) {
        CommonService.platformPrompt("请先上传工作证后再提交", 'close');
        return;
      }
      $scope.user.services = [];//用户类型数组key
      if ($scope.user.usertype == 2) {
        angular.forEach($scope.services, function (item) {
          if (item.checked) {
            $scope.user.services.push(item.key)
          }
        })
      } else {
        $scope.user.services.push(1);
      }

      angular.forEach($scope.productList, function (item) {
        if (item.checked) {
          $scope.recyclingCategory.push(item.grpid)
        }
      })
      $scope.user.userid = localStorage.getItem("userid");//用户id
      $scope.user.grps = $scope.recyclingCategory.join(",");
      $scope.user.addrcode = $scope.addrareacountyone.ID;
      $scope.user.areacode = $scope.addrareacountyone.Code;
      $scope.user.img = $scope.ImgsPicAddr[0] || ""; //证件照地址
      $scope.user.recoveryqty = 0;//回收量默认为0
      AccountService.setUserInfo($scope.user).success(function (data) {
        if (data.code == 1001) {
          if (localStorage.getItem("userid")) {  //更新用户信息
            //根据会员ID获取会员账号基本信息
            AccountService.getUser({userid: localStorage.getItem("userid")}).success(function (datas) {
              if (datas.code == 1001) {
                $rootScope.userdata = datas.data;
                localStorage.setItem("user", JSON.stringify(datas.data));
                var services = datas.data.services;
                //用户会员类型  0 无 1信息提供者  2回收者
                localStorage.setItem("usertype", (services == null || services.length == 0) ? 0 : (services.length == 1 && services.indexOf('1') != -1) ? 1 : 2);
              }
            }).then(function () {
              //if ($scope.user.usertype == 2) {
              CommonService.platformPrompt("完善资料提交成功", 'close');
              var user = JSON.parse(localStorage.getItem("user"));
              //完善资料提交成功后清除回收商选项值
              if ($rootScope.registerUserServices) {
                $rootScope.registerUserServices = null;
              }
              if (user.certstate.substr(3, 1) != 2) { //没有实名认证
                //CommonService.showConfirm('收收提示', '尊敬的用户,您好！实名认证完善认证信息后才能进行更多操作！', '实名认证', '暂不认证', 'realname', 'close', '', {status: 0});
                $state.go('tworealname', {status: 0});
                return;
              }
              //}
              //CommonService.platformPrompt("完善资料提交成功", 'tab.main');
            });
          } else {
            CommonService.platformPrompt("完善资料提交成功", 'tab.main');
          }

        } else {
          CommonService.platformPrompt(data.message, 'close');
          //错误信息收集 传到服务器
          AccountService.getErrorlog({
            key: localStorage.getItem("userid") || "",
            url: "/api/user/set_info",
            content: "完善资料提交失败原因:" + data.message + ", 提交的数据是:" + JSON.stringify($scope.user)
          }).success(function (data) {
          })
        }

      })
    }
    //删除图片
    $scope.deleteImg=function () {
      $scope.imageList = [];
      $scope.ImgsPicAddr = [];//图片信息数组
    }
    $scope.bigImage = false;    //初始默认大图是隐藏的
    $scope.hideBigImage = function () {
      $scope.bigImage = false;
    };
//点击图片放大
    $scope.shouBigImage = function (imageName) {  //传递一个参数（图片的URl）
      $scope.Url = imageName;                   //$scope定义一个变量Url，这里会在大图出现后再次点击隐藏大图使用
      $scope.bigImage = true;                   //显示大图
    };

  })

  //参考价页面
  .controller('ReferencePriceCtrl', function ($scope, $stateParams, CommonService, OrderService, $ionicScrollDelegate) {
    //是否登录
    /*    if (!CommonService.isLogin(true)) {
     return;
     }*/
    $scope.classifyindex = 0;//选中产品分类标示
    $scope.productLists = [];//产品品类
    //获取产品分类
    $scope.getClassify = function () {
      //获取产品品类
      OrderService.getProductList({ID: "", Name: ""}).success(function (data) {
        if (data.code == 1001) {
          $scope.productList = data.data;
        } else {
          CommonService.platformPrompt(data.message, 'close');
        }
      }).then(function () {
        angular.forEach($scope.productList, function (item, index) { //根据产品品类及是否统货取产品列表(最新报价)
          OrderService.getProductListIsth({grpid: item.grpid, isth: 0}).success(function (data) {
            if (data.code == 1001) {
              var items = item;
              items.details = data.data;
              $scope.productLists.push(items);
            }
          }).then(function () {
            if (index == 0) {
              $scope.getClassifyDetails($scope.classifyindex);
            }
          })
        })
      })
    }
    $scope.getClassify();
    //点击产品分类获取产品分类详情
    $scope.getClassifyDetails = function (index) {
      $ionicScrollDelegate.scrollTop();
      $scope.classifyindex = index;
      $scope.classifyDetails = $scope.productList[index].details;
    }

    $scope.scrollHeight = (window.innerHeight - 44 ) + 'px';
    $scope.scrollContentHeight = document.querySelector("#classify-scroll-content").clientHeight + 'px';

  })

  .controller('jiedanCtrl', function ($scope, $rootScope, $state, $stateParams, CommonService, OrderService, $ionicHistory, $ionicSlideBoxDelegate, $ionicScrollDelegate, AccountService) {
    //是否登录
    if (!CommonService.isLogin(true)) {
      return;
    }

    $scope.$on('$ionicView.beforeEnter', function () {
      if (!$ionicHistory.backView()) { //有没有上级
        //如果授权超过两个小时 单独授权
        if (((new Date().getTime() - new Date(localStorage.getItem("expires_in")).getTime()) / 1000) > 7199) {
          //接口授权
          MainService.authLogin(
            {
              grant_type: 'password',
              username: localStorage.getItem("userid"),
              password: localStorage.getItem("usersecret")
            }).success(function (data) {
            if (data.access_token) {
              localStorage.setItem("token", data.access_token);//登录接口授权token
              localStorage.setItem("expires_in", new Date());//登录接口授权token 有效时间
            } else {
              CommonService.platformPrompt("获取登录接口授权token失败", 'close');
              return;
            }
          })
        }
      }
    })

    //获取当前位置 定位
    $scope.location = function () {
      CommonService.getLocation(function () {
      })
    }
    //页面加载完成自动定位
    $scope.$on('$ionicView.afterEnter', function () {
      $scope.location();//自动定位
    })

    $rootScope.hytype = $stateParams.hytype;
    $scope.isxinxi = false;
    $scope.isfeipin = false;
    $scope.isershou = false;
    $scope.isalldan = true;
    var user = JSON.parse(localStorage.getItem("user"));//用户信息
    if (user.services.length == 1 && user.services.indexOf('1') != -1) {
      CommonService.showConfirm('收收提示', '尊敬的用户您好!信息供应者没有权限接单,请升级成为回收商!', '升级回收商', '暂不升级', 'organizingdata', '', '', {type: 2}, '');
      return;
    }
    if ((user.services.indexOf('2') != -1 || user.services.indexOf('3') != -1 || user.services.indexOf('4') != -1) && !user.userext) {
      CommonService.showConfirm('收收提示', '尊敬的用户您好!完善资料才能接单!', '完善资料', '暂不完善', 'organizingdata', '', '', {type: 2}, '');
      return;
    }
    if (!user.userext) {
      CommonService.showConfirm('收收提示', '尊敬的用户您好!完善资料并且升级成为回收商才能接单!', '升级回收商', '暂不升级', 'organizingdata', '', '', {type: 2}, '');
      return;
    }
    $scope.tabIndex = $rootScope.hytype;//当前tabs页
    //如果取信息单，当会员不是上门回收者时取货场，否则到二手商家
    if ($scope.tabIndex == 0 && user.services.indexOf('2') == -1) {
      if (user.services.indexOf('3') != -1) {
        $scope.tabIndex = 1;
      }
      else {
        $scope.tabIndex = 2;
      }
    }
    //如果取废品单，当会员不是货场时取二手商家，否则到上门回收者
    if ($scope.tabIndex == 1 && user.services.indexOf('3') == -1) {
      if (user.services.indexOf('4') != -1) {
        $scope.tabIndex = 2;
      }
      else {
        $scope.tabIndex = 0;
      }
    }
    //如果取二手单，当会员不是二手商家时取货场，否则到上门回收者
    if ($scope.tabIndex == 2 && user.services.indexOf('4') == -1) {
      if (user.services.indexOf('3') != -1) {
        $scope.tabIndex = 1;
      }
      else {
        $scope.tabIndex = 0;
      }
    }
    //如果是上门回收者时
    if (user.services.indexOf('2') != -1) {
      $scope.isxinxi = true;
    }
    //如果是货场时
    if (user.services.indexOf('3') != -1) {
      $scope.isfeipin = true;
    }
    //如果是二手时
    if (user.services.indexOf('4') != -1) {
      $scope.isershou = true;
    }
    //隐藏上面的选项卡
    if (user.userext != null) {
      if (user.userext.type == "2" || user.userext.type == "3" || user.userext.type == "4" || user.userext.type == "2," || user.userext.type == "3," || user.userext.type == "4,") {
        $scope.isalldan = false;
      }
    }

    $rootScope.orderType = $scope.tabIndex;
    $scope.orderList = [];
    $scope.page = 0;
    $scope.total = 1;
    $scope.getOrderList = function () { //查询登记信息/货源信息分页列
      $rootScope.hytype = $scope.tabIndex;
      if (arguments != [] && arguments[0] == 0) {
        $scope.page = 0;
        $scope.orderList = [];
      }
      $scope.page++;
      $scope.params = {
        page: $scope.page,//页码
        size: 10//条数
      }
      $scope.datas = {
        DJNo: "",//登记单号(可为空)
        Type: "",//类型1.登记信息 2.登记货源(可为空)
        ORuserid: localStorage.getItem("userid"),//接单人
        userid: "",//用户userid
        Category: "",//货物品类 多个用逗号隔开(可为空)
        HYType: $scope.tabIndex,//货物类别 0.未区分 1废料 2二手(可为空)  上门回收(2)接登记信息（0）的单;货场(3)接废料（1）二手商家（4）接二手的(2)
        State: "2,3",//状态 0.已关闭 1.审核不通过 2.未审核 3.审核通过（待接单） 4.已接单 (待收货) 5.已收货（待付款） 6.已付款（待评价） 7.已评价 (可为空)
        longt: localStorage.getItem("longitude") || "", //当前经度（获取距离）(可为空)
        lat: localStorage.getItem("latitude") || "",//当前纬度（获取距离）(可为空)
        expiry: ""//小时 取预警数据 订单预警数据（72小时截至马上过期的（expiry=3表示取3小时内）
      }
      OrderService.getDengJiList($scope.params, $scope.datas).success(function (data) {
          $scope.isNotData = false;
          if (data.data == null || data.data.data_list.length == 0) {
            $scope.isNotData = true;
            $scope.total = 1;
            $scope.$broadcast('scroll.infiniteScrollComplete');
            return;
          }
          angular.forEach(data.data.data_list, function (item) {
            $scope.orderList.push(item);
          });
          console.log($scope.orderList);
          $scope.total = data.data.page_count;
          $scope.$broadcast('scroll.infiniteScrollComplete');
          $ionicScrollDelegate.resize();//添加数据后页面不能及时滚动刷新造成卡顿
        }
      ).finally(function () {
        $scope.$broadcast('scroll.refreshComplete');
        $scope.$broadcast('scroll.infiniteScrollComplete');
      })
    }
    $scope.getOrderList(0);//产品加载刷新
//点击选项卡
    $scope.selectedTab = function (index) {
      $scope.tabIndex = index;
      $scope.page = 0;
      $scope.total = 1;
      $scope.getOrderList(0);
    }
//接单
    $rootScope.jieDan = function (djno, userid, type, hytype) {
      event.preventDefault();
      var user = JSON.parse(localStorage.getItem("user"));//用户信息
      if (!user.userext || user.userext.autit != 2) {
        CommonService.platformPrompt("会员类型审核通过后才能操作", 'close');
        return;
      }
      if (user.services.length == 1 && user.services.indexOf('1') != -1) {
        CommonService.platformPrompt("信息供应者用户不能接单,申请成为回收商", 'close');
        return;
      }
      if ((type == 1 || hytype == 0) && user.services.indexOf('2') == -1) {
        CommonService.platformPrompt("登记信息单接单会员身份必须是上门回收者", 'close');
        return;
      }
      if (type == 2 && hytype == 1 && user.services.indexOf('3') == -1) {
        CommonService.platformPrompt("登记货源单废品接单会员身份必须是货场", 'close');
        return;
      }
      if (type == 2 && hytype == 2 && user.services.indexOf('4') == -1) {
        CommonService.platformPrompt("登记货源单二手接单会员身份必须是二手商家", 'close');
        return;
      }
      if (user.certstate.substr(3, 1) != "2") {
        CommonService.showConfirm('接单提示', '尊敬的用户，您好！请先进行“实名认证”后再接单！', '实名认证', '暂不认证', 'tworealname', '', '', {status:0}, '');
        return;
      }
      //添加接单收货/货源归集(添加回收时明细不能为空，接单时明细为空)
      $scope.jiedandata = {
        orno: "",//接单收货单号(回收时不能为空)
        oruserid: localStorage.getItem("userid"),//接单人账号userid 必填参数
        djno: djno,//登记信息单号 必填参数
        userid: userid,//登记信息人账号 必填参数
        type: type,//类型 1.接单收货（回收者接的是“登记信息”） 2.货源归集（货场接的是“登记货源”）  必填参数
        orstate: 2,//状态 0已取消 1审核不通过 2未审核（待审核） 3审核通过 4回收不通过 5回收未审核 6回收审核通过 (接单时为2，回收时为5) 7已过期 必填参数
        details: {} //接单回收记录明细数据
      }
      OrderService.addOrderReceipt($scope.jiedandata).success(function (data) {
        if (data.code == 1001) {
          CommonService.showConfirm('接单提示', '尊敬的用户,您好！恭喜您,接单成功！订单有效期为72小时,请您务必在72小时之内上门回收！', '查看订单', '继续接单', 'orderdetails', 'jiedan', '',
            {
              no: data.data,
              type: 2,
              hytype: hytype
            }, {hytype: hytype})
          $scope.getOrderList(0);//查询登记信息/货源信息分页列刷新
        } else if (data.code == 1005) { //接单的时候返回值是1005,就跳转到“待处理”页面
          CommonService.platformPrompt(data.message, "close");
          $scope.selectedTab(0);
        } else {
          CommonService.platformPrompt(data.message, "close");
        }
      })

    }
  })

  //我的回收订单页面
  .controller('OrderCtrl', function ($scope, $rootScope, $state, $stateParams, CommonService, OrderService,$filter, $ionicHistory, $ionicSlideBoxDelegate, $ionicScrollDelegate) {
    //是否登录
    if (!CommonService.isLogin(true)) {
      return;
    }
    $rootScope.commonService = CommonService;
    $scope.$on('$ionicView.beforeEnter', function () {
      if (!$ionicHistory.backView()) { //有没有上级
        //如果授权超过两个小时 单独授权
        if (((new Date().getTime() - new Date(localStorage.getItem("expires_in")).getTime()) / 1000) > 7199) {
          //接口授权
          MainService.authLogin(
            {
              grant_type: 'password',
              username: localStorage.getItem("userid"),
              password: localStorage.getItem("usersecret")
            }).success(function (data) {
            if (data.access_token) {
              localStorage.setItem("token", data.access_token);//登录接口授权token
              localStorage.setItem("expires_in", new Date());//登录接口授权token 有效时间
            } else {
              CommonService.platformPrompt("获取登录接口授权token失败", 'close');
              return;
            }
          })
        }
      }
    });
    //调出确认付款面板
    CommonService.customModal($scope, 'templates/modal/appointmodal.html');
    var user = JSON.parse(localStorage.getItem("user"));//用户信息
    $scope.tabOrderIndex = $stateParams.state;
    $scope.tabIndex = $scope.tabOrderIndex;//当前tabs页
    $scope.orderType = $scope.tabIndex;
    $scope.orderList = [];
    $scope.page = 0;
    $scope.total = 1;
    $scope.yymodal={};
    $scope.getOrderList = function () { //查询登记信息/货源信息分页列
      $scope.tabOrderIndex = $scope.tabIndex;
      if (arguments != [] && arguments[0] == 0) {
        $scope.page = 0;
        $scope.orderList = [];
      }
      $scope.page++;
      $scope.params = {
        page: $scope.page,//页码
        size: 10//条数
      }
      $scope.datas = {
        DJNo: "",//登记单号(可为空)
        Type: "",//类型1.登记信息 2.登记货源(可为空)
        userid: "",//用户userid
        Category: "",//货物品类 多个用逗号隔开(可为空)
        HYType: "",//货物类别 0.未区分 1废料 2二手(可为空) 上门回收(2)接登记信息（0）的单;货场(3)接废料（1）二手商家（4）接二手的(2)
        State: $scope.tabIndex == 2 ? "4,5" : "4,5,6,7",//状态 0.已关闭 1.审核不通过 2.未审核 3.审核通过（待接单） 4.已接单 (待收货) 5.已收货（待付款） 6.已付款（待评价） 7.已评价 (可为空)
        longt: localStorage.getItem("longitude") || "", //当前经度（获取距离）(可为空)
        lat: localStorage.getItem("latitude") || "",//当前纬度（获取距离）(可为空)
        ORNO: "",//接单单号(可为空)
        ORuserid: localStorage.getItem("userid")//接单人(不能为空)
      }
      OrderService.getOrderReceiptList($scope.params, $scope.datas).success(function (data) {
          $scope.isNotData = false;
          if (data.data == null || data.data.data_list.length == 0) {
            $scope.isNotData = true;
            $scope.total = 1;
            $scope.$broadcast('scroll.infiniteScrollComplete');
            return;
          }
          angular.forEach(data.data.data_list, function (item) {
            $scope.orderList.push(item);
          });
          $scope.total = data.data.page_count;
          $scope.$broadcast('scroll.infiniteScrollComplete');
          $ionicScrollDelegate.resize();//添加数据后页面不能及时滚动刷新造成卡顿
        }
      ).finally(function () {
        $scope.$broadcast('scroll.refreshComplete');
        $scope.$broadcast('scroll.infiniteScrollComplete');
      })

    }
    $scope.getOrderList(0);//产品加载刷新
//点击选项卡
    $scope.selectedTab = function (index) {
      $scope.tabIndex = index;
      $scope.page = 0;
      $scope.total = 1;
      $scope.getOrderList(0);
    }
//在回收订单中 取消订单
    $scope.cancelOrder = function (orno) {
      $state.go("cancelorder", {no: orno, type: 1});//订单类型 1.回收单 2.登记单
    }
//联系他
    $scope.relation = function (phonenumber) {
      event.preventDefault();
      window.open('tel:' + phonenumber);
    }
//去收货
    $scope.recycle = function (orno, djno, type, userid, amount, name, productname, hytype) {
      OrderService.torecycle(user, orno, djno, type, userid, amount, name, productname, hytype);

    }
//导航
    $scope.navigation = function (longitude, latitude) {
      event.preventDefault();
      $state.go("navigation", {longitude: longitude, latitude: latitude})
    }

//去付款
    $scope.topay = function (type, djno, orno, fromuser, touser, amount, name, informationmoney) {
      OrderService.topay(type, djno, orno, fromuser, touser, amount, name, informationmoney);
    }
//预约时间
    $scope.Appoint = function (type,djno,userid,orno,oraddtime) {
      var json = {
        type: type,
        djno: djno,
        orno: orno,
        userid: userid,
        oraddtime: oraddtime
      }
      $scope.yymodal=json;
      $scope.datas={
        N:10,
        //  ORAddTime:oraddtime
        ORAddTime:$filter('date')(new Date(),'yyyy-MM-dd')
      }
      OrderService.getappoint($scope.datas).success(function (data) {
        if (data.code == 1001) {
          $scope.dateList = [];
          $scope.dateList = data.data;
          console.log($scope.dateList);
        }
      });
      $scope.modal.show();
    }

    //实现单选
    $scope.appointChoice = function (array, item) {
      item.checked ? item.checked = false : item.checked = true;
      if (item.checked) {
        angular.forEach(array, function (child) {
          if (item != child) {
            child.checked = false;
          }
        });
      }
    }
    $scope.AppointSubmit=function () {
      var appointtime = [];//单选
      angular.forEach($scope.dateList, function (item) {
        if (item.checked) {
          appointtime.push($filter('date')(item.addtime, "yyyy-MM-dd"));
        }
      });
      if (appointtime.length==0) {
        $rootScope.commonService.toolTip('请选择预约时间！', '');
        return;
      }
      $scope.appointtime = {
        type: $scope.yymodal.type,
        djno:$scope.yymodal.djno,
        userid:$scope.yymodal.userid,
        orno:$scope.yymodal.orno,
        oruserid:localStorage.getItem("userid"),
        appointtime: appointtime.join(",")+" 23:59:59"
      }
      OrderService.addappoint($scope.appointtime).success(function (data) {
        if (data.code == 1001) {
          $scope.getOrderList(0)
          CommonService.platformPrompt("预约成功", "close");
          $scope.modal.hide();
          $scope.getOrderList(0);//产品加载刷新
        } else {
          CommonService.platformPrompt(data.message, "close");
        }
      });
    }
  })

  //我的回收订单详情页面
  .controller('OrderDetailsCtrl', function ($scope, $rootScope, $state, $stateParams, CommonService, OrderService) {
    var user = JSON.parse(localStorage.getItem("user"));//用户信息
    $rootScope.hytype = $stateParams.hytype;//1.待接单 2 待处理和所有订单
    $rootScope.type = $stateParams.type;
    $scope.url = "";
    //跳转地址
    if ($rootScope.type == 1) {
      $scope.url = "#/jiedan/" + $rootScope.hytype;
    }
    else {
      $scope.url = "#/order/0";
    }
    $scope.getOrderListDetails = function () {
      if ($scope.type == 1) {
        OrderService.getDengJiDetail({djno: $stateParams.no}).success(function (data) {
          if (data.code == 1001) {
            $scope.orderDetail = data.data;
          } else {
            CommonService.platformPrompt(data.message, "tab.main");
          }

        }).then(function () {
          $scope.getComment();
        })
      }
      if ($scope.type == 2) {
        OrderService.getOrderReceiptDetail({orno: $stateParams.no}).success(function (data) {
          if (data.code == 1001) {
            $scope.orderDetail = data.data;
          } else {
            CommonService.platformPrompt(data.message, "tab.main");
          }

        }).then(function () {
          $scope.getComment();
        })
      }
    }

    $scope.getOrderListDetails();

    //获取评论内容
    $scope.getComment = function () {
      if($scope.orderDetail.oruserid!=null && $scope.orderDetail.oruserid!=localStorage.getItem("userid"))
      {
        CommonService.platformPrompt("该单已被其他回收商抢走！", 'tab.main');
        return;
      }
      OrderService.getComment({djno: $scope.orderDetail.djno}).success(function (data) {
        $scope.commentInfo = data.data;

      })
    }

    //接单
    $scope.jieDan = function (djno, userid, type, hytype) {
      $rootScope.jieDan(djno, userid, type, hytype)
    }

    //去收货
    $scope.recycle = function (orno, djno, type, userid, amount, name, productname, hytype) {
      OrderService.torecycle(user, orno, djno, type, userid, amount, name, productname, hytype);
    }

    //导航
    $scope.navigation = function (longitude, latitude) {
      event.preventDefault();
      $state.go("navigation", {longitude: longitude, latitude: latitude})
    }


    //去付款
    $scope.topay = function (type, djno, orno, fromuser, touser, amount, name, informationmoney) {
      OrderService.topay(type, djno, orno, fromuser, touser, amount, name, informationmoney);
    }

    //在回收订单中 取消订单
    $scope.cancelOrder = function (orno) {
      $state.go("cancelorder", {no: orno, type: 1});//订单类型 1.回收单 2.登记单
      /*      OrderService.cancelOrderReceipt({orno: djno}).success(function (data) {
       if (data.code == 1001) {
       CommonService.platformPrompt("取消接单成功", "close");
       $scope.getOrderListDetails();//详情刷新
       } else {
       CommonService.platformPrompt(data.message, "close");
       }
       })*/
    }
  })

  //我的订单页面
  .controller('MyOrderCtrl', function ($scope, $rootScope, $state, CommonService, OrderService, $ionicHistory, $ionicSlideBoxDelegate, $ionicScrollDelegate) {
    var ismyorderdetails = $ionicHistory.forwardView() && $ionicHistory.forwardView().stateName == 'myorderdetails';
    $scope.tabIndex = ismyorderdetails ? $rootScope.tabMyOrderIndex : 0;//tab默认
    //未完成订单
    $scope.unfinishedorderList = [];
    $scope.unfinishedpage = 0;
    $scope.unfinishedtotal = 1;
    //所有订单
    $scope.orderList = [];
    $scope.page = 0;
    $scope.total = 1;
    $scope.getOrderList = function () { //查询登记信息/货源信息分页列
      $rootScope.tabMyOrderIndex = $scope.tabIndex;
      if (arguments != [] && arguments[0] == 0) {
        if ($scope.tabIndex == 0) {  //未完成订单
          $scope.unfinishedpage = 0;
          $scope.unfinishedorderList = [];
        }
        if ($scope.tabIndex == 1) {  //所有订单
          $scope.page = 0;
          $scope.orderList = [];
        }
      }
      if ($scope.tabIndex == 0 || $scope.unfinishedpage == 0) {//未完成订单
        $scope.unfinishedpage++;
      }
      if ($scope.tabIndex == 1 || $scope.page == 0) { //所有订单
        $scope.page++;
      }

      $scope.params = {
        page: $scope.tabIndex == 0 ? $scope.unfinishedpage : $scope.page,//页码
        size: 20//条数
      }

      $scope.datas = {
        DJNo: "",//登记单号(可为空)
        Type: "",//类型1.登记信息 2.登记货源(可为空)
        ORuserid: "",//接单人
        userid: localStorage.getItem("userid"),//用户userid
        Category: "",//货物品类 多个用逗号隔开(可为空)
        HYType: "",//货物类别 0.未区分 1废料 2二手(可为空) 上门回收(2)接登记信息（0）的单;货场(3)接废料（1）二手商家（4）接二手的(2)
        State: $scope.tabIndex == 0 ? "1,2,3,4,5" : "",//状态 0.已关闭 1.审核不通过 2.未审核 3.审核通过（待接单） 4.已接单 (待收货) 5.已收货（待付款） 6.已付款（待评价） 7.已评价 (可为空)
        longt: "", //当前经度（获取距离）(可为空)
        lat: "",//当前纬度（获取距离）(可为空)
        expiry: ""//小时 取预警数据 订单预警数据（72小时截至马上过期的（expiry=3表示取3小时内）
      }
      OrderService.getDengJiList($scope.params, $scope.datas).success(function (data) {
        if ($scope.tabIndex == 0) {//未完成订单
          $scope.isNotunfinishedData = false;
          if (data.data == null || data.data.data_list.length == 0) {
            $scope.isNotunfinishedData = true;
            return;
          }
        }
        if ($scope.tabIndex == 1) {//所有订单
          $scope.isNotData = false;
          if (data.data == null || data.data.data_list.length == 0) {
            $scope.isNotData = true;
            return;
          }
        }
        angular.forEach(data.data.data_list, function (item) {
          if ($scope.tabIndex == 0) {//未完成订单
            $scope.unfinishedorderList.push(item);
          }
          if ($scope.tabIndex == 1) {//所有订单
            $scope.orderList.push(item);
          }

        })
        if ($scope.tabIndex == 0) {//未完成订单
          $scope.unfinishedtotal = data.data.page_count;
        }
        if ($scope.tabIndex == 1) {//所有订单
          $scope.total = data.data.page_count;
        }

        $ionicScrollDelegate.resize();//添加数据后页面不能及时滚动刷新造成卡顿
      }).finally(function () {
        $scope.$broadcast('scroll.refreshComplete');
        $scope.$broadcast('scroll.infiniteScrollComplete');
      })
    }


    //左右滑动列表
    $scope.slideChanged = function (index) {
      $scope.tabIndex = index;
      $scope.getOrderList(0); //获取订单数据
    };
    //点击选项卡
    $scope.selectedTab = function (index) {
      $scope.tabIndex = index;
      //滑动的索引和速度
      $ionicSlideBoxDelegate.$getByHandle("slidebox-myorderlist").slide(index)
    }

    $scope.$on('$ionicView.afterEnter', function () {
      if ($rootScope.tabMyOrderIndex != 0 && ismyorderdetails) {
        $scope.selectedTab($rootScope.tabMyOrderIndex);
      } else {
        $scope.getOrderList(0);//查询登记信息/货源信息分页列刷新
      }
    });

    //关闭订单
    $scope.closeOrder = function (djno) {
      event.preventDefault();
      // $state.go("cancelorder", {no: djno, type: 2});//订单类型 1.回收单 2.登记单
      CommonService.showConfirm('操作提示', '您是否要关闭此订单?"是"点击"确定",否则请点击"取消"', '确定', '取消', '', 'close', function () {
        OrderService.cancelDengJiOrder({djno: djno}).success(function (data) {
          if (data.code == 1001) {
            $scope.getOrderList(0);//查询登记信息/货源信息分页列刷新
            CommonService.platformPrompt("订单关闭成功", "close")
          } else {
            CommonService.platformPrompt(data.message, "close")
          }
        })
      });
    }

  })

  //我的订单详情页面
  .controller('MyOrderDetailsCtrl', function ($scope, $stateParams, CommonService, OrderService) {
    //是否登录
    if (!CommonService.isLogin(true)) {
      return;
    }
    $scope.getMyOrderDetail = function () {
      OrderService.getDengJiDetail({djno: $stateParams.no}).success(function (data) {
        if (data.code == 1001) {
          $scope.orderDetail = data.data;
        } else {
          CommonService.platformPrompt(data.message, "close");
        }

      }).then(function () {
        //获取评论内容
        OrderService.getComment({djno: $scope.orderDetail.djno}).success(function (data) {
          $scope.commentInfo = data.data;
        })
      })
    }
    $scope.getMyOrderDetail();
    //关闭订单
    $scope.closeOrder = function (djno) {
      event.preventDefault();
      // $state.go("cancelorder", {no: djno, type: 2});//订单类型 1.回收单 2.登记单
      CommonService.showConfirm('操作提示', '您是否要关闭此订单?"是"点击"确定",否则请点击"取消"', '确定', '取消', '', 'close', function () {
        OrderService.cancelDengJiOrder({djno: djno}).success(function (data) {
          if (data.code == 1001) {
            $scope.getMyOrderDetail();//订单详情刷新
            CommonService.platformPrompt("订单关闭成功", "close")
          } else {
            CommonService.platformPrompt(data.message, "close")
          }
        })
      });
    }
  })

  //我的订单预警页面
  .controller('OrderWarningCtrl', function ($scope, $rootScope, $state, $stateParams, CommonService, OrderService, $ionicSlideBoxDelegate, $ionicScrollDelegate) {
    var user = JSON.parse(localStorage.getItem("user"));//用户信息
    $scope.orderList = [];
    $scope.page = 0;
    $scope.total = 1;
    $scope.getOrderList = function () { //查询接单收货/货源归集分页列
      if (arguments != [] && arguments[0] == 0) {
        $scope.page = 0;
        $scope.orderList = [];
      }
      $scope.page++;
      $scope.params = {
        page: $scope.page,//页码
        size: 20//条数
      }
      $scope.datas = {
        DJNo: "",//登记单号(可为空)
        Type: "",//类型1.登记信息 2.登记货源(可为空)
        userid: "",//用户userid
        Category: "",//货物品类 多个用逗号隔开(可为空)
        HYType: "",//货物类别 0.未区分 1废料 2二手(可为空) 上门回收(2)接登记信息（0）的单;货场(3)接废料（1）二手商家（4）接二手的(2)
        State: "4",//状态 0.已关闭 1.审核不通过 2.未审核 3.审核通过（待接单） 4.已接单 (待收货) 5.已收货（待付款） 6.已付款（待评价） 7.已评价 (可为空)
        longt: localStorage.getItem("longitude") || "", //当前经度（获取距离）(可为空)
        lat: localStorage.getItem("latitude") || "",//当前纬度（获取距离）(可为空)
        ORNO: "",//接单单号(可为空)
        ORuserid: localStorage.getItem("userid"),//接单人(不能为空)
        expiry: 24 //小时 取预警数据 订单预警数据（72小时截至马上过期的（expiry=3表示取3小时内））
      }

      OrderService.getOrderReceiptList($scope.params, $scope.datas).success(function (data) {
        $scope.isNotData = false;
        if (data.data == null || data.data.data_list.length == 0) {
          $scope.isNotData = true;
          return;
        }
        angular.forEach(data.data.data_list, function (item) {
          $scope.orderList.push(item);
        })
        $scope.total = data.data.page_count;
        $ionicScrollDelegate.resize();//添加数据后页面不能及时滚动刷新造成卡顿
      }).finally(function () {
        $scope.$broadcast('scroll.refreshComplete');
        $scope.$broadcast('scroll.infiniteScrollComplete');
      })
    }

    $scope.getOrderList(0);//查询登记信息/货源信息分页列刷新


    //联系他
    $scope.relation = function (phonenumber) {
      event.preventDefault();
      window.open('tel:' + phonenumber);
    }
    //去收货
    $scope.recycle = function (orno, djno, type, userid, amount, name, productname, hytype) {
      OrderService.torecycle(user, orno, djno, type, userid, amount, name, productname, hytype);
    }

    //导航
    $scope.navigation = function (longitude, latitude) {
      event.preventDefault();
      $state.go("navigation", {longitude: longitude, latitude: latitude})
    }

    //去付款
    $scope.topay = function (type, djno, orno, fromuser, touser, amount, name, informationmoney) {
      OrderService.topay(type, djno, orno, fromuser, touser, amount, name, informationmoney);
    }
  })

  //我的回收录单页面
  .controller('RecycleOrderCtrl', function ($scope, $state, $stateParams, CommonService, OrderService) {
    $scope.orderinfo = JSON.parse($stateParams.orderinfo);
    $scope.productLists = [];//产品品类
    $scope.productList = [];
    //获取产品品类
    OrderService.getProductList({ID: "", Name: ""}).success(function (data) {
      //console.log(data);
      if (data.code == 1001) {
        //$scope.productList = data.data;
        angular.forEach(data.data, function (item) {
          if (("," + $scope.orderinfo.productname + ",").indexOf("," + item.name + ",") >= 0) {
            item.checked = true;
          }
          $scope.productList.push(item);
        });
        $scope.ischecked = true;
        // if ($scope.productList.length == 1) {//只有一个直接默认选择
        //   $scope.productList[0].checked = true;
        //   $scope.ischecked = true;
        // }
      } else {
        CommonService.platformPrompt(data.message, 'close');
      }
    }).then(function () {
      OrderService.getProductListIsth({grpid: '', isth: 0}).success(function (data) {
        $scope.data = data;
      }).then(function () {
        if ($scope.data.code == 1001) {
          // var items = item;
          // items.details = $scope.data.data;
          // $scope.productLists.push(items);

          angular.forEach($scope.productList, function (item) { //根据产品品类及是否统货取产品列表(最新报价)

            item.details = [];
            angular.forEach($scope.data.data, function (items, index) {
              if (item.grpid == items.grpid) {
                item.details.push(items);
                //$scope.data.data.splice(index);
              }
            });
            $scope.productLists.push(item);
          });
        }

      });


      // $scope.productList = $scope.productLists;

      $scope.checkChecded = function () {
        CommonService.checkChecded($scope, $scope.productList);
      }

    });
    //回收录单选择下一步
    $scope.recycleNext = function () {
      $state.go("recyclewrite", {
        orderinfo: JSON.stringify($scope.orderinfo),
        item: JSON.stringify($scope.productLists)
      })
    }
  })

  //回收数量以及报价
  .controller('RecycleWriteCtrl', function ($scope, $state, $stateParams, CommonService, OrderService) {
    $scope.productList = JSON.parse($stateParams.item);
    $scope.orderinfo = JSON.parse($stateParams.orderinfo);


    //回收录单提交付款
    var details = [];
    $scope.recycleWriteNext = function () {
      //回收记录明细数据筛选
      angular.forEach($scope.productList, function (item) {
        if (item.checked) {
          angular.forEach(item.details, function (items) {
            if (items.checked) {
              details.push({
                grpid: items.grpid,
                proid: items.id,
                proname: items.name,
                unit: items.unit,
                num: items.recyclenum,
                price: items.recycleprice
              })
              $scope.orderinfo.amount += items.recyclenum * items.recycleprice;//总价格
            }
          })
        }
      })
      //添加接单收货/货源归集(添加回收时明细不能为空，接单时明细为空)
      $scope.huishoudata = {
        orno: $scope.orderinfo.orno,//接单收货单号(回收时不能为空)
        oruserid: localStorage.getItem("userid"),//接单人账号userid 必填参数
        djno: $scope.orderinfo.djno,//登记信息单号 必填参数
        userid: $scope.orderinfo.userid,//登记信息人账号 必填参数
        type: $scope.orderinfo.type,//类型 1.接单收货（回收者接的是“登记信息”） 2.货源归集（货场接的是“登记货源”）  必填参数
        orstate: 5,//状态 0已取消 1审核不通过 2未审核（待审核） 3审核通过 4回收不通过 5回收未审核 6回收审核通过 (接单时为2，回收时为5) 7已过期 必填参数
        details: details //接单回收记录明细数据
      }

      OrderService.addOrderReceipt($scope.huishoudata).success(function (data) {
        if (data.code == 1001) {
          CommonService.platformPrompt("回收单提交成功", "close");
          //去付款
          var json = {
            type: $scope.orderinfo.type,
            djno: $scope.orderinfo.djno,
            orno: $scope.orderinfo.orno,
            fromuser: localStorage.getItem("userid"),
            touser: $scope.orderinfo.userid,
            amount: $scope.orderinfo.amount,
            name: $scope.orderinfo.name,
            hytype: $scope.orderinfo.hytype
          }
          $state.go("payment", {orderinfo: JSON.stringify(json)})

        } else {
          CommonService.platformPrompt(data.message, "close");
        }
      })
    }
  })

  //付款页面
  .controller('PaymentCtrl', function ($scope, $stateParams, CommonService, OrderService, AccountService) {
    $scope.orderinfo = JSON.parse($stateParams.orderinfo);
    $scope.vcode = "";//短信验证码
    $scope.mobilePhone;//手机号码
    $scope.verifycode;//验证码
    $scope.paraclass = true;//启用获取验证码
    //调出确认付款面板
    CommonService.customModal($scope, 'templates/modal/pay_sure.html');
    $scope.pay = { //支付相关
      choice: 1//选择支付方式默认支付方式1. 现金支付2. 在线支付
    }
    //获得订单详情
    OrderService.getOrderReceiptDetail({orno: $scope.orderinfo.orno}).success(function (data) {
      //console.log(data);
      if (data.code == 1001) {
        $scope.orderDetail = data.data;
        $scope.orderinfo.amount = data.data.totalprice;
      } else {
        CommonService.platformPrompt(data.message, "close");
      }
    })
    //获得余额
    OrderService.getOrderSum({userid: localStorage.getItem("userid"), expiry: 24}).success(function (data) {
      if (data.code == 1001) {
        $scope.orderSum = data.data;
      } else {
        CommonService.platformPrompt(data.message, 'close');
      }
    });
    //获取验证码
    $scope.getVerifyCode = function () {
      CommonService.getVerifyCode($scope, $scope.mobilePhone);
    }
    $scope.inputCode = function (param) {

      if (param == "-1" && $scope.vcode.length > 1) {
        $scope.vcode = $scope.vcode.substr(0, $scope.vcode.length - 1);
      } else if (param == "-1" && $scope.vcode.length == 1) {
        $scope.vcode = "";
      } else if (param != "-1") {
        if ($scope.vcode.length < 6) {
          $scope.vcode += param;
        }
      }
      if ($scope.vcode.length == 6 && $scope.verifycode == $scope.vcode) {
        $scope.confirmPayment();
      } else if ($scope.vcode.length == 6 && $scope.verifycode != $scope.vcode) {
        CommonService.platformPrompt("验证码不正确,请重新输入！", 'close');
        return;
      }
    }
    //提交付款操作
    $scope.submitPayment = function () {
      if ($scope.pay.choice == 1) {
        $scope.confirmPayment();
      } else {
        AccountService.getUser({userid: localStorage.getItem("userid")}).success(function (data) {
          if (data.code == 1001) {
            $scope.mobilePhone = data.data.mobile;
            var certstate = data.data.certstate;//获取认证状态参数
            //ubstr(start,length)表示从start位置开始，截取length长度的字符串
            $scope.phonestatus = certstate.substr(0, 1);//手机认证状态码
          } else {
            CommonService.platformPrompt('获取信息失败，请重试！', 'close');
            return;
          }

        }).then(function () {
          if ($scope.phonestatus == "2" && $scope.mobilePhone) {
            $scope.getVerifyCode();
            $scope.modal.show();
            return;
          } else {
            CommonService.showConfirm('付款提示', '尊敬的用户,您好！为了您的账户安全，请先进行手机认证！', '手机认证', '暂不认证', 'bindingmobile', 'close', '', {status: 0});
            return;
          }

        });


      }
    }
    //确认支付
    $scope.confirmPayment = function () {
      $scope.data = {
        ordertype: $scope.orderinfo.type, //type类型 1.接单收货（回收者接的是“登记信息”） 2.货源归集（货场接的是“登记货源”）
        orderno: $scope.orderinfo.djno,//登记号
        fromuser: $scope.orderinfo.fromuser,//付款方
        touser: $scope.orderinfo.touser,//收款方
        amount: $scope.orderinfo.amount,//订单金额
        fwamount: 0,//服务费金额
        paymentmethod: $scope.pay.choice //支付方式1.	现金支付2.	在线支付
      }

      //回收付款
      $scope.payOrderReceipt = function () {
        OrderService.payOrderReceipt($scope.data).success(function (data) {
          if (data.code == 1001) {
            CommonService.platformPrompt("回收付款成功", "orderdetails", {
              no: $scope.orderinfo.orno,
              type: 2,
              hytype: $scope.orderinfo.hytype
            })
          } else {
            CommonService.platformPrompt(data.message, "close")
          }
        })
      }
      if ($scope.orderinfo.type == 1 && $scope.orderDetail.informationmoney) { //如果是登记信息（type=1）的情况，要提示他的“信息费金额”
        CommonService.showConfirm('支付提示', '温馨提示:此订单的信息费金额为 ' + $scope.orderDetail.informationmoney + ' 元 , 支付请点击"确定",否则请点击"取消"', '确定', '取消', '', 'close', function () {
          $scope.payOrderReceipt()
        });
      } else {
        $scope.payOrderReceipt()
      }


    }
  })

  //导航页面
  .controller('NavigationCtrl', function ($scope, $stateParams, CommonService, $window, OrderService) {
    //$window.location.href="http://m.amap.com/navi/?start=116.403124,39.940693&dest=116.481488,39.990464&destName=阜通西&naviBy=car&key=0ffd53eb83c2cea2181a5fbfa9f3c311"
    // window.open("http://m.amap.com/navi/?start=116.403124,39.940693&dest=116.481488,39.990464&destName=阜通西&naviBy=car&key=0ffd53eb83c2cea2181a5fbfa9f3c311")
    /*    CommonService.getLocation(function () {*/
    //基本地图加载
    var map = new AMap.Map("gaode-map", {
      resizeEnable: true,
      center: [localStorage.getItem("longitude") ? Number(localStorage.getItem("longitude")).toFixed(6) : 114.0557100, localStorage.getItem("latitude") ? Number(localStorage.getItem("latitude")).toFixed(6) : 22.5224500],//地图中心点
      zoom: 13 //地图显示的缩放级别
    });
    //构造路线导航类
    var driving = new AMap.Driving({
      map: map,
      panel: "panel"
    });
    // 根据起终点经纬度规划驾车导航路线
    driving.search(new AMap.LngLat(localStorage.getItem("longitude") ? Number(localStorage.getItem("longitude")).toFixed(6) : 114.0557100, localStorage.getItem("latitude") ? Number(localStorage.getItem("latitude")).toFixed(6) : 22.5224500), new AMap.LngLat($stateParams.longitude ? Number($stateParams.longitude).toFixed(6) : 114.0557100, $stateParams.latitude ? Number($stateParams.latitude).toFixed(6) : 22.5224500));
    /*   });*/

  })

  //通知消息列表
  .controller('NewsCtrl', function ($scope, $state, CommonService, NewsService, $ionicScrollDelegate) {
    //是否登录
    if (!CommonService.isLogin(true)) {
      return;
    }
    $scope.newsList = [];
    $scope.page = 0;
    $scope.total = 1;
    $scope.newslist = function () {
      if (arguments != [] && arguments[0] == 0) {
        $scope.page = 0;
        $scope.newsList = [];
      }
      $scope.page++;
      $scope.params = {
        page: $scope.page,//页码
        size: 20,//条数
        userid: localStorage.getItem("userid")//用户id
      }
      NewsService.getNewsList($scope.params).success(function (data) {
        $scope.isNotData = false;
        if (data == null || data.data.data_list == 0) {
          $scope.isNotData = true;
          return
        }
        angular.forEach(data.data.data_list, function (item) {
          $scope.newsList.push(item);
        })
        $scope.total = data.data.page_count;
        $ionicScrollDelegate.resize();//添加数据后页面不能及时滚动刷新造成卡顿
      }).finally(function () {
        $scope.$broadcast('scroll.refreshComplete');
        $scope.$broadcast('scroll.infiniteScrollComplete');
      })
    }

    $scope.newslist(0);//新闻加载刷新
    $scope.updateNewsLook = function (look, id) { //设置已读未读
      $scope.lookparams = {
        look: look,
        ids: id
      }
      NewsService.updateNewsLook($scope.lookparams).success(function (data) {
        if (data.code == 1001) {
          $scope.newslist(0);
        } else {
          CommonService.platformPrompt(data.message, 'close');
        }

      })
    }
    //订单详情
    $scope.newsDetails = function (relateno, id,receipttype) {
      if (relateno) {
        $scope.updateNewsLook(1, id)
        if(receipttype==2)
        {
          $state.go("orderdetails", {no: relateno,type:1,hytype:0})
        }
        else {
          $state.go("myorderdetails", {no: relateno})
        }

      }
    }
  })

  //我的设置页面
  .controller('AccountCtrl', function ($scope, $rootScope, BoRecycle, CommonService, AccountService, OrderService, WeiXinService,AddressService) {
    //是否登录
    if (!CommonService.isLogin(true)) {
      return;
    }
    //判断是否是WebView或微信，如果是则显示广告
    if (ionic.Platform.isWebView()) {
      $scope.isWebView = true;
    }
    $rootScope.isinvitecode="0";
    $rootScope.areaname="沈阳";
    //获取当前位置 定位
    $scope.location = function () {
      CommonService.getLocation(function () {
        //当前位置 定位
        AccountService.getCurrentCity({
          key: BoRecycle.gaoDeKey,
          location: Number($scope.handlongitude || localStorage.getItem("longitude")).toFixed(6) + "," + Number($scope.handlatitude || localStorage.getItem("latitude")).toFixed(6),
          radius: 3000,//	查询POI的半径范围。取值范围：0~3000,单位：米
          extensions: 'all',//返回结果控制
          batch: false, //batch=true为批量查询。batch=false为单点查询
          roadlevel: 0 //可选值：1，当roadlevel=1时，过滤非主干道路，仅输出主干道路数据
        }).success(function (data) {
          var addressComponent = data.regeocode.addressComponent;
          $scope.city = addressComponent.city;
          $rootScope.areaname=addressComponent.city;
        }).then(function () {
          AddressService.getAddressBySSX({
            ssx: $scope.city,
            level:2
          }).success(function (data) {
            if (data.code == 1001) {
              $rootScope.isinvitecode = data.data.isinvitecode;
            } else {
              $rootScope.isinvitecode = "0";
            }
          })
        })
      })

    }
    //页面加载完成自动定位
    $scope.$on('$ionicView.afterEnter', function () {
      $scope.location();//自动定位
    });
    //调出分享面板
    CommonService.customModal($scope, 'templates/modal/share.html');

    //根据会员ID获取会员账号基本信息
    AccountService.getUser({userid: localStorage.getItem("userid")}).success(function (data) {
      if (data.code == 1001) {
        $rootScope.userdata = data.data;
        localStorage.setItem("user", JSON.stringify(data.data));
        var services = data.data.services;
        //用户会员类型  0 无 1信息提供者  2回收者
        var usertype = (services == null || services.length == 0) ? 0 : (services.length == 1 && services.indexOf('1') != -1) ? 1 : 2;
        localStorage.setItem("usertype", usertype);
        $scope.usertype = usertype;
      } else {
        CommonService.platformPrompt(data.message, 'close');
      }
    }).then(function () {
      if (WeiXinService.isWeiXin()) { //如果是微信
        $scope.isWeiXin = true;
        if($scope.usertype==1){
          CommonService.shareActionSheet("提供回收信息赚现金，首次下单额外奖励15元", "人人提供信息得信息费，信息越多赚钱越多，邀请使用成功登记回收信息得现金奖励", BoRecycle.mobApi + '/#/download', '');
        }else{
          CommonService.shareActionSheet("告别风吹日晒的蹲点回收，为回收人员增加真实货源", "下载“收收”在家接单轻松回收，告别蹲点回收，几千万回收人员的必备工具", BoRecycle.mobApi + '/#/download', '');
        }
        //CommonService.shareActionSheet($scope.helpdata.Title, $scope.helpdata.Abstract, BoRecycle.mobApi + '/#/download', '');
      }
      //调用分享面板
      $scope.shareActionSheet = function (type) {
        if ($scope.usertype == 1) {
          CommonService.shareActionSheet("提供回收信息赚现金，首次下单额外奖励15元", "人人提供信息得信息费，信息越多赚钱越多，邀请使用成功登记回收信息得现金奖励", BoRecycle.mobApi + '/#/download', '', type);
        } else {
          CommonService.shareActionSheet("告别风吹日晒的蹲点回收，为回收人员增加真实货源", "下载“收收”在家接单轻松回收，告别蹲点回收，几千万回收人员的必备工具", BoRecycle.mobApi + '/#/download', '', type);
        }
      }
    });



//获得我的里面待处理和预警订单数 银行卡以及余额
    OrderService.getOrderSum({userid: localStorage.getItem("userid"), expiry: 24}).success(function (data) {
      if (data.code == 1001) {
        $scope.orderSum = data.data;
        $rootScope.trzaccount=data.data.trzaccount;
      } else {
        CommonService.platformPrompt(data.message, 'close');
      }
    })

  })

  //账号信息
  .controller('AccountInfoCtrl', function ($scope, $rootScope, CommonService, BoRecycle, AccountService, AddressService) {

    //城市选择modal
    CommonService.customModal($scope, 'templates/modal/citymodal.html');

    AccountService.getUser({userid: localStorage.getItem("userid")}).success(function (data) {
      if (data.code == 1001) {
        localStorage.setItem('user', JSON.stringify(data.data));
        $rootScope.userinfo = data.data;
        var certstate = data.data.certstate;//获取认证状态参数
        //ubstr(start,length)表示从start位置开始，截取length长度的字符串
        $scope.phonestatus = certstate.substr(0, 1);//手机认证状态码
        var services = $rootScope.userinfo.services;
        var usertype = (services == null || services.length == 0) ? 0 : (services.length == 1 && services.indexOf('1') != -1) ? 1 : 2;//用户会员类型  0 无 1信息提供者  2回收商
        $scope.usertype = usertype;//会员类型
        $scope.isOrganizingData = $rootScope.userinfo.userext == null ? false : true;//是否完善资料
        $scope.services = [];
        /*        angular.forEach($rootScope.userinfo.services, function (item) {*/
        if (usertype == 0) {
          $scope.services.push("");
        } else if (usertype == 1) {
          $scope.services.push("信息提供者");
        } else {
          $scope.services.push("回收商");
        }
        /*          if (item == 2) {
         $scope.services.push("上门回收者")
         }
         if (item == 3) {
         $scope.services.push("货场")
         }
         if (item == 4) {
         $scope.services.push("二手商家")
         }*/

        /*      })*/
        $scope.servicesstr = $scope.services.join(",")
        //  $scope.isprovider = $rootScope.userinfo.services.indexOf('2') != -1 && $rootScope.userinfo.services.indexOf('3') != -1 && $rootScope.userinfo.services.indexOf('4') != -1 ? true : false
      } else {
        CommonService.platformPrompt('获取用户信息失败', 'close');
      }

    })

    //获取当前位置 定位
    $scope.cityName = "深圳市"
    $scope.location = function () {
      CommonService.getLocation(function () {
        //当前位置 定位
        AccountService.getCurrentCity({
          key: BoRecycle.gaoDeKey,
          location: Number(localStorage.getItem("longitude")).toFixed(6) + "," + Number(localStorage.getItem("latitude")).toFixed(6),
          radius: 3000,//	查询POI的半径范围。取值范围：0~3000,单位：米
          extensions: 'all',//返回结果控制
          batch: false, //batch=true为批量查询。batch=false为单点查询
          roadlevel: 0 //可选值：1，当roadlevel=1时，过滤非主干道路，仅输出主干道路数据
        }).success(function (data) {
          var addressComponent = data.regeocode.addressComponent;
          $scope.cityName = addressComponent.city ? addressComponent.city : addressComponent.province;

        })

      })

    }
    //页面加载完成自动定位
    $scope.$on('$ionicView.afterEnter', function () {
      $scope.location();//自动定位
    })
    //modal打开 加载数据
    $scope.$on('modal.shown', function () {
      if ($scope.modalName == 'citymodal') {
        AccountService.selectCity($scope); //选择城市
      }
    })

    //点击选择城市
    $scope.openCustomModal = function () {
      $scope.city = {};//城市相关json数据
      $scope.modalName = 'citymodal';
      $scope.modal.show();
    }

    //修改回收区域
    $scope.user = {};//用户信息
    $scope.modifyAddressSubmit = function (id,code) {
      var user = JSON.parse(localStorage.getItem("user"));//用户信息

      $scope.user.username = user.userext.name;//用户名
      $scope.user.mobile = user.userext.phone;//手机号码
      $scope.user.userid = localStorage.getItem("userid");//用户id
      $scope.user.services = user.services;//用户类型数组key
      $scope.user.recoveryqty = user.userext.recovery;//月回收量
      $scope.user.grps = user.userext.prodgroup;
      $scope.user.addrcode = id;
      $scope.user.areacode = code;
      AccountService.setUserInfo($scope.user).success(function (data) {
        if (data.code == 1001) {
          CommonService.platformPrompt("修改回收区域成功", '');
        } else {
          CommonService.platformPrompt(data.message, 'close');
        }

        if (data.code == 1001 && localStorage.getItem("userid")) {  //更新用户信息
          //根据会员ID获取会员账号基本信息
          AccountService.getUser({userid: localStorage.getItem("userid")}).success(function (datas) {
            if (datas.code == 1001) {
              $rootScope.userinfo = datas.data;
              localStorage.setItem("user", JSON.stringify(datas.data));
              var services = datas.data.services;
              //用户会员类型  0 无 1信息提供者  2回收者
              localStorage.setItem("usertype", (services == null || services.length == 0) ? 0 : (services.length == 1 && services.indexOf('1') != -1) ? 1 : 2);
            }
          })
        }
      })
    }
  })

  //修改用户头像图片
  .controller('UploadHeadCtrl', function ($scope, $rootScope, $stateParams, $state, CommonService) {
    //上传图片数组集合
    $scope.imageList = [];
    $scope.ImgsPicAddr = [];//图片信息数组
    $scope.uploadtype = 5;//上传媒体操作类型 1.卖货单 2 供货单 3 买货单 4身份证 5 头像
    $scope.uploadName = 'uploadhead';//上传图片的类别 用于区分
    $scope.figureurl = $stateParams.figure;
    $scope.uploadActionSheet = function () {
      CommonService.uploadActionSheet($scope, 'User', true);
    }
  })

  //修改用户信息
  .controller('UpdateUserCtrl', function ($scope, $rootScope, $stateParams, $state, CommonService, AccountService) {
    $scope.type = $stateParams.type;
    $scope.value = $stateParams.value;

    $scope.user = {};
    $scope.updateUser = function () {
      $scope.params = {
        userid: localStorage.getItem("userid"),
        sex: $scope.user.sex,
        nickname: $scope.user.nickname
      }
      if ($scope.type == 'nickname') { //修改昵称
        AccountService.modifyNickname($scope.params).success(function (data) {
          CommonService.platformPrompt(data.message, data.code = 1001 ? '' : 'close');
        })
      } else if ($scope.type == 'sex') {//修改性别
        AccountService.modifySex($scope.params).success(function (data) {
          CommonService.platformPrompt(data.message, data.code = 1001 ? '' : 'close');
        })
      }
    }

  })

  //地址详细列表
  .controller('MyAddressCtrl', function ($scope, $state, $rootScope, $ionicHistory, CommonService, AddressService) {
    if ($ionicHistory.backView() && $ionicHistory.backView().stateName != 'tab.account') {
      $scope.isSelect = true;
      $scope.selectAddress = function (item) {
        $rootScope.addrlistFirst = {}
        $rootScope.addrlistFirst = item;
        $ionicHistory.goBack();
      }
    }
    $scope.addrlist = [];

    $scope.getAddrlist = function () {

      $scope.params = {
        userlog: localStorage.getItem("userid")
      }
      //获取用户常用地址
      AddressService.getAddrList($scope.params).success(function (data) {
        $scope.isNotData = false;
        if (data.data == null || data.data.length == 0) {
          $scope.isNotData = true;
          $scope.addrlist = [];
          $rootScope.addrlistFirst = {};///无交易地址的时候清除数据
          return;
        }
        $scope.addrlist = data.data;
      }).finally(function () {
        $scope.$broadcast('scroll.refreshComplete');

      })
    }
    $scope.getAddrlist(0);//交易地址加载刷新

    //设置默认地址
    $scope.setDefaultAddr = function (addrid) {
      $scope.defaultparams = {
        id: addrid,
        userlogid: localStorage.getItem("userid")
      }
      AddressService.setDefualtAddr($scope.defaultparams).success(function (data) {
        CommonService.platformPrompt(data.message, 'close');
        $scope.getAddrlist(0);//重新加载列表
      })
    }

    //删除用户常用地址
    $scope.deleteAddr = function (addrid) {
      if (JSON.parse(localStorage.getItem("user")).grade == 5 && status == 1) {//当会员是供货商（=5）时，默认地址不能删除
        CommonService.platformPrompt('供货商会员不能删除默认地址', 'close');
        return;
      }
      CommonService.showConfirm('收收提示', '您是否要删除此地址信息?"是"点击"确定",否则请点击"取消"', '确定', '取消', '', 'close', function () {
        $scope.delparams = {
          id: addrid,
          userid: localStorage.getItem("userid")
        }
        AddressService.deleteAddr($scope.delparams).success(function (data) {
          CommonService.platformPrompt(data.message, 'close');
          $scope.getAddrlist(0);//重新加载列表
        })
      })
    }
    //修改地址信息
    $scope.updateaddress = function (item) {
      $rootScope.addressitem = item;
      $state.go('addaddress');
    }

  })

  //添加地址
  .controller('AddAddressCtrl', function ($scope, $rootScope, $state, CommonService, AccountService, AddressService, BoRecycle, $ionicHistory) {
    CommonService.customModal($scope, 'templates/modal/addressmodal.html');
    CommonService.customModal($scope, 'templates/modal/nearbyaddressmodal.html', 1);
    //去掉默认的只在下单的地方去掉，会员中心要显示
    /*
     if ($ionicHistory.backView().stateName == 'address') {
     $scope.isshowstatus = true;
     } else {
     $scope.isshowstatus = false;
     }
     */
    $scope.addrinfo = {};
    $scope.addrinfoother = {};
    $scope.buttonText = '添加';
    $scope.isshowstatus = true;
    $scope.addresspois = [];//附近地址数组
    //获取省市县
    $scope.getAddressPCCList = function (item) {
      AddressService.getAddressPCCList($scope, item)
    }

    //modal打开 加载数据
    $scope.$on('modal.shown', function () {
      if ($scope.modalName == 'addressmodal') {
        $scope.getAddressPCCList();
      }
    })

    //打开选择省市县modal
    $scope.openModal = function () {
      $scope.modalName = 'addressmodal'
      $scope.modal.show();
    }

    //打开附近地址modal
    $scope.openNearAddrModal = function () {
      $scope.location();//自动定位
      $scope.modal1.show();
    }

    // 选择打开附近地址
    $scope.getAddressPois = function (item) {
      // $scope.addrinfo.addr = item.name;
      $scope.longitude = item.location.split(",")[0];//经度
      $scope.latitude = item.location.split(",")[1];//纬度
      // $scope.modal1.hide();
      $scope.addrinfo.addressname= item.name;
    }
    $scope.searchaddrquery = function (addressname) {
      $scope.addrinfo.addr =addressname;
      $scope.modal1.hide();
    }

    //关键字搜索：通过用POI的关键字进行条件搜索，例如：肯德基、朝阳公园等；同时支持设置POI类型搜索，例如：银行称
    $scope.getPlaceBySearch = function (addrname) {
      AccountService.getPlaceBySearch({
        key: BoRecycle.gaoDeKey,
        keywords: addrname,//查询关键词
        city: $scope.city || "深圳",
        extensions: 'all'//返回结果控制
      }).success(function (data) {
        $scope.addresspois = data.pois;
      })
    }

    //获取当前位置 定位
    $scope.location = function () {
      CommonService.getLocation(function () {
        //当前位置 定位
        AccountService.getCurrentCity({
          key: BoRecycle.gaoDeKey,
          location: Number($scope.handlongitude || localStorage.getItem("longitude")).toFixed(6) + "," + Number($scope.handlatitude || localStorage.getItem("latitude")).toFixed(6),
          radius: 3000,//	查询POI的半径范围。取值范围：0~3000,单位：米
          extensions: 'all',//返回结果控制
          batch: false, //batch=true为批量查询。batch=false为单点查询
          roadlevel: 0//可选值：1，当roadlevel=1时，过滤非主干道路，仅输出主干道路数据
        }).success(function (data) {
          var addressComponent = data.regeocode.addressComponent;
          $scope.addresspois = data.regeocode.pois;
          $scope.city = addressComponent.city;
          $scope.ssx = addressComponent.province + addressComponent.city + addressComponent.district;//省市县
          $scope.addrinfo.addr = addressComponent.township + addressComponent.streetNumber.street;
        }).then(function () {
          AddressService.getAddressBySSX({ssx: $scope.ssx, level: 3}).success(function (data) {
            if (data.code == 1001) {
              $scope.addrareacountyone = data.data;
            } else {
              CommonService.platformPrompt(data.message, "close")
            }
          })
        })
      })

    }


    if ($rootScope.addressitem && $rootScope.addressitem.length != 0) {//是否是修改信息
      $scope.addressiteminfo = $rootScope.addressitem;
      $scope.addrinfo.username = $scope.addressiteminfo.UserName;
      $scope.addrinfo.mobile = $scope.addressiteminfo.MoTel;
      $scope.addresspcd = $scope.addressiteminfo.MergerName;
      $scope.addrinfo.addr = $scope.addressiteminfo.AddrDetail;
      $scope.addrinfoother.isstatus = $scope.addressiteminfo.Status == 1 ? true : false;
      $rootScope.addressitem = [];
      $scope.buttonText = '修改';
    } else {//增加自动默认地址
      $scope.addrinfoother.isstatus = true;
      //页面加载完成自动定位
      $scope.$on('$ionicView.afterEnter', function () {
        $scope.location();//自动定位
      })
    }
    //增加地址方法
    $scope.dealaddresssubmit = function () {
      $scope.addrinfo.addrid = $scope.addressiteminfo ? $scope.addressiteminfo.ID : null;//传入地址id 则是修改地址
      $scope.addrinfo.userid = localStorage.getItem("userid");//用户id
      $scope.addrinfo.addrcode = $scope.addrareacountyone ? $scope.addrareacountyone.ID : $scope.addressiteminfo.AddrCode;	//地区id
      $scope.addrinfo.areacode = $scope.addrareacountyone ? $scope.addrareacountyone.Code : $scope.addressiteminfo.AreaCode;	//地区id
      $scope.addrinfo.is_default = $scope.addrinfoother.isstatus ? 1 : 0;	//是否默认0-否，1-是
      $scope.addrinfo.lat = $scope.addrareacountyone ? $scope.latitude || localStorage.getItem("latitude") || $scope.addrareacountyone.Lat : $scope.latitude || localStorage.getItem("latitude") || $scope.addressiteminfo.Lat;	//纬度
      $scope.addrinfo.lng = $scope.addrareacountyone ? $scope.longitude || localStorage.getItem("longitude") || $scope.addrareacountyone.Lng : $scope.longitude || localStorage.getItem("longitude") || $scope.addressiteminfo.Lng; 	//经度
      AddressService.addAddress($scope.addrinfo).success(function (data) {
        if (data.code == 1001) {
          CommonService.platformPrompt('恭喜您 地址信息' + $scope.buttonText + '成功', '');
        } else {
          CommonService.platformPrompt(data.message, 'close');
        }
      })

    }
  })

  //我的设置
  .controller('SettingCtrl', function ($scope, $rootScope, $state, $ionicPlatform, BoRecycle, AccountService) {
    $scope.version = BoRecycle.version;
    $scope.securitylevel = '未知';
    if (localStorage.getItem("user")) {
      AccountService.getUser({userid: localStorage.getItem("userid")}).success(function (data) {
        if (data.code == 1001) {
          localStorage.setItem("user", JSON.stringify(data.data));
        }
      });
    }
    var certstate = JSON.parse(localStorage.getItem("user")).certstate;
    if (certstate.indexOf('2') == -1) {
      $scope.securitylevel = '极低';
    }
    if ((certstate.substr(0, 1) == 2 || certstate.substr(1, 1) == 2) || (certstate.substr(3, 1) == 2 || certstate.substr(4, 1) == 2)) {
      $scope.securitylevel = '中等';
    }
    if ((certstate.substr(0, 1) == 2 || certstate.substr(1, 1) == 2) && (certstate.substr(3, 1) == 2 || certstate.substr(4, 1) == 2)) {
      $scope.securitylevel = '较高';
    }
    if ((certstate.substr(0, 1) == 2 && certstate.substr(1, 1) == 2) && (certstate.substr(3, 1) == 2 || certstate.substr(4, 1) == 2)) {
      $scope.securitylevel = '高';
    }
    if ((certstate.substr(0, 1) == 2 && certstate.substr(1, 1) == 2) && (certstate.substr(3, 1) == 2 && certstate.substr(4, 1) == 2)) {
      $scope.securitylevel = '极高';
    }
    if (ionic.Platform.isWebView() && $ionicPlatform.is('ios')) {
      $scope.isIos = true;
    }
  })

  //设置安全
  .controller('AccountSecurityCtrl', function ($scope, $rootScope, $state, CommonService, AccountService) {
    AccountService.getUser({userid: localStorage.getItem("userid")}).success(function (data) {
      if (data.code == 1001) {
        localStorage.setItem('user', JSON.stringify(data.data));
        $rootScope.userinfo = data.data;
        var certstate = data.data.certstate;//获取认证状态参数
        $scope.certstatestatus = ['未认证', '认证中', '已认证', '未通过'];
        //ubstr(start,length)表示从start位置开始，截取length长度的字符串
        $scope.phonestatus = certstate.substr(0, 1);//手机认证状态码
        $scope.emailstatus = certstate.substr(1, 1);//邮箱认证状态码
        $scope.secrecystatus = certstate.substr(2, 1);//保密认证状态码
        $scope.identitystatus = certstate.substr(3, 1);//身份认证状态码
        $scope.companystatus = certstate.substr(4, 1);//企业认证状态码
        $scope.bankstatus = certstate.substr(5, 1);//银行账号状态码

      } else {
        CommonService.platformPrompt('获取用户信息失败', 'close');
      }

    })
  })

  //绑定手机
  .controller('BindingMobileCtrl', function ($scope, $rootScope, $state, $stateParams, CommonService, AccountService) {
    $scope.status = $stateParams.status;//认证状态
    $scope.user = {};//提前定义用户对象
    $scope.paracont = "获取验证码"; //初始发送按钮中的文字
    $scope.paraclass = false; //控制验证码的disable
    $scope.checkphone = function (mobilephone) {//检查手机号
      AccountService.checkMobilePhone($scope, mobilephone);
    }

    //获取验证码
    $scope.getVerifyCode = function () {
      CommonService.getVerifyCode($scope, $scope.user.mobile);
    }

    $scope.bindingMobileSubmit = function () {
      if ($scope.verifycode != $scope.user.code) {
        CommonService.platformPrompt("输入的验证码不正确", 'close');
        return;
      }
      //修改手机号码
      $scope.datas = {
        userid: localStorage.getItem("userid"),		//用户id
        mobile: $scope.user.mobile	//新用户号码
      }
      AccountService.authenticateMobile($scope.datas).success(function (data) {
        if (data.code == 1001) {
          CommonService.platformPrompt('绑定手机号成功', 'accountsecurity');
        } else {
          CommonService.platformPrompt(data.message, 'close');
        }

      })
    }
  })

  //绑定邮箱
  .controller('BindingEmailCtrl', function ($scope, $rootScope, $stateParams, CommonService, AccountService) {
    $scope.status = $stateParams.status;//认证状态
    $scope.email = {};//邮箱
    $scope.paracont = "获取验证码"; //初始发送按钮中的文字
    $scope.paraclass = false; //控制验证码的disable
    $scope.checkEmail = function (email) {//检查邮箱
      AccountService.checkMobilePhoneAndEmail($scope, email);
    }

    //获取验证码
    $scope.getVerifyCode = function () {
      CommonService.getVerifyCode($scope, $scope.email.email);
    }

    //发送验证邮件
    $scope.sendEmail = function () {
      if ($scope.verifycode != $scope.email.code) {
        CommonService.platformPrompt("输入的验证码不正确", 'close');
        return;
      }
      $scope.params = {
        userid: localStorage.getItem("userid"),		//用户id
        email: $scope.email.email//邮箱号
      }

      AccountService.authenticateEmail($scope.params).success(function (data) {
        if (data.code == 1001) {
          CommonService.platformPrompt('绑定邮箱成功', 'accountsecurity');
        } else {
          CommonService.platformPrompt(data.message, 'close');
        }
      })
    }
  })

  //实名认证
  .controller('RealNameCtrl', function ($scope, $rootScope, $stateParams, $ionicHistory, CommonService, AccountService) {
    $scope.status = $stateParams.status;//认证状态
    $scope.realname = {};//实名认证数据
    //上传图片数组集合
    $scope.imageList = [];
    $scope.ImgsPicAddr = [];//图片信息数组
    $scope.uploadName = 'realname';//上传图片的类别 用于区分
    $scope.uploadtype = 4;//上传媒体操作类型 1.卖货单 2 供货单 3 买货单 4身份证 5 头像
    $scope.paracont = "获取验证码"; //初始发送按钮中的文字
    $scope.paraclass = false; //控制验证码的disable
    $scope.serviceId = "";//e签宝服务id
    $scope.checkphone = function (mobilephone) {//检查手机号
      AccountService.checkMobilePhone($scope, mobilephone);
    }

    //e签宝验证码
    $scope.getVerifyCode = function () {
      event.preventDefault();
      CommonService.countDown($scope)
      //发送实名认证码，返回实名认证服务id,提交实名认证时需填写
      $scope.params = {
        idno: $scope.realname.idno,	//身份证号码
        mobile: $scope.realname.mobile,//手机号码
        name: $scope.realname.name,//真实姓名
        cardno: $scope.realname.idcardno //银行卡号
      }
      AccountService.authenticateSign($scope.params).success(function (data) {
        if (data.data.serviceId != null) {
          $scope.serviceId = data.data.serviceId;//e签宝服务id
        } else {
          CommonService.platformPrompt(data.data.msg, 'close')
        }
      })
    }

    //上传照片
    $scope.uploadActionSheet = function () {
      CommonService.uploadActionSheet($scope, 'User', true);
    }

    //获取实名认证信息
    if ($scope.status == 2) { //已认证
      $scope.params = {
        userid: localStorage.getItem("userid")
      }
      AccountService.getrealNameIdentity($scope.params).success(function (data) {
        if (data.code == 1001) {
          $scope.realname = data.data;

        } else {
          CommonService.platformPrompt(data.message, 'close');
        }

      })
    }

    //申请实名认证
    $scope.addCertificationName = function () {

      if ($scope.ImgsPicAddr.length == 0) {
        CommonService.platformPrompt("请先上传认证照片后再提交", 'close');
        return;
      }

      //提交实名认证，需要带入authenticate_sign 实名认证服务id
      $scope.datas = {
        userid: localStorage.getItem("userid"),	//当前用户userid
        name: $scope.realname.name,	    //姓名
        idno: $scope.realname.idno,	//身份证号码
        idcardno: $scope.realname.idcardno, //银行卡号
        mobile: $scope.realname.mobile,//手机号码
        serviceid: $scope.serviceId,//e签宝服务id
        code: $scope.realname.code,//e签宝验证码
        frontpic: $scope.ImgsPicAddr[0],//身份证照片地址。必须上传、上传使用公用上传图片接口
        state: "",//审核通过
        createdate: "",//日期
        remark: ""//审核备注
      }
      AccountService.realNameAuthenticate($scope.datas).success(function (data) {
        if (data.code == 1001) {

          var user = JSON.parse(localStorage.getItem('user'));
          var certstate = user.certstate.split('');//转换成数组
          certstate.splice(3, 1, 2)//将3这个位置的字符，替换成'xxxxx'. 用的是原生js的splice方法
          user.certstate = certstate.join(''); //将数组转换成字符串
          localStorage.setItem('user', JSON.stringify(user));
          if ($ionicHistory.backView() && $ionicHistory.backView().stateName == "organizingdata") { //上一级路由名称
            CommonService.platformPrompt('实名认证提交成功', 'tab.main');
          } else {
            CommonService.platformPrompt('实名认证提交成功', '');
          }
        } else {
          CommonService.platformPrompt(data.message, 'close');
        }
      })


    }
    //删除图片
    $scope.deleteImg=function () {
      $scope.imageList = [];
      $scope.ImgsPicAddr = [];//图片信息数组
    }
    $scope.bigImage = false;    //初始默认大图是隐藏的
    $scope.hideBigImage = function () {
      $scope.bigImage = false;
    };
    //点击图片放大
    $scope.shouBigImage = function (imageName) {  //传递一个参数（图片的URl）
      $scope.Url = imageName;                   //$scope定义一个变量Url，这里会在大图出现后再次点击隐藏大图使用
      $scope.bigImage = true;                   //显示大图
    };
  })

  //帮助与反馈
  .controller('HelpFeedBackCtrl', function ($scope, $rootScope, $state, CommonService, AccountService, MainService) {
    $scope.helpfeedback = {};
    //获取帮助中心列表
    $scope.helpfeedbacklist = [];


    //提交帮助反馈信息
    $scope.addHelpFeedBack = function () {
      $scope.datas = {
        Title: $scope.helpfeedback.title,//反馈标题
        Content: $scope.helpfeedback.content,//反馈内容
        User: localStorage.getItem("userid") //反馈用户
      }
      AccountService.addHelpFeedback($scope.datas).success(function (data) {
        if (data.code == 1001) {
          CommonService.platformPrompt('提交反馈成功', '');
        } else {
          CommonService.platformPrompt(data.message, 'close');
        }
      })
    }
  })

  //帮助信息共用模板
  .controller('HelpCtrl', function ($scope, $rootScope, $stateParams, $state, BoRecycle, CommonService, MainService, AccountService, WeiXinService) {
    //调出分享面板
    CommonService.customModal($scope, 'templates/modal/share.html');
    if (ionic.Platform.isWebView()) {
      $scope.isWebView = true;
    }
    $scope.getHelpDetails = function () {
      var id = $stateParams.ID;
      if (id == 11) {
        $scope.title = '登录注册协议';
      }
      if (id == 22) {
        $scope.title = '关于我们';
      }
      if (id == 23) {
        $scope.title = '我能做什么';
      }
      if (id == 24) {
        $scope.title = '我要如何做';
      }
      if (id == 25) {
        $scope.title = '用户类型';
      }
      //获取帮助中心详情
      $scope.params = {
        ID: id
      }
      AccountService.getHelpContent($scope.params).success(function (data) {
        $scope.helpdata = data.data;
        if (!$scope.title) {
          $scope.title = data.Title;
        }
      }).then(function () {
        if (WeiXinService.isWeiXin()) { //如果是微信
          $scope.isWeiXin = true;
          CommonService.shareActionSheet($scope.helpdata.Title, $scope.helpdata.Abstract, BoRecycle.mobApi + '/#/help/' + id, '');
        }
        //调用分享面板
        $scope.shareActionSheet = function (type) {
          CommonService.shareActionSheet($scope.helpdata.Title, $scope.helpdata.Abstract, BoRecycle.mobApi + '/#/help/' + id, '', type);
        }
      })
    }

    if (!localStorage.getItem("token") || ((new Date().getTime() - new Date(localStorage.getItem("expires_in")).getTime()) / 1000) > 7199) {//如果没有授权先授权 或者超过两个小时
      //接口授权
      MainService.authLogin({grant_type: 'client_credentials'}).success(function (data) {
        if (data.access_token) {
          localStorage.setItem("token", data.access_token);//公共接口授权token
          localStorage.setItem("expires_in", new Date());//公共接口授权token 有效时间
        }
      }).then(function () {
        $scope.getHelpDetails();
      })
    } else {
      $scope.getHelpDetails();
    }

  })

  //登记信息
  .controller('InformationCtrl', function ($scope,$rootScope, CommonService, BoRecycle, $ionicHistory, MainService, AccountService, AddressService, OrderService) {
    //是否登录
    if (!CommonService.isLogin(true)) {
      return;
    }
    $scope.$on('$ionicView.beforeEnter', function () {
      if (!$ionicHistory.backView()) { //有没有上级
        //如果授权超过两个小时 单独授权
        if (((new Date().getTime() - new Date(localStorage.getItem("expires_in")).getTime()) / 1000) > 7199) {
          //接口授权
          MainService.authLogin(
            {
              grant_type: 'password',
              username: localStorage.getItem("userid"),
              password: localStorage.getItem("usersecret")
            }).success(function (data) {
            if (data.access_token) {
              localStorage.setItem("token", data.access_token);//登录接口授权token
              localStorage.setItem("expires_in", new Date());//登录接口授权token 有效时间
            } else {
              CommonService.platformPrompt("获取登录接口授权token失败", 'close');
              return;
            }
          })
        }
      }
    })

    CommonService.customModal($scope, 'templates/modal/addressmodal.html');
    CommonService.customModal($scope, 'templates/modal/nearbyaddressmodal.html', 1);
    $scope.dengji = {};//登记信息
    $scope.dengji.acttype = 0;//默认活动类型是0  1以旧换新 当用户选择“以旧换新”时，先判断用户有没有“完善信息”和“实名认证”，如果没有则必须先“完善信息”和“实名认证”。
    $scope.addrinfo = {};
    $scope.addresspois = [];//附近地址数组
    $scope.productLists = [];//产品品类
    $scope.imgUrl = BoRecycle.imgUrl;//图片路径
//获取产品品类
    OrderService.getProductList({ID: "", Name: ""}).success(function (data) {
      if (data.code == 1001) {
        $scope.productList = data.data;
      } else {
        CommonService.platformPrompt(data.message, 'close');
      }
    }).then(function () {
      angular.forEach($scope.productList, function (item) { //根据产品品类及是否统货取产品列表(最新报价)
        OrderService.getProductListIsth({grpid: item.grpid, isth: 1}).success(function (data) {
          $scope.data = data;
        }).then(function () {
          if ($scope.data.code == 1001) {
            var items = item;
            items.details = $scope.data.data;
            $scope.productLists.push(items);
          }
        })
      })

      // $scope.productList = $scope.productLists;

      $scope.checkChecded = function () {
        $scope.recyclingCategory = [];//回收品类id数组
        $scope.recyclingCategoryName = [];//回收品类名字数组
        CommonService.checkChecded($scope, $scope.productList);
        angular.forEach($scope.productList, function (item) {
          if (item.checked) {
            $scope.recyclingCategory.push(item.grpid);
            $scope.recyclingCategoryName.push(item.name);
          }
        })

        OrderService.getListManufacte({
          ShorteName: '',
          Name: '',
          GrpID: ''// $scope.recyclingCategory.join(",")
        }).success(function (data) {
          if (data.code == 1001) {
            $scope.manufacteList = [];
            $scope.manufacteList = data.data
            /*      $scope.manufacteList.unshift({id: "", shortename: '无'});*///追加到第一位
          } else {
            CommonService.platformPrompt(data.message, 'close');
          }
        })
      }
    })

//获取省市县
    $scope.getAddressPCCList = function (item) {
      //获取省份信息
      AddressService.getAddressPCCList($scope, item)

    }

//modal打开 加载数据
    $scope.$on('modal.shown', function () {
      if ($scope.modalName == 'addressmodal') {
        $scope.getAddressPCCList();
      }
    })

//打开选择省市县modal
    $scope.openModal = function () {
      $scope.modalName = 'addressmodal'
      $scope.modal.show();
    }

//打开附近地址modal
    $scope.openNearAddrModal = function () {
      $scope.location(0);
      $scope.modal1.show();
    }

// 选择打开附近地址
    $scope.getAddressPois = function (item) {
      // $scope.dengji.addrdetail = item.name;
      $scope.longitude = item.location.split(",")[0];//经度
      $scope.latitude = item.location.split(",")[1];//纬度
      // $scope.modal1.hide();
      $scope.addrinfo.addressname= item.name;
    }
    $scope.searchaddrquery = function (addressname) {
      $scope.dengji.addrdetail =addressname;
      $scope.modal1.hide();
    }

//关键字搜索：通过用POI的关键字进行条件搜索，例如：肯德基、朝阳公园等；同时支持设置POI类型搜索，例如：银行称
    $scope.getPlaceBySearch = function (addrname) {
      AccountService.getPlaceBySearch({
        key: BoRecycle.gaoDeKey,
        keywords: addrname,//查询关键词
        city: $scope.city || "深圳",
        extensions: 'all'//返回结果控制
      }).success(function (data) {
        $scope.addresspois = data.pois;
      })
    }

//获取当前位置 定位
    $scope.location = function (param) {
      CommonService.getLocation(function () {
        //当前位置 定位
        AccountService.getCurrentCity({
          key: BoRecycle.gaoDeKey,
          location: Number($scope.handlongitude || localStorage.getItem("longitude")).toFixed(6) + "," + Number($scope.handlatitude || localStorage.getItem("latitude")).toFixed(6),
          radius: 3000,//	查询POI的半径范围。取值范围：0~3000,单位：米
          extensions: 'all',//返回结果控制
          batch: false, //batch=true为批量查询。batch=false为单点查询
          roadlevel: 0//可选值：1，当roadlevel=1时，过滤非主干道路，仅输出主干道路数据
        }).success(function (data) {
          var addressComponent = data.regeocode.addressComponent;
          $scope.addresspois = data.regeocode.pois;
          $scope.city = addressComponent.city;
          $scope.ssx = addressComponent.province + addressComponent.city + addressComponent.district;//省市县
          if (param == 0) {
            $scope.dengji.addrdetail = addressComponent.township + addressComponent.streetNumber.street;
          }
        }).then(function () {
          if (param == 1) {
            AddressService.getAddressBySSX({ssx: $scope.ssx, level: 3}).success(function (data) {
              if (data.code == 1001) {
                $scope.addrareacountyone = data.data;
              } else {
                CommonService.platformPrompt(data.message, "close")
              }
            })
          }
        })
      })

    }
    //页面加载完成自动定位
    $scope.$on('$ionicView.afterEnter', function () {
      $scope.location(1);//自动定位
    })

//实现单选
    $scope.multipleChoice = function (array, item) {
      item.checked ? item.checked = false : item.checked = true;
      if (item.checked) {
        angular.forEach(array, function (child) {
          if (item != child) {
            child.checked = false;
          }
        });
      }
    }
//信息登记提交
    $scope.informationSubmit = function () {
      if ($scope.dengji.acttype == 1) {//当用户选择“以旧换新”时，先判断用户有没有“完善信息”和“实名认证”，如果没有则必须先“完善信息”和“实名认证”
        var user = JSON.parse(localStorage.getItem("user"));
        if (user.services == null || user.services.length == 0) { //没有完善信息
          CommonService.showConfirm('登记提示', '尊敬的用户,您好！选择以旧换新类型必须先完善资料后才能操作！', '完善资料', '暂不完善', 'organizingdata', 'close');
          return;
        }
        if (user.certstate.substr(3, 1) != 2) { //没有实名认证
          CommonService.showConfirm('登记提示', '尊敬的用户,您好！选择以旧换新类型必须先实名认证后才能操作！', '实名认证', '暂不认证', 'organizingdata', 'close');
          return;
        }
      }
      //提交后就禁用按钮，防止多次点击
      $rootScope.verify=false;
      var manufactor = [];//厂商 单选
      angular.forEach($scope.manufacteList, function (item) {
        if (item.checked) {
          manufactor.push(item.id);
        }
      })

      $scope.dengji.type = 1;//类型 1.	登记信息 2.	登记货源
      $scope.dengji.hytype = 0;//物类别 0.未区分 1废料 2二手 (登记信息时为0)
      $scope.dengji.userid = localStorage.getItem("userid");//登记人userid
      $scope.dengji.longitude = $scope.longitude || localStorage.getItem("longitude") || $scope.addrareacountyone.Lng || 0;//经度 默认为0   地址表里有经纬度值 如果没值现在的地区取经纬度
      $scope.dengji.latitude = $scope.latitude || localStorage.getItem("latitude") || $scope.addrareacountyone.Lat || 0;//纬度 默认为0 地址表里有经纬度值 如果没值现在的地区取经纬度
      $scope.dengji.category = $scope.recyclingCategoryName.join(",");//货物品类 多个用逗号隔开
      $scope.dengji.manufactor = manufactor.join(",");//单选
      $scope.dengji.addrcode = $scope.addrareacountyone.Code;
      $scope.dengji.delivery = 1; //交货方式 1 上门回收(默认) 2 送货上门 登记信息直接用1
      $scope.dengji.details = [];//添加登记货源时明细

      angular.forEach($scope.productLists, function (item) {
        if (item.checked) {//选中的品类
          angular.forEach(item.details, function (itemitem) {
            $scope.dengji.details.push({
              num: 1,//台数
              grpid: itemitem.grpid,//品类ID
              proid: itemitem.id,//产品ID
              proname: itemitem.name,//产品名称
              unit: itemitem.unit//单位ID
            })
          })
        }
      });

      //添加登记信息/货源信息(添加登记货源时明细不能为空，添加登记信息时明细为空)
      OrderService.addDengJi([$scope.dengji]).success(function (data) {
        if (data.code == 1001) {
          CommonService.platformPrompt("登记信息提交成功", 'myorder');
        } else {
          CommonService.platformPrompt(data.message, 'close');
        }

      })

    }
  })

  //登记货源
  .controller('SupplyOfGoodsCtrl', function ($scope, $rootScope, $ionicHistory, CommonService, MainService, OrderService, AddressService) {
    //是否登录
    if (!CommonService.isLogin(true)) {
      return;
    }
    $scope.$on('$ionicView.beforeEnter', function () {
      if (!$ionicHistory.backView()) { //有没有上级
        //如果授权超过两个小时 单独授权
        if (((new Date().getTime() - new Date(localStorage.getItem("expires_in")).getTime()) / 1000) > 7199) {
          //接口授权
          MainService.authLogin(
            {
              grant_type: 'password',
              username: localStorage.getItem("userid"),
              password: localStorage.getItem("usersecret")
            }).success(function (data) {
            if (data.access_token) {
              localStorage.setItem("token", data.access_token);//登录接口授权token
              localStorage.setItem("expires_in", new Date());//登录接口授权token 有效时间
            } else {
              CommonService.platformPrompt("获取登录接口授权token失败", 'close');
              return;
            }
          })
        }
      }
    });
    $scope.supplyOfGoods = function () {
      $scope.goods = {//货源信息
        delivery: 1//默认上门回收
      };
      $scope.productLists = [];//产品品类

      //获取产品品类
      OrderService.getProductList({ID: "", Name: ""}).success(function (data) {
        if (data.code == 1001) {
          $scope.productList = data.data;
        } else {
          CommonService.platformPrompt(data.message, 'close');
        }
      }).then(function () {
        angular.forEach($scope.productList, function (item) { //根据产品品类及是否统货取产品列表(最新报价)
          OrderService.getProductListIsth({grpid: item.grpid, isth: 1}).success(function (data) {
            $scope.data = data;
          }).then(function () {
            if ($scope.data.code == 1001) {
              var items = item;
              items.details = $scope.data.data;
              $scope.productLists.push(items);
            }
          })
        })
        //  $scope.productList = $scope.productLists;

        $scope.checkChecded = function () {
          CommonService.checkChecded($scope, $scope.productList);
          $scope.recyclingCategoryName = [];//回收品类名字数组
          angular.forEach($scope.productList, function (item) {
            if (item.checked) {
              $scope.recyclingCategoryName.push(item.name);
            }
          })

        }

      })
    }
    /*    $scope.$on('$ionicView.beforeEnter', function () {
     if (!($ionicHistory.backView() && $ionicHistory.backView().stateName == 'myaddress')) {*/
    $scope.supplyOfGoods();
    // }

    if ($rootScope.addrlistFirst) {
      $scope.address = $rootScope.addrlistFirst;
    } else {
      //获取当前用户默认地址
      AddressService.getDefualtAddr({userid: localStorage.getItem("userid")}).success(function (data) {
        if (data.code == 1001) {
          $scope.address = data.data;
        }
      })
    }
    /*    });*/


    //登记货源提交
    $scope.supplyofgoodsSubmit = function () {
      if ($scope.address == undefined || $scope.address == null || angular.equals({}, $scope.address)) {
        CommonService.platformPrompt("请选择货源地址", 'myaddress');
        return;
      }
      //提交后就禁用按钮，防止多次点击
      $rootScope.verify=false;
      $scope.supplyofgoods = [];//要提交的json数组
      $scope.wastenumdetails = [];//废旧数据详情
      $scope.secondhandnumdetails = [];//二手数据详情
      $scope.wasteCategoryName = [];//废旧数据填写的品类
      $scope.secondCategoryName = [];//二手数据填写的品类
      var user = JSON.parse(localStorage.getItem("user"));

      //获取废旧和二手 填写的num数据
      angular.forEach($scope.productLists, function (item) {
        if (item.checked) {//选中的品类
          angular.forEach(item.details, function (itemitem) {
            if (itemitem.wastenum) { //废旧数据
              $scope.wastenumdetails.push({
                num: itemitem.wastenum,
                grpid: itemitem.grpid,
                proid: itemitem.id,
                proname: itemitem.name,
                unit: itemitem.unit
              })
              $scope.wasteCategoryName.push(item.name);//废旧数据填写的品类
            }
            if (itemitem.secondhandnum) { //二手数据
              $scope.secondhandnumdetails.push({
                num: itemitem.secondhandnum,
                grpid: itemitem.grpid,
                proid: itemitem.id,
                proname: itemitem.name,
                unit: itemitem.unit
              })
              $scope.secondCategoryName.push(item.name);//二手数据填写的品类
            }
          })
        }
      })
      for (var i = 0; i < 2; i++) { //两次循环
        var items = {};
        items.type = 2;//类型 1.	登记信息 2.	登记货源
        items.userid = localStorage.getItem("userid");//登记人userid
        items.name = user.username;//登记人姓名
        items.motel = user.mobile;//登记人电话
        items.longitude = localStorage.getItem("longitude") || $scope.address.Lng || 0;//经度 默认为0   地址表里有经纬度值 如果没值现在的地区取经纬度
        items.latitude = localStorage.getItem("latitude") || $scope.address.Lat || 0;//纬度 默认为0 地址表里有经纬度值 如果没值现在的地区取经纬度
        items.category = i == 0 ? $scope.wasteCategoryName.join(",") : $scope.secondCategoryName.join(",");//货物品类 多个用逗号隔开
        items.manufactor = "";//单选 登记货源是空
        items.addrcode = $scope.address.AreaCode;//地址code
        items.delivery = $scope.goods.delivery; //交货方式 1 上门回收(默认) 2 送货上门 登记信息直接用1
        items.addrdetail = $scope.address.AddrDetail;//详细地址
        items.hytype = i == 0 ? 1 : 2;//货物类别 0.未区分 1废料 2二手 (登记信息时为0)
        items.details = i == 0 ? $scope.wastenumdetails : $scope.secondhandnumdetails;//登记货源明细数据数组
        if ((i == 0 && $scope.wastenumdetails.length != 0) || (i == 1 && $scope.secondhandnumdetails.length != 0)) {
          $scope.supplyofgoods.push(items);
        }
      }

      //添加登记信息/货源信息(添加登记货源时明细不能为空，添加登记信息时明细为空)
      OrderService.addDengJi($scope.supplyofgoods).success(function (data) {
        if (data.code == 1001) {
          CommonService.platformPrompt("登记货源提交成功", 'myorder');
        } else {
          CommonService.platformPrompt(data.message, 'close');
        }

      })
    }


  })

  //添加评论页面
  .controller('EvaluateCtrl', function ($scope, $rootScope, $stateParams, CommonService, OrderService) {
    $scope.evaluateinfo = {};//评论信息
    $scope.evaluateinfo.star = 5;//评分数  默认
    $scope.evaluateinfo.service = 1;//服务态度 默认
    $scope.evaluateinfo.tranprice = 1;//交易价格 默认
    $scope.evaluatestar = function (stars) {
      $scope.evaluateinfo.star = stars;
    };

    //提交评论
    $scope.submitevalute = function () {

      //查单 添加评价
      $scope.datas = {
        id: "",//编号
        djno: $stateParams.no,//登记单号
        type: $stateParams.type,//订单类型 1-	登记信息 2-	登记货源
        userid: localStorage.getItem("userid"),//评论人
        score: $scope.evaluateinfo.star,//综合评分 1．1颗星 5. 5颗星（默认）
        service: $scope.evaluateinfo.service,//服务态度 1．	满意（默认） 2．	一般3．	差
        tranprice: $scope.evaluateinfo.tranprice,//交易价格 1．	合理（默认） 2．	一般3．	差
        updatetime: "",//最后修改时间
        remark: $scope.evaluateinfo.remark
      }

      OrderService.addComment($scope.datas).success(function (data) {
        if (data.code == 1001) {
          CommonService.platformPrompt('恭喜您 评价成功', '');
        } else {
          CommonService.platformPrompt(data.message, 'close');
        }

      })
    }


  })

  //取消订单
  .controller('CancelOrderCtrl', function ($scope, $rootScope, $stateParams, CommonService, OrderService) {
    $scope.cancelorder = {
      reason: 1//取消原因 默认联系不上
    }
    $scope.cancelOrder = function () {
      $scope.datas = {
        no: $stateParams.no,//订单号
        type: $stateParams.type,//订单类型 1.回收单 2.登记单
        userid: localStorage.getItem("userid"),//取消人账号
        reason: $scope.cancelorder.reason,//取消原因 1.	联系不上 2.	交易没谈拢 3.	其他
        remark: $scope.cancelorder.remark  //补充说明
      }
      CommonService.showConfirm('取消提示', '您是否要取消此订单?"是"点击"确定",否则请点击"取消"', '确定', '取消', '', 'close', function () {
        OrderService.newCancelOrderReceipt($scope.datas).success(function (data) {
          if (data.code == 1001) {
            CommonService.platformPrompt('取消订单成功', '');
          } else {
            CommonService.platformPrompt(data.message, 'close');
          }

        })
      })
    }
  })

  //修改回收品类
  .controller('ModifyCategoryCtrl', function ($scope, $rootScope, $stateParams, CommonService, OrderService, AccountService) {
    $scope.user = {};//用户信息
    var user = JSON.parse(localStorage.getItem("user"));//用户信息
    console.log(user.userext.prodgroup);
    $scope.supplyOfGoods = function () {
      $scope.productLists = [];//产品品类
      //获取产品品类
      OrderService.getProductList({ID: "", Name: ""}).success(function (data) {
        if (data.code == 1001) {
          $scope.productList = data.data;
          angular.forEach($scope.productList, function (item, index) {
            if (("," + user.userext.prodgroup + ",").indexOf("," + item.grpid + ",") >= 0) {
              $scope.productList[index].checked = true;
              $scope.ischecked = true;
            }
          })
        } else {
          CommonService.platformPrompt(data.message, 'close');
        }
      }).then(function () {
        $scope.checkChecded = function () {
          CommonService.checkChecded($scope, $scope.productList);
        }

      })
    }
    $scope.supplyOfGoods();

    //修改回收品类
    $scope.modifycategorySubmit = function () {
      $scope.recyclingCategory = [];//回收品类
      var isModify = true;//是否修改
      var grpids = user.userext.prodgroup.split(',');
      angular.forEach($scope.productList, function (item) {
        if (item.checked) {
          $scope.recyclingCategory.push(item.grpid);
        }
      });
      if (grpids.sort().join(',') == $scope.recyclingCategory.sort().join(',')) {
        isModify = false;
      }
      if (!isModify) {
        CommonService.platformPrompt("回收品类修改成功", '');
        return;
      }
      $scope.user.username = user.userext.name;//用户名
      $scope.user.mobile = user.userext.phone;//手机号码
      $scope.user.userid = localStorage.getItem("userid");//用户id
      $scope.user.services = user.services;//用户类型数组key
      $scope.user.recoveryqty = user.userext.recovery;//月回收量
      $scope.user.grps = $scope.recyclingCategory.join(",");
      $scope.user.addrcode = user.userext.addrcode;
      $scope.user.areacode =  user.userext.ext1;

      AccountService.setUserInfo($scope.user).success(function (data) {
        if (data.code == 1001) {
          CommonService.platformPrompt("回收品类修改成功", '');
        } else {
          CommonService.platformPrompt(data.message, 'close');
        }

        if (data.code == 1001 && localStorage.getItem("userid")) {  //更新用户信息
          //根据会员ID获取会员账号基本信息
          AccountService.getUser({userid: localStorage.getItem("userid")}).success(function (datas) {
            if (datas.code == 1001) {
              $rootScope.userinfo = datas.data;
              localStorage.setItem("user", JSON.stringify(datas.data));
              var services = datas.data.services;
              //用户会员类型  0 无 1信息提供者  2回收者
              localStorage.setItem("usertype", (services == null || services.length == 0) ? 0 : (services.length == 1 && services.indexOf('1') != -1) ? 1 : 2);
            }
          });
        }
      })
    }
  })

  //我的钱包
  .controller('WalletCtrl', function ($scope,$state, $rootScope, CommonService, MyWalletService) {
    $scope.totalamount = 0.00;//总金额
    $scope.kyamount = 0.00;//可用金额
    $scope.djamount = 0.00;//冻结金额
    //是否登录
    if (!CommonService.isLogin(true)) {
      return;
    }
    $scope.ut = localStorage.getItem("usertype");
    //总金额
    MyWalletService.get(localStorage.getItem("userid")).success(function (data) {
      $scope.totalamount = data.data.totalamount;
      $scope.kyamount = data.data.cashamount;//可用金额
      $scope.djamount = data.data.freezeamount;//冻结金额
    });
    //银行卡数
    $scope.total = 0;
    MyWalletService.bankget_count(localStorage.getItem("userid")).success(function (data) {
      $scope.total = data.data;
    });
    //根据会员ID获取会员账号基本信息
    if(!localStorage.getItem("user")) {
      AccountService.getUser({userid: localStorage.getItem("userid")}).success(function (data) {
        if (data.code == 1001) {
          $rootScope.userdata = data.data;
          localStorage.setItem("user", JSON.stringify(data.data));
        } else {
          CommonService.platformPrompt(data.message, 'close');
        }
      });
    }
    $scope.cash=function () {
      var userCertState=JSON.parse(localStorage.getItem("user")).certstate.split('');
      if(userCertState[3]!=2){
        CommonService.showConfirm('收收提示', '尊敬的用户,您好！为了您的账户安全，请先进行实名认证！', '实名认证', '暂不认证', 'tworealname', 'close', '', {status: 0});
        return;
      }else {
        $state.go('cash');
        return;
      }

    }
  })

  //提现
  .controller('CashCtrl', function ($scope, $rootScope, $state, $ionicHistory, MyWalletService, CommonService) {
    $rootScope.commonService = CommonService;
    //是否登录
    if (!CommonService.isLogin()) {
      return;
    }
    $scope.isAll = false;//是否全部提现
    $scope.subaccount = {};
    MyWalletService.get(localStorage.getItem("userid")).success(function (data) {
      $scope.subaccount = data.data;
    });
    $scope.verbank = false;
    $scope.myBk = {};
    $scope.cashinfo = {};
    //当默认银行对象为空时获取默认银行
    if (!$rootScope.defaultBank) {
      MyWalletService.getDefaultBank(localStorage.getItem("userid")).success(function (data) {
        if (data.code == 1001) {
          $rootScope.defaultBank = data.data;
        }
      });
    }
    $scope.allCash = function () {
      $scope.isAll?$scope.isAll=false:$scope.isAll=true;
      if($scope.isAll){
        $scope.cashinfo.amount = $scope.subaccount.cashamount;
      }else {
        $scope.cashinfo.amount = "";
      }

    }
    $scope.ammountValid=function () {
      $scope.isAll=$scope.cashinfo.amount == $scope.subaccount.cashamount;
    }
    $scope.addcash = function () {
      if (!$rootScope.defaultBank) {
        CommonService.platformPrompt('请先添加一个银行账户', 'addbankaccount');
        $state.go('addcard');
        return;
      }
      if ($scope.cashinfo.amount <= 3) {
        $rootScope.commonService.toolTip('提现金额必须大于3元！', '');
        return;
      }
      $scope.datas = {
        userbankid: $rootScope.defaultBank.id,
        userid: localStorage.getItem("userid"),
        amount: $scope.cashinfo.amount,
      };
      MyWalletService.cash($scope.datas).success(function (data) {
        if (data.code == 1001) {
          $rootScope.defaultBank = null;
          CommonService.showAlert('收收提示', '<p>恭喜您！操作成功，工作日24小时之内到账，请注意查收！</p>', 'wallet');
        } else {
          CommonService.platformPrompt(data.message, 'close');
        }
      });
    }
    //选择或添加银行卡
    $scope.selectCard = function () {
      if (!$rootScope.defaultBank||$rootScope.defaultBank.bankname==undefined) {
        $rootScope.defaultBank={};
        $state.go('addcard');
        return;
      } else {
        $state.go('bankcard');
        return;
      }
    }
  })

  //交易记录
  .controller('TransactionlistCtrl', function ($scope, $rootScope, $stateParams,$state, $ionicScrollDelegate, $ionicHistory, $ionicPopup, CommonService, AccountService, MyWalletService) {
    //是否登录
    if (!CommonService.isLogin()) {
      return;
    }
    $scope.channel="";
    $scope.strchannel="交易记录";
    if($stateParams.channel!="0")
    {
      $scope.channel=$stateParams.channel;
      $scope.strchannel="信息费收入";
    }
    $scope.tradelist = [];
    $scope.page = 0;
    $scope.total = 1;
    $scope.gettradelist = function () {
      if ((arguments != [] && arguments[0] == 0)) {
        $scope.page = 0;
        $scope.tradelist = [];
      }
      $scope.page++;
      $scope.params = {
        page: $scope.page,//页码
        size: 20,//条数
        userid: localStorage.getItem("userid"),//用户id
        channel: $scope.channel=="0"?"":$scope.channel,
      }
      MyWalletService.get_tradelist($scope.params).success(function (data) {
        $scope.isNotData = false;
        if (data.data == null || data.data.data_list.length == 0) {
          $scope.isNotData = true;
          return;
        }
        angular.forEach(data.data.data_list, function (item) {
          $scope.tradelist.push(item);
        })
        $scope.total = data.data.page_count;
        $ionicScrollDelegate.resize();//添加数据后页面不能及时滚动刷新造成卡顿
      }).finally(function () {
        $scope.$broadcast('scroll.refreshComplete');
        $scope.$broadcast('scroll.infiniteScrollComplete');
      });
    }
    $scope.getColor = function (state) {
      switch (state) {
        case "成功":
          return "calm";
        case "失败":
          return "assertive";
        case "取消":
          return "assertive";
        case "处理中":
          return "green";
        default:
          return "";
      }
    }
    $scope.gettradelist(0);//产品加载刷新
  })

  //我的银行卡
  .controller('BankcardCtrl', function ($scope, $rootScope, $state, $ionicHistory, $ionicScrollDelegate, CommonService, AccountService, MyWalletService) {
    $scope.userbanklist = [];
    $scope.page = 0;
    $scope.total = 1;
    $scope.blc = [];//银行logo及颜色

    $scope.isadd = false;
    MyWalletService.existisauth(localStorage.getItem("userid")).success(function (data) {
      if (data.code == 1001) {
        $scope.isadd = true;
      }
    });

    if (!$ionicHistory.backView() || $ionicHistory.backView().stateName != "cash") {
      $rootScope.defaultBank = null;
    }
    $scope.selectThis = function (item) {
      if ($rootScope.defaultBank) {
        $rootScope.defaultBank = item;
        $state.go("cash");
        return;
      }
    }
    $scope.getUserBanklist = function () {
      if (arguments != [] && arguments[0] == 0) {
        $scope.page = 0;
        $scope.userbanklist = [];
      }
      $scope.page++;
      $scope.params = {
        page: $scope.page,//页码
        size: 20,//条数
        userid: localStorage.getItem("userid")//用户id
      }
      MyWalletService.getbanklist($scope.params).success(function (data) {
        $scope.isNotData = false;
        if (data.data.total_count == 0) {
          $scope.isNotData = true;
          $rootScope.userbankliststatus = [];//无银行账号的时候清除数据
          return;
        }
        //获取银行卡logo等信息
        MyWalletService.getBankLogo().success(function (data) {
          angular.forEach(data, function (item) {
            $scope.blc.push(item);
          });
        }).then(function () {
          angular.forEach(data.data.data_list, function (item) {
            angular.forEach($scope.blc, function (item2) {
              if (item.bankname.indexOf(item2.name) >= 0 || item2.name.indexOf(item.bankname) >= 0) {
                item.logo = item2.logo;
                item.color = item2.color;
              }
            });
            if (!item.logo) {
              item.logo = "icon-yinhang";
              item.color = "#4e8bed";
            }
            $scope.userbanklist.push(item);
          });
        })

        $scope.total = data.data.page_count;
        $ionicScrollDelegate.resize();//添加数据后页面不能及时滚动刷新造成卡顿
      }).finally(function () {
        $scope.$broadcast('scroll.refreshComplete');
        $scope.$broadcast('scroll.infiniteScrollComplete');
      })
    }
    $scope.getUserBanklist(0);//收款账号加载刷新
    //根据会员ID获取会员账号基本信息
    if(!localStorage.getItem("user")) {
      AccountService.getUser({userid: localStorage.getItem("userid")}).success(function (data) {
        if (data.code == 1001) {
          $rootScope.userdata = data.data;
          localStorage.setItem("user", JSON.stringify(data.data));
        } else {
          CommonService.platformPrompt(data.message, 'close');
        }
      });
    }
    $scope.addcard=function () {
      var userCertState=JSON.parse(localStorage.getItem("user")).certstate.split('');
      if(userCertState[3]!=2){
        CommonService.showConfirm('收收提示', '尊敬的用户,您好！为了您的账户安全，请先进行实名认证！', '实名认证', '暂不认证', 'tworealname', 'close', '', {status: 0});
        return;
      }else {
        $state.go('addcard');
        return;
      }

    }
    $scope.setDefault = function (item) {
      //防止事件冒泡
      if ($rootScope.defaultBank) {
        return;
      }
      MyWalletService.setDefaultBC(item.id).success(function (data) {
        if (data.code = 1001) {
          CommonService.toolTip("恭喜您，操作成功！", "");
          $scope.getUserBanklist(0);//收款账号加载刷新
          return;
        } else {
          CommonService.toolTip("操作失败，请重试！", "");
          return;
        }
      }).error(function () {
        CommonService.toolTip("操作失败，请重试！", "");
        return;
      });
    }
  })

  //添加银行卡
  .controller('AddcardCtrl', function ($scope, $rootScope, $state, $ionicHistory, CommonService, $location, MyWalletService, AccountService) {

    //增加收款银行账号信息
    $scope.bankinfo = {};
    $scope.bankinfo.isdefault = false;
    $scope.buttonText = '添加';
    $scope.paracont = "获取验证码"; //初始发送按钮中的文字
    $scope.paraclass = false; //控制验证码的disable
    $scope.isabled = false;//是否启用银行名称输入功能
    $scope.checkphone = function (mobilephone) {//检查手机号
      AccountService.checkMobilePhone($scope, mobilephone);
    }
    $scope.setDefault = function () {
      $scope.bankinfo.isdefault = ($scope.bankinfo.isdefault ? false : true);
    }
    $scope.sendCode = function () {
      event.preventDefault();
      //按钮可用
      if ($scope.paraclass) {
        //取实名信息
        MyWalletService.get_identity(localStorage.getItem("userid")).success(function (data) {
          if (data.data != null) {
            $scope.personsign = {
              "cardno": $scope.bankinfo.accountno,
              "idno": data.data.idno,
              "mobile": $scope.bankinfo.mobile,
              "name": data.data.name
            }
            $scope.bankinfo.accountname = data.data.name;
            MyWalletService.authenticate_sign($scope.personsign).success(function (data1) {
              if (data1.data.errCode == "0") {
                //120s倒计时
                CommonService.countDown($scope);
                $scope.bankinfo.serviceid = data1.data.serviceId;
              } else {
                CommonService.platformPrompt('发送认证短信失败，请核实银行卡信息', 'close');
              }
            })
          }
          else {
            CommonService.toolTip("为了您的账户安全，实名认证之后再绑定银行卡", "");
            return;
          }
        }).error(function () {
          CommonService.toolTip("验证码有误", "");
          return;
        })
      }
    }
    //根据输入的银行卡号获取银行信息
    $scope.getBankinfo = function () {
      if ($scope.bankinfo.accountno && $scope.bankinfo.accountno.length > 15) {
        MyWalletService.getBankInfoByCardNo($scope.bankinfo.accountno).success(function (data) {
          if (data.code == 1001 && data.data.issname) {
            $scope.bankinfo.bankname = data.data.issname;
            $scope.isabled = true;
          } else {
            $scope.bankinfo.bankname = "";
          }
        });
      } else {
        $scope.bankinfo.bankname = "";
      }

    }
    $scope.addUserBank = function () {
      $scope.datas = {
        id: $scope.bankiteminfo ? $scope.bankiteminfo.id : 0, 	// id
        bankname: $scope.bankinfo.bankname,	//银行名称
        userid: localStorage.getItem("userid"),	//用户id
        branchname: $scope.bankinfo.branchname,	//支行名称
        accountno: $scope.bankinfo.accountno,	//银行帐号
        accountname: $scope.bankinfo.accountname,	//开户人名称
        isdefault: $scope.bankinfo.isdefault ? 1 : 0, 	//是否默认0-	否（默认值）1-	是
        serviceid: $scope.bankinfo.serviceid,
        code: $scope.bankinfo.code
      }
      MyWalletService.addbank($scope.datas).success(function (data) {
        if (data.code == 1001) {
          CommonService.showAlert('', '<p>恭喜您！</p><p>银行卡' + $scope.buttonText + '成功！</p>', 'close','');
          if ($rootScope.defaultBank) {
            $rootScope.defaultBank = $scope.datas;
            $rootScope.defaultBank.id = data.date;
            $state.go("cash");
            return;
          } else {
            $state.go("/bankcard");
            return;
          }

        } else {
          CommonService.platformPrompt(data.message, 'close');
        }
      })
    }
  })

  //充值
  .controller('RechargeCtrl', function ($scope, CommonService, PayService, WeiXinService) {
    $scope.pay = { //支付相关
      choice: "B",//选择支付方式默认
      money: ""
    }
    $scope.confirmPayment = function () { //充值
      if (WeiXinService.isWeiXin()) { //微信公众号支付
        $scope.isWeiXin = true;
        $scope.wxh5datas = {
          out_trade_no: new Date().getTime(),//订单号
          subject: "收收充值",//商品名称
          body: "收收充值详情",//商品详情
          total_fee: $scope.pay.money, //总金额
          userid: localStorage.getItem("userid"),//用户userid
          name: JSON.parse(localStorage.getItem("user")).username,//用户名
          openid: localStorage.getItem("openid") //微信openid
        }
        PayService.wxpayGZH($scope.wxh5datas).success(function (data) {
          if (data.code == 1001) {
            WeiXinService.wxchooseWXPay(data.data);
          } else {
            CommonService.platformPrompt(data.message, 'close');
          }

        })
      }
      if (ionic.Platform.isWebView()) {
        $scope.appdatas = {
          out_trade_no: new Date().getTime(),//订单号
          subject: "收收充值",//商品名称
          body: "收收充值详情",//商品详情
          total_fee: $scope.pay.money, //总金额
          userid: localStorage.getItem("userid"),//用户userid
          name: JSON.parse(localStorage.getItem("user")).username//用户名
        }
        if ($scope.pay.choice == "A") {//支付宝支付
          PayService.aliPayRecharge($scope.appdatas).success(function (data) {
            if (data.code == 1001) {
              PayService.aliPay(data.data);
            } else {
              CommonService.platformPrompt(data.message, 'close');
            }

          })
        } else if ($scope.pay.choice == "B") {//微信支付
          PayService.wxPayRecharge($scope.appdatas).success(function (data) {
            if (data.code == 1001) {
              PayService.weixinPay(data.data);
            } else {
              CommonService.platformPrompt(data.message, 'close');
            }
          })
        }
      }
      /*else {
       CommonService.platformPrompt("充值功能请使用APP客户端操作", 'close');
       }*/

      if (!ionic.Platform.isWebView() && !WeiXinService.isWeiXin()) {
        $scope.h5datas = {
          out_trade_no: new Date().getTime(),//订单号
          subject: "收收充值",//商品名称
          body: "收收充值详情",//商品详情
          total_fee: $scope.pay.money, //总金额
          userid: localStorage.getItem("userid"),//用户userid
          name: JSON.parse(localStorage.getItem("user")).username//用户名
        }
        if ($scope.pay.choice == "A") {//支付宝支付

        } else if ($scope.pay.choice == "B") {//微信支付
          PayService.wxpayH5($scope.h5datas).success(function (data) {
            if (data.code == 1001) {
              CommonService.windowOpen(data.data.mweb_url);//支付跳转
            } else {
              CommonService.platformPrompt(data.message, 'close');
            }

          })
        }


      }
    }
  })

  //生成邀请码
  .controller('tuiguangCtrl', function ($scope, $rootScope,$state, AccountService, CommonService,BoRecycle,WeiXinService) {
    //是否登录
    if (!CommonService.isLogin()) {
      return;
    }
    //判断是否是WebView或微信，如果是则显示广告
    if (ionic.Platform.isWebView()||WeiXinService.isWeiXin()) {
      $scope.isWebView = true;
    }
    if (!localStorage.getItem("user") || (JSON.parse(localStorage.getItem("user")).promoter != 1 && $rootScope.isinvitecode=="0")) {
      $scope.userdata.promoter = 1;
      CommonService.platformPrompt("很抱歉，您不是收收的推广用户！", 'close');
      $state.go("tab.account");
      return;
    }
    //调出分享面板
    CommonService.customModal($scope, 'templates/modal/share.html');
    if(!localStorage.getItem("user")) {
      AccountService.getUser({userid: localStorage.getItem("userid")}).success(function (data) {
        if (data.code == 1001) {
          localStorage.setItem("user", JSON.stringify(data.data));
          var services = data.data.services;
          //用户会员类型  0 无 1信息提供者  2回收者
          localStorage.setItem("usertype", (services == null || services.length == 0) ? 0 : (services.length == 1 && services.indexOf('1') != -1) ? 1 : 2);
        }
      });
    }

    $scope.invitecode;//邀请码
    //获取邀请码
    $scope.getCode = function () {
      AccountService.getInvitecode({userid:localStorage.getItem("userid"),isinvitecode:$rootScope.isinvitecode}).success(function (data) {
        $scope.invitecode = data.data;
        if(localStorage.getItem("usertype")){
          $scope.usertype=localStorage.getItem("usertype");
          if (WeiXinService.isWeiXin()) { //如果是微信
            $scope.isWeiXin = true;
            if($scope.usertype==1){
              CommonService.shareActionSheet("提供回收信息赚现金，首次下单额外奖励15元", "人人提供信息得信息费，信息越多赚钱越多，邀请使用成功登记回收信息得现金奖励", BoRecycle.mobApi + '/#/invitedown/'+$scope.invitecode.id, '');
            }else{
              CommonService.shareActionSheet("告别风吹日晒的蹲点回收，为回收人员增加真实货源", "下载“收收”在家接单轻松回收，告别蹲点回收，几千万回收人员的必备工具", BoRecycle.mobApi + '/#/invitedown/'+$scope.invitecode.id, '');
            }
            //CommonService.shareActionSheet($scope.helpdata.Title, $scope.helpdata.Abstract, BoRecycle.mobApi + '/#/download', '');
          }else {
            //调用分享面板
            $scope.shareActionSheet = function (type) {
              if ($scope.usertype == 1) {
                CommonService.shareActionSheet("提供回收信息赚现金，首次下单额外奖励15元", "人人提供信息得信息费，信息越多赚钱越多，邀请使用成功登记回收信息得现金奖励", BoRecycle.mobApi + '/#/invitedown/' + $scope.invitecode.id, '', type);
              } else {
                CommonService.shareActionSheet("告别风吹日晒的蹲点回收，为回收人员增加真实货源", "下载“收收”在家接单轻松回收，告别蹲点回收，几千万回收人员的必备工具", BoRecycle.mobApi + '/#/invitedown/' + $scope.invitecode.id, '', type);
              }
            }
          }
        }else{
//根据会员ID获取会员账号基本信息
          AccountService.getUser({userid: localStorage.getItem("userid")}).success(function (data) {
            if (data.code == 1001) {
              $rootScope.userdata = data.data;
              localStorage.setItem("user", JSON.stringify(data.data));
              var services = data.data.services;
              //用户会员类型  0 无 1信息提供者  2回收者
              var usertype = (services == null || services.length == 0) ? 0 : (services.length == 1 && services.indexOf('1') != -1) ? 1 : 2;
              localStorage.setItem("usertype", usertype);
              $scope.usertype = usertype;
            } else {
              CommonService.platformPrompt(data.message, 'close');
            }
          }).then(function () {
            if (WeiXinService.isWeiXin()) { //如果是微信
              $scope.isWeiXin = true;
              if($scope.usertype==1){
                CommonService.shareActionSheet("提供回收信息赚现金，首次下单额外奖励15元", "人人提供信息得信息费，信息越多赚钱越多，邀请使用成功登记回收信息得现金奖励", BoRecycle.mobApi + '/#/invitedown/'+$scope.invitecode.id, '');
              }else{
                CommonService.shareActionSheet("告别风吹日晒的蹲点回收，为回收人员增加真实货源", "下载“收收”在家接单轻松回收，告别蹲点回收，几千万回收人员的必备工具", BoRecycle.mobApi + '/#/invitedown/'+$scope.invitecode.id, '');
              }
              //CommonService.shareActionSheet($scope.helpdata.Title, $scope.helpdata.Abstract, BoRecycle.mobApi + '/#/download', '');
            }else {
              //调用分享面板
              $scope.shareActionSheet = function (type) {
                if ($scope.usertype == 1) {
                  CommonService.shareActionSheet("提供回收信息赚现金，首次下单额外奖励15元", "人人提供信息得信息费，信息越多赚钱越多，邀请使用成功登记回收信息得现金奖励", BoRecycle.mobApi + '/#/invitedown/' + $scope.invitecode.id, '', type);
                } else {
                  CommonService.shareActionSheet("告别风吹日晒的蹲点回收，为回收人员增加真实货源", "下载“收收”在家接单轻松回收，告别蹲点回收，几千万回收人员的必备工具", BoRecycle.mobApi + '/#/invitedown/' + $scope.invitecode.id, '', type);
                }
              }
            }
          });
        }
      }).error(function (err) {
        $scope.invitecode = "迷失在沙漠中，请重新生成！";
      });
    }
    //发起分享
    $scope.shareCode=function () {
      if($scope.invitecode){
        $scope.modal.show();
      }else {
        CommonService.platformPrompt("请重新生成邀请码！", 'close');
        return;
      }
    }
    $scope.getCode();
  })

  //信息费标准
  .controller('infeeCtrl', function ($scope, $rootScope, NewsService, CommonService) {
    //是否登录
    if (!CommonService.isLogin()) {
      return;
    }
    $scope.ut = localStorage.getItem("usertype");
    NewsService.getInfo_fee({areaname: $rootScope.areaname}).success(function (data) {
      $scope.infeels = data.data;
    });
  })

  //下载页面
  .controller('downloadCtrl', function ($scope, $ionicPlatform, BoRecycle, CommonService, WeiXinService, MainService,AccountService) {
    CommonService.customModal($scope, 'templates/modal/dl_modal.html');
    var ua = window.navigator.userAgent.toLowerCase(); //浏览器的用户代理设置为小写，再进行匹配
    var isIpad = ua.match(/ipad/i) == "ipad"; //或者利用indexOf方法来匹配
    var isIphoneOs = ua.match(/iphone os/i) == "iphone os";
    var isAndroid = ua.match(/android/i) == "android";
    $scope.isWX=WeiXinService.isWeiXin();
    $scope.share_arrow;
    $scope.dl_word;
    //$scope.dbg = BoRecycle.imgUrl + "/ShouShou/down-bg/drawable-port-xxxhdpi-screen.png";;//背景
    $scope.dld = function (pa) {
      if ($scope.isWX) {
        if (pa == 1) {
          CommonService.windowOpen("http://a.app.qq.com/o/simple.jsp?pkgname=com.boolv.recycle");
        } else {
          $scope.share_arrow = "./img/share_arrow.png";
          $scope.dl_word = "./img/dl-word.png";
          $scope.modal.show();
        }
        return;
      } else {
        if (isAndroid) {
          $scope.versionparams = {
            ID: 3,//编码 ,等于空时取所有
            Name: '',//软件名称（中文）
            NameE: '',//软件名称（英文）
            Enable: 1 //是否启用 1启用 2禁用
          }
          if (!localStorage.getItem("token") || localStorage.getItem("token") == "undefined" || ((new Date().getTime() - new Date(localStorage.getItem("expires_in")).getTime()) / 1000) > 7199) {
            MainService.authLogin({grant_type: 'client_credentials'}).success(function (data) {

              if (data.access_token) {
                localStorage.setItem("token", data.access_token);//公共接口授权token
                localStorage.setItem("expires_in", new Date());//公共接口授权token 有效时间
              } else {
                CommonService.platformPrompt("获取公众接口授权token失败", 'close');
                return;
              }
            }).then(function () {
              AccountService.getVersionsList($scope.versionparams).success(function (data) {
                CommonService.windowOpen(data.data.data_list[0].attached);
              });
            });
          }else{
            AccountService.getVersionsList($scope.versionparams).success(function (data) {
              CommonService.windowOpen(data.data.data_list[0].attached);
            });
          }
          return;
        } else if (isIpad || isIphoneOs) {
          CommonService.windowOpen("https://itunes.apple.com/cn/app/id1260924490");
          return;
        } else {
          CommonService.platformPrompt("很抱歉，“收收”只提供安卓版及Iphone版！", 'close');
        }
      }
    }
  })
  //下载页面
  .controller('invitedownCtrl', function ($scope, $ionicPlatform,$stateParams, BoRecycle, CommonService, WeiXinService, MainService,AccountService) {
    if(!$stateParams.cid){
      CommonService.platformPrompt("无效邀请码", 'tab.main');
      return;
    }
    var ua = window.navigator.userAgent.toLowerCase(); //浏览器的用户代理设置为小写，再进行匹配
    var isIpad = ua.match(/ipad/i) == "ipad"; //或者利用indexOf方法来匹配
    var isIphoneOs = ua.match(/iphone os/i) == "iphone os";
    var isAndroid = ua.match(/android/i) == "android";
    $scope.isWX=WeiXinService.isWeiXin();
    $scope.share_arrow;
    $scope.dl_word;
    $scope.invitecode;//邀请码
    //获取邀请码
    $scope.getCode = function () {
      AccountService.getInvitecode_id($stateParams.cid).success(function (data) {
        if(data.code==1001){
          $scope.invitecode = data.data;
        }
        else {
          CommonService.platformPrompt(data.message, 'tab.main');
          return;
        }
      }).error(function (err) {
        CommonService.platformPrompt(err, 'close');
        return;
      });
    }
    //判断授权
    if (!localStorage.getItem("token") || localStorage.getItem("token") == "undefined" || ((new Date().getTime() - new Date(localStorage.getItem("expires_in")).getTime()) / 1000) > 7199) {
      MainService.authLogin({grant_type: 'client_credentials'}).success(function (data) {

        if (data.access_token) {
          localStorage.setItem("token", data.access_token);//公共接口授权token
          localStorage.setItem("expires_in", new Date());//公共接口授权token 有效时间
        } else {
          CommonService.platformPrompt("获取公众接口授权token失败", 'close');
          return;
        }
      }).then(function () {
        $scope.getCode();
      });
    }else{
      $scope.getCode();
    }
    CommonService.customModal($scope, 'templates/modal/dl_modal.html');

    $scope.dld = function (pa) {
      if ($scope.isWX) {
        if (pa == 1) {
          CommonService.windowOpen("http://a.app.qq.com/o/simple.jsp?pkgname=com.boolv.recycle");
        } else {
          $scope.share_arrow = "./img/share_arrow.png";
          $scope.dl_word = "./img/dl-word.png";
          $scope.modal.show();
        }
        return;
      } else {
        if (isAndroid) {
          $scope.versionparams = {
            ID: 3,//编码 ,等于空时取所有
            Name: '',//软件名称（中文）
            NameE: '',//软件名称（英文）
            Enable: 1 //是否启用 1启用 2禁用
          }
          if (!localStorage.getItem("token") || localStorage.getItem("token") == "undefined" || ((new Date().getTime() - new Date(localStorage.getItem("expires_in")).getTime()) / 1000) > 7199) {
            MainService.authLogin({grant_type: 'client_credentials'}).success(function (data) {
              if (data.access_token) {
                localStorage.setItem("token", data.access_token);//公共接口授权token
                localStorage.setItem("expires_in", new Date());//公共接口授权token 有效时间
              } else {
                CommonService.platformPrompt("获取公众接口授权token失败", 'close');
                return;
              }
            }).then(function () {
              AccountService.getVersionsList($scope.versionparams).success(function (data) {
                CommonService.windowOpen(data.data.data_list[0].attached);
              });
            });
          }else{
            AccountService.getVersionsList($scope.versionparams).success(function (data) {
              CommonService.windowOpen(data.data.data_list[0].attached);
            });
          }
          return;
        } else if (isIpad || isIphoneOs) {
          CommonService.windowOpen("https://itunes.apple.com/cn/app/id1260924490");
          return;
        } else {
          CommonService.platformPrompt("很抱歉，“收收”只提供安卓版及Iphone版！", 'close');
        }
      }
    }


  })
  //微信授权回调页
  .controller('wechatCtrl', function ($scope, $rootScope,$location,$stateParams,$state, CommonService, BoRecycle, AccountService, WeiXinService) {
    //是否是微信 初次获取签名 获取微信签名 获取微信登录授权
    if (WeiXinService.isWeiXin()) {
      if (!localStorage.getItem("openid")) { //微信登录授权
        if ($stateParams.code) {
          var wxcode = $stateParams.code;
          //获取微信openid获取会员账号，如果没有则添加
          WeiXinService.getWCOpenId({
            code: wxcode,
            UserLogID: localStorage.getItem("userid") || ""
          }).success(function (data) {
            if (data.code == 1001) {
              localStorage.setItem("openid", data.data.OpenId);
              if (data.data.UserLogID != null && data.data.usersecret != null) {
                localStorage.setItem("userid", data.data.UserLogID);
                localStorage.setItem("usersecret", data.data.usersecret);
                //根据会员ID获取会员账号基本信息
                AccountService.getUser({userid: localStorage.getItem("userid")}).success(function (data) {
                  if (data.code == 1001) {
                    localStorage.setItem("user", JSON.stringify(data.data));
                    var services = data.data.services;
                    //用户会员类型  0 无 1信息提供者  2回收者
                    localStorage.setItem("usertype", (services == null || services.length == 0 ) ? 0 : (services.length == 1 && services.indexOf('1') != -1) ? 1 : 2);
                    $scope.getMainData();
                  }
                })
              }
            } else {
              CommonService.platformPrompt("获取微信OpenID失败", 'close');
            }
          });
        } else {
          CommonService.windowOpen('https://open.weixin.qq.com/connect/oauth2/authorize?appid=wx39ba5b2a2f59ef2c&redirect_uri=' + encodeURIComponent("http://m.boolv.com/WeChat") + '&response_type=code&scope=snsapi_base&state=shoushou#wechat_redirect')
          return;
        }
      }
      // 获取微信签名
      $scope.wxparams = {
        url: location.href.split('#')[0] //当前网页的URL，不包含#及其后面部分
      }
      WeiXinService.getWCSignature($scope.wxparams).success(function (data) {
        if (data.code == 1001) {
          localStorage.setItem("timestamp", data.data.timestamp);//生成签名的时间戳
          localStorage.setItem("noncestr", data.data.noncestr);//生成签名的随机串
          localStorage.setItem("signature", data.data.signature);//生成签名
          //通过config接口注入权限验证配置
          WeiXinService.weichatConfig(data.data.timestamp, data.data.noncestr, data.data.signature);
        } else {
          CommonService.platformPrompt("获取微信签名失败", 'close');
        }
      });
    }else{
      $state.go("tab.main");
    }
  })
  //二要素实名认证
  .controller('tworealnameCtrl',function ($scope, $rootScope, $stateParams, $ionicHistory, CommonService, AccountService) {
    $scope.status = $stateParams.status;//认证状态
    $scope.realname = {};//实名认证数据
    //上传图片数组集合
    $scope.imageList = [];
    $scope.ImgsPicAddr = [];//图片信息数组
    $scope.uploadName = 'realname';//上传图片的类别 用于区分
    $scope.uploadtype = 4;//上传媒体操作类型 1.卖货单 2 供货单 3 买货单 4身份证 5 头像
    //上传照片
    $scope.uploadActionSheet = function () {
      CommonService.uploadActionSheet($scope, 'User', true);
    }

    //获取实名认证信息
    if ($scope.status == 2) { //已认证
      $scope.params = {
        userid: localStorage.getItem("userid")
      }
      AccountService.getrealNameIdentity($scope.params).success(function (data) {
        if (data.code == 1001) {
          $scope.realname = data.data;

        } else {
          CommonService.platformPrompt(data.message, 'close');
        }

      })
    }

    //申请实名认证
    $scope.addCertificationName = function () {

      if ($scope.ImgsPicAddr.length == 0) {
        CommonService.platformPrompt("请先上传认证照片后再提交", 'close');
        return;
      }

      //提交实名认证，需要带入authenticate_sign 实名认证服务id
      $scope.datas = {
        userid: localStorage.getItem("userid"),	//当前用户userid
        name: $scope.realname.name,	    //姓名
        idno: $scope.realname.idno,	//身份证号码
        frontpic: $scope.ImgsPicAddr[0]//身份证照片地址。必须上传、上传使用公用上传图片接口
      }
      AccountService.twoElementAuthenticate($scope.datas).success(function (data) {
        if (data.code == 1001) {
          var user = JSON.parse(localStorage.getItem('user'));
          var certstate = user.certstate.split('');//转换成数组
          certstate.splice(3, 1, 2)//将3这个位置的字符，替换成'xxxxx'. 用的是原生js的splice方法
          user.certstate = certstate.join(''); //将数组转换成字符串
          localStorage.setItem('user', JSON.stringify(user));
          CommonService.platformPrompt('实名认证提交成功', 'tab.main');
        } else {
          CommonService.platformPrompt(data.message, 'close');
        }
      });
    }
    //删除图片
    $scope.deleteImg=function () {
      $scope.imageList = [];
      $scope.ImgsPicAddr = [];//图片信息数组
    }
    $scope.bigImage = false;    //初始默认大图是隐藏的
    $scope.hideBigImage = function () {
      $scope.bigImage = false;
    };
    //点击图片放大
    $scope.shouBigImage = function (imageName) {  //传递一个参数（图片的URl）
      $scope.Url = imageName;                   //$scope定义一个变量Url，这里会在大图出现后再次点击隐藏大图使用
      $scope.bigImage = true;                   //显示大图
    };
  })
;
