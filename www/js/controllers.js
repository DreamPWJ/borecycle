angular.module('starter.controllers', [])
  .config(function ($httpProvider) { //统一配置设置
    //服务注册到$httpProvider.interceptors中  用于接口授权
    $httpProvider.interceptors.push('MyInterceptor');
    /* $httpProvider.defaults.headers.common['Authorization'] = localStorage.getItem('token');*/
    /*    $http.defaults.cache = true/false;*/
  })

  //Tabs Ctrl
  .controller('TabsCtrl', function ($scope) {
    $scope.isLogin = localStorage.getItem("userid") ? true : false;//是否登录
    //  $scope.usertype = localStorage.getItem("usertype") || 0; //用户会员类型  0 无 1信息提供者  2回收者
    //$on用于事件 接收子级数据
    $scope.$on("usertype", function (event, data) {
      localStorage.setItem("usertype", data.usertype);
      //   $scope.usertype = data.usertype; //用户会员类型  0 无 1信息提供者  2回收者
    });

  })

  //APP首页面
  .controller('MainCtrl', function ($scope, $rootScope, CommonService, MainService, OrderService, BoRecycle, $location, $ionicHistory, $interval, NewsService, AccountService, $ionicPlatform, WeiXinService) {
    //授权之后执行的方法
    $scope.afterAuth = function () {
      //首页统计货量
      $scope.cargoQuantity = {};
      OrderService.getCargoQuantity().success(function (data) {
        console.log(data);
        if (data.code == 1001) {
          $scope.cargoQuantity = data.data;
        } else {
          CommonService.platformPrompt("获取统计货量数据失败", 'close');
        }

      })

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
          localStorage.setItem("jPushRegistrationID", data)
          console.log("JPushPlugin:registrationID is " + data);
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
          console.log(JSON.stringify($scope.datas));
          NewsService.setDeviceInfo($scope.datas).success(function (data) {
            console.log(JSON.stringify(data));
            if (data.code == 1001) {
              localStorage.setItem("jPushRegistrationID", $scope.jPushRegistrationID);
            } else {
              CommonService.platformPrompt("提交设备信息到服务器失败", 'close');
            }
          })

        } catch (exception) {
          console.log(exception);
        }
      };
      if (ionic.Platform.isWebView() && localStorage.getItem("userid") && !localStorage.getItem("jPushRegistrationID")) { //包含cordova插件的应用
        window.setTimeout(getRegistrationID, 3000);
      }


      if ($ionicPlatform.is('android')) {//android系统自动更新软件版本
        $scope.versionparams = {
          ID: 3,//编码 ,等于空时取所有
          Name: '',//软件名称（中文）
          NameE: '',//软件名称（英文）
          Enable: 1 //是否启用 1启用 2禁用
        }
        AccountService.getVersionsList($scope.versionparams).success(function (data) {
          console.log(data);
          if (data.code == 1001) {
            $scope.versions = data.data.data_list[0];
            if (BoRecycle.version < $scope.versions.vercode) {
              AccountService.showUpdateConfirm($scope.versions.remark, $scope.versions.attached, $scope.versions.vercode);
            }
          }
        })
      }

      //是否是微信 初次获取签名 获取微信签名
      if (WeiXinService.isWeiXin()) {
        // 获取微信签名
        $scope.wxparams = {
          url: location.href.split('#')[0] //当前网页的URL，不包含#及其后面部分
        }
        WeiXinService.getWCSignature($scope.wxparams).success(function (data) {
          console.log(data);
          if (data.code == 1001) {
            localStorage.setItem("timestamp", data.data.timestamp);//生成签名的时间戳
            localStorage.setItem("noncestr", data.data.noncestr);//生成签名的随机串
            localStorage.setItem("signature", data.data.signature);//生成签名
            //通过config接口注入权限验证配置
            WeiXinService.weichatConfig(data.data.timestamp, data.data.noncestr, data.data.signature);
          } else {
            CommonService.platformPrompt("获取微信签名失败", 'close');
          }
        })
        //获取微信openid获取会员账号，如果没有则添加
        var wxcode = WeiXinService.getQueryString("code");
        if (wxcode) {
          WeiXinService.getWCOpenId({
            code: code,
            UserLogID: localStorage.getItem("userid") || ""
          }).success(function (data) {
            console.log(data);
            if (data == 1001) {
              localStorage.setItem("openid", data.data)
            } else {
              CommonService.platformPrompt("获取微信OpenID失败", 'close');
            }

          })
        }

      }
      //根据会员ID获取会员账号基本信息
      if (localStorage.getItem("userid")) {
        AccountService.getUser({userid: localStorage.getItem("userid")}).success(function (data) {
          if (data.code == 1001) {
            localStorage.setItem("user", JSON.stringify(data.data));
            var services = data.data.services;
            //用户会员类型  0 无 1信息提供者  2回收者
            var usertype = (services == null || services.length == 0) ? 0 : (services.length == 1 && services.indexOf('1') != -1) ? 1 : 2;
            localStorage.setItem("usertype", usertype);
            $scope.usertype = usertype;
            //向父级传数据
            $scope.$emit("usertype", {usertype: usertype});
          } else {
            CommonService.platformPrompt(data.message, 'close');
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
              console.log(data);
              if (data.access_token) {
                localStorage.setItem("token", data.access_token);//公共接口授权token
                localStorage.setItem("expires_in", new Date());//公共接口授权token 有效时间
              } else {
                CommonService.platformPrompt("获取公众接口授权token失败", 'close');
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
            console.log(data);
            if (data.access_token) {
              localStorage.setItem("token", data.access_token);//登录接口授权token
              localStorage.setItem("expires_in", new Date());//登录接口授权token 有效时间
            } else {
              CommonService.platformPrompt("获取登录接口授权token失败", 'close');
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
    CommonService.getLocation();

//在首页中清除导航历史退栈
    $scope.$on('$ionicView.afterEnter', function () {
      $ionicHistory.clearHistory();
    })

  })

  //APP初次启动轮播图片
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
    }
    if ($ionicPlatform.is('ios')) { //ios设备

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
  .controller('LoginCtrl', function ($scope, $state, $rootScope, $interval, CommonService, MainService, AccountService) {
    //删除记住用户信息
    localStorage.removeItem("userid");
    localStorage.removeItem("usersecret");
    localStorage.removeItem("user");
    localStorage.removeItem("usertype");

    $scope.user = {};//提前定义用户对象
    $scope.agreedeal = true;//同意用户协议

    //根据会员账号检查是否需要邀请码
    $scope.getIsInvite = function (account) {
      AccountService.getIsInvite({account: account}).success(function (data) {
        console.log(data);
        if (data.code == 1001) {
          $scope.isInvite = false;
        } else {
          $scope.isInvite = true;
        }
      })
    }
    $scope.loginSubmit = function () {
      $scope.user.openID = localStorage.getItem("openid") || "";//微信openID
      $scope.user.client = ionic.Platform.isWebView() ? 0 : (ionic.Platform.is('android') ? 1 : 2);
      console.log(JSON.stringify($scope.user));
      AccountService.login($scope.user).success(function (data) {
        console.log(data);
        $scope.userdata = data.data;
        if (data.code == 1001) {
          localStorage.setItem("userid", data.data.userid);
          localStorage.setItem("usersecret", data.data.usersecret);
          CommonService.getStateName();   //跳转页面
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
            console.log(data);
            if (data.access_token) {
              localStorage.setItem("token", data.access_token);//登录接口授权token
              localStorage.setItem("expires_in", new Date());//登录接口授权token 有效时间
            }

          }).error(function () {
            CommonService.platformPrompt("获取登录接口授权token失败", 'close');
          })
        }
        $rootScope.loginAuth = $interval(function () {
          authLogin();
        }, 7199000);
        authLogin();
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
          })
        }
      })
    }
  })

  //手机验证登录页面
  .controller('MobileLoginCtrl', function ($scope, $state, $rootScope, $interval, CommonService, MainService, AccountService) {
    //删除记住用户信息
    localStorage.removeItem("userid");
    localStorage.removeItem("usersecret");
    localStorage.removeItem("user");
    localStorage.removeItem("usertype");

    $scope.user = {};//提前定义用户对象
    $scope.agreedeal = true;//同意用户协议
    $scope.paracont = "获取验证码"; //初始发送按钮中的文字
    $scope.paraclass = false; //控制验证码的disable
    $scope.checkphone = function (mobilephone) {//检查手机号
      AccountService.checkMobilePhone($scope, mobilephone);
    }
    //获取验证码
    $scope.getVerifyCode = function () {
      CommonService.getVerifyCode($scope, $scope.user.mobile);
    }

    //根据会员账号检查是否需要邀请码
    $scope.getIsInvite = function (account) {
      AccountService.getIsInvite({account: account}).success(function (data) {
        console.log(data);
        if (data.code == 1001) {
          $scope.isInvite = false;
        } else {
          $scope.isInvite = true;
        }
      })
    }
    $scope.loginSubmit = function () {
      if ($scope.verifycode != $scope.user.code) {
        CommonService.platformPrompt("输入的验证码不正确", 'close');
        return;
      }
      $scope.user.openID = localStorage.getItem("openid") || "";//微信openID
      $scope.user.client = ionic.Platform.isWebView() ? 0 : (ionic.Platform.is('android') ? 1 : 2);
      console.log($scope.user);
      AccountService.loginMobile($scope.user).success(function (data) {
        console.log(data);
        $scope.userdata = data.data;
        if (data.code == 1001) {
          localStorage.setItem("userid", data.data.userid);
          localStorage.setItem("usersecret", data.data.usersecret);
          CommonService.getStateName();   //跳转页面
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
            console.log(data);
            if (data.access_token) {
              localStorage.setItem("token", data.access_token);//登录接口授权token
              localStorage.setItem("expires_in", new Date());//登录接口授权token 有效时间
            }

          }).error(function () {
            CommonService.platformPrompt("获取登录接口授权token失败", 'close');
          })
        }
        $rootScope.loginAuth = $interval(function () {
          authLogin();
        }, 7199000);
        authLogin();
      })
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
        })
      }
    }
  })

  //注册页面
  .controller('RegisterCtrl', function ($scope, $rootScope, $state, CommonService, AccountService) {
    $scope.user = {//定义用户对象
      usertype: 1 //用户类型
    };
    $scope.agreedeal = true;//同意用户协议
    $scope.paracont = "获取验证码"; //初始发送按钮中的文字
    $scope.paraclass = false; //控制验证码的disable;
    $scope.services = [{key: 2, value: "上门回收者"}, {key: 3, value: "货场"}, {key: 4, value: "二手商家"}];//用户类型数组

    $scope.checkphoneandemail = function (account) {//检查手机号和邮箱
      AccountService.checkMobilePhoneAndEmail($scope, account);
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
      console.log($scope.user);

      AccountService.register($scope.user).success(function (data) {
        if (data.code == 1001) {
          $rootScope.registerUserType = $scope.user.usertype;
          $rootScope.isPhoneRegister = (/^1(3|4|5|7|8)\d{9}$/.test($scope.user.account))
          if($rootScope.isPhoneRegister){
            $rootScope.phoneRegister=$scope.user.account;
          }
          $state.go('organizingdata');
        }
        CommonService.platformPrompt(data.message, 'close');
      })

    }
  })

  //找回密码
  .controller('FindPasswordCtrl', function ($scope, $state, CommonService, AccountService) {
    $scope.user = {};//定义用户对象
    $scope.paracont = "获取验证码"; //初始发送按钮中的文字
    $scope.paraclass = false; //控制验证码的disable;

    $scope.checkphoneandemail = function (account) {//检查手机号和邮箱
      AccountService.checkMobilePhoneAndEmail($scope, account);
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
      console.log($scope.user);
      AccountService.findPassword($scope.user).success(function (data) {
        console.log(data);
        if (data.code == 1001) {
          CommonService.platformPrompt("新密码设置成功", 'login');
        } else {
          CommonService.platformPrompt(data.message, 'close');
        }
      })

    }
  })

  //完善资料页面
  .controller('OrganizingDataCtrl', function ($scope, $rootScope, CommonService, $ionicHistory, BoRecycle, OrderService, AccountService, AddressService) {
    //上传图片数组集合
    $scope.imageList = [];
    $scope.ImgsPicAddr = [];//图片信息数组
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
        if($rootScope.isPhoneRegister){
          $scope.user.mobile = Number($rootScope.phoneRegister);
        }
        if($rootScope.registerUserType==2){
          $scope.isUpgradeRecycler = true; //升级成为回收商
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
        console.log(datas);
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
              recoveryqty: userext.recovery || '',//月回收量
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
    }
//获取产品品类
    OrderService.getProductList({ID: "", Name: ""}).success(function (data) {
      console.log(data);
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
      //获取省份信息
      AddressService.getAddressPCCList($scope, item);
    }


//打开选择省市县modal
    $scope.openModal = function () {
      $scope.modal.show();
      $scope.getAddressPCCList();
    }
    //打开附近地址modal
    $scope.openNearAddrModal = function () {
      $scope.modal1.show();
    }

    // 选择打开附近地址
    $scope.getAddressPois = function (item) {
      $scope.user.addrdetail = item.name;
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
        AccountService.getCurrentCityName({
          key: BoRecycle.gaoDeKey,
          location: Number(localStorage.getItem("longitude")).toFixed(6) + "," + Number(localStorage.getItem("latitude")).toFixed(6),
          radius: 3000,//	查询POI的半径范围。取值范围：0~3000,单位：米
          extensions: 'all',//返回结果控制
          batch: false, //batch=true为批量查询。batch=false为单点查询
          roadlevel: 0 //可选值：1，当roadlevel=1时，过滤非主干道路，仅输出主干道路数据
        }).success(function (data) {
          var addressComponent = data.regeocode.addressComponent;
          $scope.addresspois = data.regeocode.pois;
          $scope.city = addressComponent.city;
          $scope.ssx = addressComponent.province + addressComponent.city + addressComponent.district;//省市县
          $scope.user.addrdetail = addressComponent.township + addressComponent.streetNumber.street;
        }).then(function () {
          AddressService.getAddressBySSX({ssx: $scope.ssx}).success(function (data) {
            console.log(data);
            if (data.code == 1001) {
              $scope.addrareacountyone = data.data;
            } else {
              CommonService.platformPrompt(data.message, "close")
            }
          })
        })
      })

    }
    $scope.location();//自动定位
//完善资料提交
    $scope.organizingdataSubmit = function () {

      if ($scope.verifycode != $scope.user.code) {
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
      $scope.user.img = $scope.ImgsPicAddr[0]; //证件照地址
      console.log($scope.user);

      AccountService.setUserInfo($scope.user).success(function (data) {
        console.log(data);
        if (data.code == 1001) {
          CommonService.platformPrompt("完善资料提交成功", localStorage.getItem("userid") ? '' : 'login');
        } else {
          CommonService.platformPrompt(datas.message, 'close');
        }

        if (data.code == 1001 && localStorage.getItem("userid")) {  //更新用户信息
          //根据会员ID获取会员账号基本信息
          AccountService.getUser({userid: localStorage.getItem("userid")}).success(function (datas) {
            console.log(datas);
            if (datas.code == 1001) {
              $rootScope.userdata = datas.data;
              localStorage.setItem("user", JSON.stringify(datas.data));
              var services = datas.data.services;
              //用户会员类型  0 无 1信息提供者  2回收者
              localStorage.setItem("usertype", (services == null || services.length == 0) ? 0 : (services.length == 1 && services.indexOf('1') != -1) ? 1 : 2);
            }
          })
        }
      })
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
        console.log(data);
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
            if ($scope.productList.length == index + 1) {
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

  //我的回收订单页面
  .controller('OrderCtrl', function ($scope, $rootScope, $state, $stateParams, CommonService, OrderService, $ionicSlideBoxDelegate, $ionicScrollDelegate) {
    //是否登录
    if (!CommonService.isLogin(true)) {
      return;
    }

    var user = JSON.parse(localStorage.getItem("user"));//用户信息
    if (!user.userext) {
      CommonService.showConfirm('收收提示', '尊敬的用户,您好！完善资料并且申请成为回收商才能查看订单！', '完善资料', '暂不完善', 'organizingdata', '');
      return;
    }

    if (user.services.length == 1 && user.services.indexOf('1') != -1) {
      CommonService.showConfirm('收收提示', '尊敬的用户,您好！信息供应者没有权限查看订单,请申请成为回收商！', '申请回收商', '暂不申请', 'organizingdata', '');
      return;
    }

    $scope.order = {
      showDelete: false
    };
    $rootScope.orderType = $stateParams.orderType; //orderType类型 0.是我的回收订单 1.接单收货（回收者接的是“登记信息”） 2.货源归集（货场接的是“登记货源”）
    $scope.tabIndex = 0;//当前tabs页

    //待接单订单
    $scope.jiedanorderList = [];
    $scope.jiedanpage = 0;
    $scope.jiedantotal = 1;
    //待处理订单
    $scope.chuliorderList = [];
    $scope.chulipage = 0;
    $scope.chulitotal = 1;
    //所有订单
    $scope.orderList = [];
    $scope.page = 0;
    $scope.total = 1;
    $scope.getOrderList = function () { //查询登记信息/货源信息分页列

      if (arguments != [] && arguments[0] == 0) {

        if ($scope.tabIndex == 0) {  //待接单订单
          $scope.jiedanorderList = [];
          $scope.jiedanpage = 0;
        }
        if ($scope.tabIndex == 1) {   //待处理订单
          $scope.chuliorderList = [];
          $scope.chulipage = 0;
        }
        if ($scope.tabIndex == 2) {   //所有订单
          $scope.page = 0;
          $scope.orderList = [];
        }
      }
      if ($scope.tabIndex == 0 || $scope.jiedanpage == 0) {  //待接单订单
        $scope.jiedanpage++;
      }
      if ($scope.tabIndex == 1 || $scope.chulipage == 0) {  //待处理订单
        $scope.chulipage++;
      }
      if ($scope.tabIndex == 2 || $scope.page == 0) {  //所有订单
        $scope.page++;
      }

      $scope.params = {
        page: $scope.tabIndex == 0 ? $scope.jiedanpage : ($scope.tabIndex == 1 ? $scope.chulipage : $scope.page),//页码
        size: 20//条数
      }
      var hytype = [];//货物类别

      if (user.services.indexOf('2') != -1) {
        hytype.push(0)
      }
      if (user.services.indexOf('3') != -1) {
        hytype.push(1)
      }
      if (user.services.indexOf('4') != -1) {
        hytype.push(2)
      }

      //待接单接口
      if ($scope.tabIndex == 0) {
        $scope.datas = {
          DJNo: "",//登记单号(可为空)
          Type: "",//类型1.登记信息 2.登记货源(可为空)
          ORuserid: localStorage.getItem("userid"),//接单人
          userid: "",//用户userid
          Category: "",//货物品类 多个用逗号隔开(可为空)
          HYType: hytype.join(","),//货物类别 0.未区分 1废料 2二手(可为空)  上门回收(2)接登记信息（0）的单;货场(3)接废料（1）二手商家（4）接二手的(2)
          State: "2,3",//状态 0.已关闭 1.审核不通过 2.未审核 3.审核通过（待接单） 4.已接单 (待收货) 5.已收货（待付款） 6.已付款（待评价） 7.已评价 (可为空)
          longt: localStorage.getItem("longitude") || "", //当前经度（获取距离）(可为空)
          lat: localStorage.getItem("latitude") || "",//当前纬度（获取距离）(可为空)
          expiry: ""//小时 取预警数据 订单预警数据（24小时截至马上过期的（expiry=3表示取3小时内）
        }

        OrderService.getDengJiList($scope.params, $scope.datas).success(function (data) {
          console.log(data);
          $scope.isNotjiedanData = false;

          if (data.data == null || data.data.data_list.length == 0) {
            if ($scope.tabIndex == 0) {  //待接单订单
              $scope.isNotjiedanData = true;
            }
            return;
          }

          angular.forEach(data.data.data_list, function (item) {
            if ($scope.tabIndex == 0) {  //待接单订单
              $scope.jiedanorderList.push(item);
            }

          })

          if ($scope.tabIndex == 0) {  //待接单订单
            $scope.jiedantotal = data.data.page_count;
          }

          $ionicScrollDelegate.resize();//添加数据后页面不能及时滚动刷新造成卡顿
        }).finally(function () {
          $scope.$broadcast('scroll.refreshComplete');
          $scope.$broadcast('scroll.infiniteScrollComplete');
        })
      }


      //待处理接口, 所有订单就是看这个人接的单，而不是发布信息(加一个类型及会员参数)
      if ($scope.tabIndex == 1 || $scope.tabIndex == 2) {
        $scope.datas = {
          DJNo: "",//登记单号(可为空)
          Type: "",//类型1.登记信息 2.登记货源(可为空)
          userid: "",//用户userid
          Category: "",//货物品类 多个用逗号隔开(可为空)
          HYType: "",//货物类别 0.未区分 1废料 2二手(可为空) 上门回收(2)接登记信息（0）的单;货场(3)接废料（1）二手商家（4）接二手的(2)
          State: $scope.tabIndex == 1 ? "4,5" : "4,5,6,7",//状态 0.已关闭 1.审核不通过 2.未审核 3.审核通过（待接单） 4.已接单 (待收货) 5.已收货（待付款） 6.已付款（待评价） 7.已评价 (可为空)
          longt: localStorage.getItem("longitude") || "", //当前经度（获取距离）(可为空)
          lat: localStorage.getItem("latitude") || "",//当前纬度（获取距离）(可为空)
          ORNO: "",//接单单号(可为空)
          ORuserid: localStorage.getItem("userid")//接单人(不能为空)
        }
        console.log($scope.datas);
        OrderService.getOrderReceiptList($scope.params, $scope.datas).success(function (data) {
            console.log(data);
            $scope.isNotchuliData = false;
            $scope.isNotData = false;
            if (data.data == null || data.data.data_list.length == 0) {
              if ($scope.tabIndex == 1) {   //待处理订单
                $scope.isNotchuliData = true;
              }
              if ($scope.tabIndex == 2) {    //所有订单
                $scope.isNotData = true;
              }
              return;
            }

            angular.forEach(data.data.data_list, function (item) {

              if ($scope.tabIndex == 1) {   //待处理订单
                $scope.chuliorderList.push(item);
              }
              if ($scope.tabIndex == 2) {   //所有订单
                $scope.orderList.push(item);
              }
            })

            if ($scope.tabIndex == 1) {   //待处理订单
              $scope.chulitotal = data.data.page_count;
            }
            if ($scope.tabIndex == 2) {   //所有订单
              $scope.total = data.data.page_count;
            }

            $ionicScrollDelegate.resize();//添加数据后页面不能及时滚动刷新造成卡顿
          }
        ).finally(function () {
          $scope.$broadcast('scroll.refreshComplete');
          $scope.$broadcast('scroll.infiniteScrollComplete');
        })
      }
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
      $ionicSlideBoxDelegate.$getByHandle("slidebox-orderlist").slide(index)
    }

    $scope.$on('$ionicView.afterEnter', function () {
      if ($rootScope.orderType == 0 || $rootScope.orderType == 2) {
        $scope.selectedTab(1);
      } else {
        $scope.getOrderList(0);//查询登记信息/货源信息分页列刷新
      }
    });

//接单
    $rootScope.jieDan = function (djno, userid, type, hytype) {
      event.preventDefault();
      var user = JSON.parse(localStorage.getItem("user"));//用户信息
      /*  如果会员是1（信息提供者）,不能接单
       如果会员是2（上门回收者）,只能接登记信息单 加条件type=1或者HYType=0
       如果会员是3（货场）,只能接登记货源单 加条件type=2且HYType=1
       如果会员是4（二手商家）,只能接登记货源单 加条件type=2且HYType=2
       会员角色你还要判断他有没有申请通过  0 审核不通过 1 未审核 2 审核通过*/

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
          CommonService.showConfirm('接单提示', '尊敬的用户,您好！恭喜您,接单成功！订单有效期为24小时,请您务必在24小时之内上门回收！', '查看订单', '继续接单', 'orderdetails', 'close', '', {
            no: data.data,
            type: 2
          })
          $scope.getOrderList(0);//查询登记信息/货源信息分页列刷新
        } else if (data.code == 1005) { //接单的时候返回值是1005,就跳转到“待处理”页面
          CommonService.platformPrompt(data.message, "close");
          $scope.selectedTab(1);
        } else {
          CommonService.platformPrompt(data.message, "close");
        }
      })

    }
//在回收订单中 取消订单
    $scope.cancelOrder = function (orno) {
      OrderService.cancelOrderReceipt({orno: orno}).success(function (data) {
        if (data.code == 1001) {
          CommonService.platformPrompt("取消接单成功", "close");
          $scope.getOrderList(0);//查询登记信息/货源信息分页列刷新
        } else {
          CommonService.platformPrompt(data.message, "close");
        }
      })
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

  })

  //我的回收订单详情页面
  .controller('OrderDetailsCtrl', function ($scope, $rootScope, $state, $stateParams, CommonService, OrderService) {
    var user = JSON.parse(localStorage.getItem("user"));//用户信息
    $scope.type = $stateParams.type;//1.待接单 2 待处理和所有订单
    $rootScope.orderType = $rootScope.orderType || 2; //orderType类型 0.是我的回收订单 1.接单收货（回收者接的是“登记信息”） 2.货源归集（货场接的是“登记货源”）
    $scope.getOrderListDetails = function () {
      if ($scope.type == 1) {
        OrderService.getDengJiDetail({djno: $stateParams.no}).success(function (data) {
          console.log(data);
          if (data.code == 1001) {
            $scope.orderDetail = data.data;
          } else {
            CommonService.platformPrompt(data.message, "close");
          }

        }).then(function () {
          $scope.getComment();
        })
      }
      if ($scope.type == 2) {
        OrderService.getOrderReceiptDetail({orno: $stateParams.no}).success(function (data) {
          console.log(data);
          if (data.code == 1001) {
            $scope.orderDetail = data.data;
          } else {
            CommonService.platformPrompt(data.message, "close");
          }

        }).then(function () {
          $scope.getComment();
        })
      }
    }

    $scope.getOrderListDetails();

    //获取评论内容
    $scope.getComment = function () {
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
    $scope.cancelOrder = function (djno) {
      OrderService.cancelOrderReceipt({orno: djno}).success(function (data) {
        if (data.code == 1001) {
          CommonService.platformPrompt("取消接单成功", "close");
          $scope.getOrderListDetails();//详情刷新
        } else {
          CommonService.platformPrompt(data.message, "close");
        }
      })
    }
  })

  //我的订单页面
  .controller('MyOrderCtrl', function ($scope, $rootScope, $state, CommonService, OrderService, $ionicSlideBoxDelegate, $ionicScrollDelegate) {
    $scope.tabIndex = 0;//tab默认
    //未完成订单
    $scope.unfinishedorderList = [];
    $scope.unfinishedpage = 0;
    $scope.unfinishedtotal = 1;
    //所有订单
    $scope.orderList = [];
    $scope.page = 0;
    $scope.total = 1;
    $scope.getOrderList = function () { //查询登记信息/货源信息分页列
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
        expiry: ""//小时 取预警数据 订单预警数据（24小时截至马上过期的（expiry=3表示取3小时内）
      }
      OrderService.getDengJiList($scope.params, $scope.datas).success(function (data) {
        console.log(data);
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

    $scope.getOrderList(0);//查询登记信息/货源信息分页列刷新

    $scope.tabIndex = 0;//当前tabs页
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

    //关闭订单
    $scope.closeOrder = function (djno) {
      event.preventDefault();
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
    $scope.getMyOrderDetail = function () {
      OrderService.getDengJiDetail({djno: $stateParams.no}).success(function (data) {
        console.log(data);
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
        expiry: 6 //小时 取预警数据 订单预警数据（24小时截至马上过期的（expiry=3表示取3小时内））
      }

      OrderService.getOrderReceiptList($scope.params, $scope.datas).success(function (data) {
        console.log(data);
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
    //获取产品品类
    OrderService.getProductList({ID: "", Name: $scope.orderinfo.productname}).success(function (data) {
      console.log(data);
      if (data.code == 1001) {
        $scope.productList = data.data;
        if ($scope.productList.length == 1) {//只有一个直接默认选择
          $scope.productList[0].checked = true;
          $scope.ischecked = true;
        }
      } else {
        CommonService.platformPrompt(data.message, 'close');
      }
    }).then(function () {
      angular.forEach($scope.productList, function (item) { //根据产品品类及是否统货取产品列表(最新报价)
        OrderService.getProductListIsth({grpid: item.grpid, isth: 0}).success(function (data) {
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
        CommonService.checkChecded($scope, $scope.productList);
      }

    })

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
      console.log($scope.huishoudata);

      OrderService.addOrderReceipt($scope.huishoudata).success(function (data) {
        console.log(data);
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
            name: $scope.orderinfo.name
          }
          $state.go("payment", {orderinfo: JSON.stringify(json)})

        } else {
          CommonService.platformPrompt(data.message, "close");
        }
      })
    }
  })

  //付款页面
  .controller('PaymentCtrl', function ($scope, $stateParams, CommonService, OrderService) {
    $scope.orderinfo = JSON.parse($stateParams.orderinfo);

    $scope.pay = { //支付相关
      choice: 1//选择支付方式默认支付方式1. 现金支付2. 在线支付
    }
    //获得订单详情
    OrderService.getOrderReceiptDetail({orno: $scope.orderinfo.orno}).success(function (data) {
      console.log(data);
      if (data.code == 1001) {
        $scope.orderDetail = data.data;
        $scope.orderinfo.amount=data.data.totalprice;
      } else {
        CommonService.platformPrompt(data.message, "close");
      }
    })
    //获得余额
    OrderService.getOrderSum({userid: localStorage.getItem("userid"), expiry: 6}).success(function (data) {
      if (data.code == 1001) {
        $scope.orderSum = data.data;
      } else {
        CommonService.platformPrompt(data.message, 'close');
      }
    })
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
      console.log($scope.data);

      //回收付款
      $scope.payOrderReceipt = function () {
        OrderService.payOrderReceipt($scope.data).success(function (data) {
          console.log(data);
          if (data.code == 1001) {
            CommonService.platformPrompt("回收付款成功", "orderdetails", {
              no: $scope.orderinfo.orno,
              type: 2
            })
          } else {
            CommonService.platformPrompt(data.message, "close")
          }
        })
      }
      if ($scope.orderinfo.type == 1 && $scope.orderDetail.informationmoney) { //如果是登记信息（type=1）的情况，要提示他的“预计信息费金额”
        CommonService.showConfirm('支付提示', '温馨提示:此订单的预计信息费金额为 ' + $scope.orderDetail.informationmoney + ' 元 , 支付请点击"确定",否则请点击"取消"', '确定', '取消', '', 'close', function () {
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
        console.log(data);
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
    $scope.newsDetails = function (relateno, id) {
      if (relateno) {
        $scope.updateNewsLook(1, id)
        $state.go("myorderdetails", {no: relateno})

      }
    }
  })

  //我的设置页面
  .controller('AccountCtrl', function ($scope, $rootScope, BoRecycle, CommonService, AccountService, OrderService, WeiXinService) {
    //是否登录
    if (!CommonService.isLogin(true)) {
      return;
    }
    //调出分享面板
    CommonService.customModal($scope, 'templates/modal/share.html');

    //根据会员ID获取会员账号基本信息
    AccountService.getUser({userid: localStorage.getItem("userid")}).success(function (data) {
      console.log(data);
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
    })

    //获取关于我们信息
    AccountService.getHelpContent({ID: 22}).success(function (data) {
      $scope.helpdata = data.data;
      $scope.title = "关于我们";
    }).then(function () {
      if (WeiXinService.isWeiXin()) { //如果是微信
        $scope.isWeiXin = true;
        CommonService.shareActionSheet($scope.helpdata.Title, $scope.helpdata.Abstract, BoRecycle.mobApi + '/#/help/22', '');
      }
      //调用分享面板
      $scope.shareActionSheet = function (type) {
        CommonService.shareActionSheet($scope.helpdata.Title, $scope.helpdata.Abstract, BoRecycle.mobApi + '/#/help/22', '', type);
      }
    })

//获得我的里面待处理和预警订单数 银行卡以及余额
    OrderService.getOrderSum({userid: localStorage.getItem("userid"), expiry: 6}).success(function (data) {
      if (data.code == 1001) {
        $scope.orderSum = data.data;
      } else {
        CommonService.platformPrompt(data.message, 'close');
      }
    })

  })

  //账号信息
  .controller('AccountInfoCtrl', function ($scope, $rootScope, CommonService, AccountService) {

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
        angular.forEach($rootScope.userinfo.services, function (item) {
          if (item == 1) {
            $scope.services.push("信息提供者")
          }
          if (item == 2) {
            $scope.services.push("上门回收者")
          }
          if (item == 3) {
            $scope.services.push("货场")
          }
          if (item == 4) {
            $scope.services.push("二手商家")
          }

        })
        $scope.servicesstr = $scope.services.join(",")
        //  $scope.isprovider = $rootScope.userinfo.services.indexOf('2') != -1 && $rootScope.userinfo.services.indexOf('3') != -1 && $rootScope.userinfo.services.indexOf('4') != -1 ? true : false
      } else {
        CommonService.platformPrompt('获取用户信息失败', 'close');
      }

    })

  })

  //修改用户头像图片
  .controller('UploadHeadCtrl', function ($scope, $rootScope, $stateParams, $state, CommonService) {
    //上传图片数组集合
    $scope.imageList = [];
    $scope.ImgsPicAddr = [];//图片信息数组
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
      console.log($scope.params);
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
  .controller('MyAddressCtrl', function ($scope, $state, $rootScope, $ionicHistory, CommonService, AddressService, AccountService) {
    /*    if ($rootScope.addrlistFirst) {
     $scope.selectAddress = function (item) {
     $rootScope.addrlistFirst = []
     $rootScope.addrlistFirst.push(item);
     $ionicHistory.goBack();
     }
     }*/
    $scope.addrlist = [];

    $scope.getAddrlist = function () {

      $scope.params = {
        userlog: localStorage.getItem("userid")
      }
      //获取用户常用地址
      AddressService.getAddrList($scope.params).success(function (data) {
        console.log(data);
        $scope.isNotData = false;
        if (data.data == null || data.data.length == 0) {
          $scope.isNotData = true;
          $scope.addrlist = [];
          /* $rootScope.addrlistFirst = [];*///无交易地址的时候清除数据
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
      $scope.delparams = {
        id: addrid,
        userid: localStorage.getItem("userid")
      }
      AddressService.deleteAddr($scope.delparams).success(function (data) {
        CommonService.platformPrompt(data.message, 'close');
        $scope.getAddrlist(0);//重新加载列表
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
    //打开选择省市县modal
    $scope.openModal = function () {
      $scope.modal.show();
      $scope.getAddressPCCList();
    }
    //打开附近地址modal
    $scope.openNearAddrModal = function () {
      $scope.modal1.show();
    }

    // 选择打开附近地址
    $scope.getAddressPois = function (item) {
      $scope.addrinfo.addr = item.name;
      $scope.longitude = item.location.split(",")[0];//经度
      $scope.latitude = item.location.split(",")[1];//纬度
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
        console.log(data);
        $scope.addresspois = data.pois;
      })
    }

    //获取当前位置 定位
    $scope.location = function () {
      CommonService.getLocation(function () {
        //当前位置 定位
        AccountService.getCurrentCityName({
          key: BoRecycle.gaoDeKey,
          location: Number(localStorage.getItem("longitude")).toFixed(6) + "," + Number(localStorage.getItem("latitude")).toFixed(6),
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
          AddressService.getAddressBySSX({ssx: $scope.ssx}).success(function (data) {
            console.log(data);
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
      $scope.location();//自动定位
    }
    //增加地址方法
    $scope.dealaddresssubmit = function () {
      $scope.addrinfo.addrid = $scope.addressiteminfo ? $scope.addressiteminfo.ID : null;//传入地址id 则是修改地址
      $scope.addrinfo.userid = localStorage.getItem("userid");//用户id
      $scope.addrinfo.addrcode = $scope.addrareacountyone ? $scope.addrareacountyone.ID : $scope.addressiteminfo.AddrCode;	//地区id
      $scope.addrinfo.is_default = $scope.addrinfoother.isstatus ? 1 : 0;	//是否默认0-否，1-是
      $scope.addrinfo.lat = $scope.addrareacountyone ? $scope.latitude || localStorage.getItem("latitude") || $scope.addrareacountyone.Lat : $scope.latitude || localStorage.getItem("latitude") || $scope.addressiteminfo.Lat;	//纬度
      $scope.addrinfo.lng = $scope.addrareacountyone ? $scope.longitude || localStorage.getItem("longitude") || $scope.addrareacountyone.Lng : $scope.longitude || localStorage.getItem("longitude") || $scope.addressiteminfo.Lng; 	//经度
      console.log($scope.addrinfo);
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
  .controller('SettingCtrl', function ($scope, $rootScope, $state, BoRecycle) {
    $scope.version = BoRecycle.version;
    $scope.securitylevel = '未知';
    var certstate = JSON.parse(localStorage.getItem("user")).certstate;
    if (certstate.indexOf('2') == -1) {
      $scope.securitylevel = '极低';
    }
    if ((certstate.substr(0, 1) == 2 || certstate.substr(1, 1) == 2) || (certstate.substr(3, 1) == 2 || certstate.substr(4, 1) == 2)) {
      $scope.securitylevel = '中等';
    }
    if ((certstate.substr(0, 1) == 2 || certstate.substr(1, 1) == 2) && (certstate.substr(3, 1) == 2 || certstate.substr(4, 1) == 2)) {
      $scope.securitylevel = '高';
    }
    if ((certstate.substr(0, 1) == 2 && certstate.substr(1, 1) == 2) && (certstate.substr(3, 1) == 2 || certstate.substr(4, 1) == 2)) {
      $scope.securitylevel = '较高';
    }
    if ((certstate.substr(0, 1) == 2 && certstate.substr(1, 1) == 2) && (certstate.substr(3, 1) == 2 && certstate.substr(4, 1) == 2)) {
      $scope.securitylevel = '极高';
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
        console.log(data);
        if (data.code == 1001) {
          CommonService.platformPrompt('绑定邮箱成功', 'accountsecurity');
        } else {
          CommonService.platformPrompt(data.message, 'close');
        }
      })
    }
  })

  //实名认证
  .controller('RealNameCtrl', function ($scope, $rootScope, $stateParams, CommonService, AccountService) {
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
        cardno: $scope.realname.cardno //银行卡号
      }
      AccountService.authenticateSign($scope.params).success(function (data) {
        console.log(JSON.stringify(data));
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
        console.log(data);
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
        cardno: $scope.realname.cardno, //银行卡号
        mobile: $scope.realname.mobile,//手机号码
        serviceid: $scope.serviceId,//e签宝服务id
        code: $scope.realname.code,//e签宝验证码
        frontpic: $scope.ImgsPicAddr[0],//身份证照片地址。必须上传、上传使用公用上传图片接口
        state: "",//审核通过
        createdate: "",//日期
        remark: ""//审核备注
      }
      console.log(JSON.stringify($scope.datas));
      AccountService.realNameAuthenticate($scope.datas).success(function (data) {
        console.log(JSON.stringify(data));
        if (data.code == 1001) {
          CommonService.platformPrompt('实名认证提交成功', '');
          var user = JSON.parse(localStorage.getItem('user'));
          var certstate = user.certstate.split('');//转换成数组
          certstate.splice(3, 1, 2)//将3这个位置的字符，替换成'xxxxx'. 用的是原生js的splice方法
          user.certstate = certstate.join(''); //将数组转换成字符串
          localStorage.setItem('user', JSON.stringify(user));
        } else {
          CommonService.platformPrompt(data.message, 'close');
        }
      })


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

    if (!localStorage.getItem("token")) {//如果没有授权先授权
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
  .controller('InformationCtrl', function ($scope, CommonService, BoRecycle, $ionicHistory, AccountService, AddressService, OrderService) {
    //是否登录
    if (!CommonService.isLogin(true)) {
      return;
    }
    /*     $scope.$on('$ionicView.afterEnter', function () { //动态清除页面缓存
     if($ionicHistory.backView() && $ionicHistory.backView().stateName=="tab.main"){ //上一级路由名称

     }
     })*/
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
      console.log(data);
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
          console.log(data);
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

    //打开选择省市县modal
    $scope.openModal = function () {
      $scope.modal.show();
      $scope.getAddressPCCList();
    }

    //打开附近地址modal
    $scope.openNearAddrModal = function () {
      $scope.modal1.show();
    }

    // 选择打开附近地址
    $scope.getAddressPois = function (item) {
      $scope.dengji.addrdetail = item.name;
      $scope.longitude = item.location.split(",")[0];//经度
      $scope.latitude = item.location.split(",")[1];//纬度
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
        console.log(data);
        $scope.addresspois = data.pois;
      })
    }

    //获取当前位置 定位
    $scope.location = function (param) {
      CommonService.getLocation(function () {
        //当前位置 定位
        AccountService.getCurrentCityName({
          key: BoRecycle.gaoDeKey,
          location: Number(localStorage.getItem("longitude")).toFixed(6) + "," + Number(localStorage.getItem("latitude")).toFixed(6),
          radius: 3000,//	查询POI的半径范围。取值范围：0~3000,单位：米
          extensions: 'all',//返回结果控制
          batch: false, //batch=true为批量查询。batch=false为单点查询
          roadlevel: 0//可选值：1，当roadlevel=1时，过滤非主干道路，仅输出主干道路数据
        }).success(function (data) {
          var addressComponent = data.regeocode.addressComponent;
          $scope.addresspois = data.regeocode.pois;
          $scope.city = addressComponent.city;
          $scope.ssx = addressComponent.province + addressComponent.city + addressComponent.district;//省市县
          if(param){
            $scope.dengji.addrdetail = addressComponent.township + addressComponent.streetNumber.street;
          }
        }).then(function () {
          AddressService.getAddressBySSX({ssx: $scope.ssx}).success(function (data) {
            console.log(data);
            if (data.code == 1001) {
              $scope.addrareacountyone = data.data;
            } else {
              CommonService.platformPrompt(data.message, "close")
            }
          })
        })
      })

    }
    $scope.location();//自动定位
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
          CommonService.showConfirm('登记提示', '尊敬的用户,您好！选择以旧换新类型必须先实名认证后才能操作！', '实名认证', '暂不认证', 'realname', 'close', '', {status: 0});
          return;
        }
      }

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
      $scope.dengji.addrcode = $scope.addrareacountyone.ID;
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
      })
      console.log($scope.dengji);

      //添加登记信息/货源信息(添加登记货源时明细不能为空，添加登记信息时明细为空)
      OrderService.addDengJi([$scope.dengji]).success(function (data) {
        console.log(data);
        if (data.code == 1001) {
          CommonService.platformPrompt("登记信息提交成功", 'myorder');
        } else {
          CommonService.platformPrompt(data.message, 'close');
        }

      })

    }
  })

  //登记货源
  .controller('SupplyOfGoodsCtrl', function ($scope, CommonService, OrderService, AddressService) {
    //是否登录
    if (!CommonService.isLogin(true)) {
      return;
    }
    $scope.goods = {//货源信息
      delivery: 1//默认上门回收
    };
    $scope.productLists = [];//产品品类

    //获取产品品类
    OrderService.getProductList({ID: "", Name: ""}).success(function (data) {
      console.log(data);
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


    //登记货源提交
    $scope.supplyofgoodsSubmit = function () {

      //获取当前用户默认地址
      AddressService.getDefualtAddr({userid: localStorage.getItem("userid")}).success(function (data) {
        console.log(data);
        if (data.code == 1001) {
          $scope.address = data.data;
        } else {
          CommonService.platformPrompt("无默认地址,请添加", 'myaddress');
        }
      }).then(function () {
        $scope.supplyofgoods = [];//要提交的json数组
        $scope.wastenumdetails = [];//废旧数据详情
        $scope.secondhandnumdetails = [];//二手数据详情
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
              }
              if (itemitem.secondhandnum) { //二手数据
                $scope.secondhandnumdetails.push({
                  num: itemitem.secondhandnum,
                  grpid: itemitem.grpid,
                  proid: itemitem.id,
                  proname: itemitem.name,
                  unit: itemitem.unit
                })
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
          items.category = $scope.recyclingCategoryName.join(",");//货物品类 多个用逗号隔开
          items.manufactor = "";//单选 登记货源是空
          items.addrcode = $scope.address.AddrCode;//地址code
          items.delivery = $scope.goods.delivery; //交货方式 1 上门回收(默认) 2 送货上门 登记信息直接用1
          items.addrdetail = $scope.address.AddrDetail;//详细地址
          items.hytype = i == 0 ? 1 : 2;//货物类别 0.未区分 1废料 2二手 (登记信息时为0)
          items.details = i == 0 ? $scope.wastenumdetails : $scope.secondhandnumdetails;//登记货源明细数据数组
          if ((i == 0 && $scope.wastenumdetails.length != 0) || (i == 1 && $scope.secondhandnumdetails.length != 0)) {
            $scope.supplyofgoods.push(items);
          }
        }
        console.log($scope.supplyofgoods);

        //添加登记信息/货源信息(添加登记货源时明细不能为空，添加登记信息时明细为空)
        OrderService.addDengJi($scope.supplyofgoods).success(function (data) {
          console.log(data);
          if (data.code == 1001) {
            CommonService.platformPrompt("登记货源提交成功", 'myorder');
          } else {
            CommonService.platformPrompt(data.message, 'close');
          }

        })
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
        console.log(data);
        if (data.code == 1001) {
          CommonService.platformPrompt('恭喜您 评价成功', '');
        } else {
          CommonService.platformPrompt(data.message, 'close');
        }

      })
    }


  })

  //我的钱包
  .controller('WalletCtrl', function ($scope, $rootScope, CommonService, MyWalletService) {
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
  })

  //提现
  .controller('CashCtrl', function ($scope, $rootScope, $state, $ionicHistory, MyWalletService, CommonService) {
    //是否登录
    if (!CommonService.isLogin()) {
      return;
    }
    $scope.isAll = false;//是否全部提现
    //判断是否存在默认银行对象
    if (!$rootScope.defaultBank) {
      $rootScope.defaultBank;//默认银行对象
    }
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
      $scope.isAll = true;
      $scope.cashinfo.amount = $scope.subaccount.cashamount;
    }
    $scope.addcash = function () {
      if (!$rootScope.defaultBank) {
        CommonService.platformPrompt('请先添加一个银行账户', 'addbankaccount');
        $state.go('addcard');
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
          CommonService.showAlert('', '<p>恭喜您！</p><p>操作成功，工作日24小时之内到账，请注意查收！</p>', 'wallet');
        } else {
          CommonService.platformPrompt('提现失败', 'close');
        }
      });
    }
    //选择或添加银行卡
    $scope.selectCard = function () {
      if (!$rootScope.defaultBank) {
        $rootScope.defaultBank = {};
        $state.go('addcard');
        return;
      } else {
        $state.go('bankcard');
        return;
      }
    }
  })

  //交易记录
  .controller('TransactionlistCtrl', function ($scope, $rootScope, $state, $ionicScrollDelegate, $ionicHistory, $ionicPopup, CommonService, AccountService, MyWalletService) {
    //是否登录
    if (!CommonService.isLogin()) {
      return;
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
      }
      MyWalletService.get_tradelist($scope.params).success(function (data) {
        console.log(data);
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
        console.log(data);
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
          CommonService.showAlert('', '<p>恭喜您！</p><p>银行卡' + $scope.buttonText + '成功！</p>', '');
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
  .controller('RechargeCtrl', function ($scope, CommonService, PayService) {
    $scope.pay = { //支付相关
      choice: "B",//选择支付方式默认
      money: ""
    }
    $scope.confirmPayment = function () { //充值
      /*     if (ionic.Platform.isWebView()) {*/
      if ($scope.pay.choice == "A") {//支付宝支付
        $scope.alidatas = {
          out_trade_no: new Date().getTime(),//订单号
          subject: "收收充值",//商品名称
          body: "收收充值详情",//商品详情
          total_fee: $scope.pay.money, //总金额
          userid: localStorage.getItem("userid"),//用户userid
          name: JSON.parse(localStorage.getItem("user")).username//用户名
        }
        console.log($scope.alidatas);
        PayService.aliPayRecharge($scope.alidatas).success(function (data) {
          console.log(data);
          if (data.code == 1001) {
            PayService.aliPay(data.data);
          } else {
            CommonService.platformPrompt(data.message, 'close');
          }

        })
      } else if ($scope.pay.choice == "B") {//微信支付
        $scope.wxdatas = {
          out_trade_no: new Date().getTime(),//订单号
          subject: "收收充值",//商品名称
          body: "收收充值详情",//商品详情
          total_fee: $scope.pay.money,  //总金额
          userid: localStorage.getItem("userid"),//用户userid
          name: JSON.parse(localStorage.getItem("user")).username//用户名
        }
        console.log($scope.wxdatas);
        PayService.wxPayRecharge($scope.wxdatas).success(function (data) {
          console.log(data);
          if (data.code == 1001) {
            PayService.weixinPay(data.data);
          } else {
            CommonService.platformPrompt(data.message, 'close');
          }
        })
      }
      /*
       } else {
       CommonService.platformPrompt("充值功能请使用APP客户端操作", 'close');
       }
       */

    }
  })
  //生成邀请码
  .controller('tuiguangCtrl', function ($scope, $rootScope, AccountService, CommonService) {
    //是否登录
    if (!CommonService.isLogin()) {
      return;
    }
    if (!$rootScope.userdata || $rootScope.userdata.promoter != 1) {
      CommonService.platformPrompt("很抱歉，您不是收收的推广用户！", 'close');
      $state.go("tab.account")
      return;
    }
    $scope.invitecode;//邀请码
    //获取邀请码
    $scope.getCode = function () {
      AccountService.getInvitecode(localStorage.getItem("userid")).success(function (data) {
        $scope.invitecode = data.data;
      }).error(function (err) {
        $scope.invitecode = "迷失在沙漠中，请重新生成！";
      });
    }
  })
  //信息费标准
  .controller('infeeCtrl', function ($scope, $rootScope, NewsService, CommonService) {
    //是否登录
    if (!CommonService.isLogin()) {
      return;
    }
    $scope.ut = localStorage.removeItem("usertype");
    NewsService.getInfo_fee().success(function (data) {
      console.log(data);
      $scope.infeels = data.data;
    });
    console.log($scope.infeels);
  })
;
