angular.module('starter.controllers', [])
  .config(function ($httpProvider) { //统一配置设置
    //服务注册到$httpProvider.interceptors中  用于接口授权
    $httpProvider.interceptors.push('MyInterceptor');
    /* $httpProvider.defaults.headers.common['Authorization'] = localStorage.getItem('token');*/
    /*    $http.defaults.cache = true/false;*/
  })


  //APP首页面
  .controller('MainCtrl', function ($scope, $rootScope, CommonService, MainService, OrderService, BoRecycle, $ionicHistory, $interval, NewsService, AccountService, $ionicPlatform, WeiXinService) {

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
              user: localStorage.getItem("userid"),	//用户id,没登录为空
              mobile: localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")).mobile : '',	//手机号码 获取不到为空
              alias: "",	//设备别名
              device: $ionicPlatform.is('android') ? 0 : 1,	//设备类型:0-android,1-ios
              Lat: localStorage.getItem("latitude") || 22.5224500,
              Lon: localStorage.getItem("longitude") || 114.0557100
            }
            console.log(JSON.stringify($scope.datas));
            NewsService.setDeviceInfo($scope.datas).success(function (data) {
              if (data.code != 1001) {
                CommonService.platformPrompt("提交设备信息到服务器失败", 'close');
              }
            })

          } catch (exception) {
            console.log(exception);
          }
        };
      }


      if (ionic.Platform.isWebView()) { //包含cordova插件的应用
        window.setTimeout(getRegistrationID, 1000);
      }


      if ($ionicPlatform.is('android')) {//android系统自动更新软件版本
        $scope.versionparams = {
          page: 1,//当前页码
          size: 1,//每页条数
          ID: 3,//编码 ,等于空时取所有
          Name: '博回收',//软件名称（中文）
          NameE: '',//软件名称（英文）
          Enable: 1 //是否启用 1启用 2禁用
        }
        AccountService.getVersionsList($scope.versionparams).success(function (data) {
          console.log(data);
          $scope.versions = data.data.data_list[0];
          if (BoRecycle.version < $scope.versions.vercode) {
            AccountService.showUpdateConfirm($scope.versions.remark, $scope.versions.attached, $scope.versions.vercode);
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
          if (data.code == 1001) {
            localStorage.setItem("timestamp", data.timestamp);//生成签名的时间戳
            localStorage.setItem("noncestr", data.noncestr);//生成签名的随机串
            localStorage.setItem("signature", data.signature);//生成签名
            //通过config接口注入权限验证配置
            WeiXinService.weichatConfig(data.timestamp, data.noncestr, data.signature);
          } else {
            CommonService.platformPrompt("获取微信签名失败", 'close');
          }
        })
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

          $scope.$broadcast('scroll.refreshComplete');
        }
      }

//执行方法
      $scope.getMainData();

//定位
//CommonService.getLocation();

//在首页中清除导航历史退栈
      $scope.$on('$ionicView.afterEnter', function () {
        $ionicHistory.clearHistory();

      })

    }
  )

  //用户密码登录页面
  .controller('LoginCtrl', function ($scope, $rootScope, $interval, CommonService, MainService, AccountService) {
    //删除记住用户信息
    localStorage.removeItem("userid");
    localStorage.removeItem("usersecret");
    localStorage.removeItem("user");

    $scope.user = {};//提前定义用户对象
    $scope.agreedeal = true;//同意用户协议
    $scope.loginSubmit = function () {
      $scope.user.client = ionic.Platform.isWebView() ? 0 : (ionic.Platform.is('android') ? 1 : 2);
      AccountService.login($scope.user).success(function (data) {
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
        //根据会员ID获取会员账号基本信息
        if (localStorage.getItem("userid")) {
          AccountService.getUser({userid: localStorage.getItem("userid")}).success(function (data) {
            if (data.code == 1001) {
              localStorage.setItem("user", JSON.stringify(data.data));
            } else {
              CommonService.platformPrompt(data.message, 'close');
            }
          })
        }
      })
    }
  })

  //手机验证登录页面
  .controller('MobileLoginCtrl', function ($scope, $rootScope, $interval, CommonService, MainService, AccountService) {
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

    $scope.loginSubmit = function () {
      if ($scope.verifycode != $scope.user.code) {
        CommonService.platformPrompt("输入的验证码不正确", 'close');
        return;
      }
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
          } else {
            CommonService.platformPrompt(data.message, 'close');
          }
        })
      }
    }
  })

  //注册页面
  .controller('RegisterCtrl', function ($scope, $state, CommonService, AccountService) {
    $scope.user = {};//定义用户对象
    $scope.agreedeal = true;//同意用户协议
    $scope.paracont = "获取验证码"; //初始发送按钮中的文字
    $scope.paraclass = false; //控制验证码的disable;
    $scope.user.services = [];//用户类型数组key
    $scope.services = [{key: 1, value: "上门回收者", checked: false}, {key: 2, value: "货场", checked: false}, {
      key: 3,
      value: "二手商家",
      checked: false
    }];//用户类型数组
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

      angular.forEach($scope.services, function (item) {
        if (item.checked) {
          $scope.user.services.push(item.key)
        }
      })

      $scope.user.client = ionic.Platform.isWebView() ? 0 : (ionic.Platform.is('android') ? 1 : 2);
      console.log($scope.user);

      AccountService.register($scope.user).success(function (data) {
        if (data.code == 1001) {
          $state.go('organizingdata');
        }
        CommonService.platformPrompt(data.message, 'close');
      })

    }
  })

  //完善资料页面
  .controller('OrganizingDataCtrl', function ($scope, CommonService, BoRecycle, OrderService, AccountService, AddressService) {
    CommonService.customModal($scope, 'templates/modal/addressmodal.html');
    $scope.user = {};//定义用户对象
    $scope.paracont = "获取验证码"; //初始发送按钮中的文字
    $scope.paraclass = false; //控制验证码的disable
    $scope.addrinfo = {};//地址信息
    $scope.recyclingCategory = [];//回收品类数组

    //获取产品品类
    OrderService.getProductList({ID: "", Name: ""}).success(function (data) {
      console.log(data);
      if (data.code == 1001) {
        $scope.productList = data.data;
      } else {
        CommonService.platformPrompt("获取产品品类失败", 'close');
      }
    }).then(function () {
      $scope.checkChecded = function () {
        CommonService.checkChecded($scope, $scope.productList);
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

    //完善资料提交
    $scope.organizingdataSubmit = function () {
      if ($scope.verifycode != $scope.user.code) {
        CommonService.platformPrompt("输入的验证码不正确", 'close');
        return;
      }

      angular.forEach($scope.productList, function (item) {
        if (item.checked) {
          $scope.recyclingCategory.push(item.grpid)
        }
      })
      $scope.user.userid = localStorage.getItem("userid");//用户id
      $scope.user.grps = $scope.recyclingCategory.join(",");
      $scope.user.addrcode = $scope.addrareacountyone.ID;
      console.log($scope.user);

      AccountService.setUserInfo($scope.user).success(function (data) {
        console.log(data);
        CommonService.platformPrompt(data.message, 'login');
      })
    }
  })

  //参考价页面
  .controller('ReferencePriceCtrl', function ($scope, $stateParams, CommonService, OrderService) {
    $scope.classifyindex = $stateParams.index || 0;//选中产品分类标示
    //获取产品分类
    $scope.getClassify = function () {
      //获取产品品类
      OrderService.getProductList({ID: "", Name: ""}).success(function (data) {
        console.log(data);
        if (data.code == 1001) {
          $scope.productList = data.data;
        } else {
          CommonService.platformPrompt("获取产品品类失败", 'close');
        }
      }).then(function () {
        $scope.getClassifyDetails($scope.classifyindex);
      })
    }
    $scope.getClassify()
    //点击产品分类获取产品分类详情
    $scope.getClassifyDetails = function (index) {
      $scope.classifyindex = index;
      /*  $scope.classifyDetails = $scope.classifyinfo[index].son;*!/*/
    }

    $scope.scrollHeight = (window.innerHeight - 44 - 49) + 'px';
    $scope.scrollContentHeight = document.querySelector("#classify-scroll-content").clientHeight + 'px';

  })

  //我的订单页面
  .controller('OrderCtrl', function ($scope, $state, CommonService, $ionicSlideBoxDelegate) {
    $scope.tabIndex = 0;//当前tabs页
    //左右滑动列表
    $scope.slideChanged = function (index) {
      $scope.tabIndex = index;
      // $scope.getOrdersList(0); //获取订单数据
    };
    //点击选项卡
    $scope.selectedTab = function (index) {
      $scope.tabIndex = index;
      //滑动的索引和速度
      $ionicSlideBoxDelegate.$getByHandle("slidebox-myorderlist").slide(index)
    }

    //联系他
    $scope.relation = function (phonenumber) {
      event.preventDefault();
      window.open('tel:' + phonenumber);
    }

    //回收
    $scope.recycle = function () {
      event.preventDefault();
      $state.go("recycleorder")
    }

    //导航
    $scope.navigation = function () {
      event.preventDefault();
      $state.go("navigation")
    }
  })

  //我的订单详情页面
  .controller('OrderDetailsCtrl', function ($scope, CommonService) {


  })

  //我的回收录单页面
  .controller('RecycleOrderCtrl', function ($scope, CommonService) {


  })

  //导航页面
  .controller('NavigationCtrl', function ($scope, CommonService, $window, OrderService) {
    //$window.location.href="http://m.amap.com/navi/?start=116.403124,39.940693&dest=116.481488,39.990464&destName=阜通西&naviBy=car&key=0ffd53eb83c2cea2181a5fbfa9f3c311"
    // window.open("http://m.amap.com/navi/?start=116.403124,39.940693&dest=116.481488,39.990464&destName=阜通西&naviBy=car&key=0ffd53eb83c2cea2181a5fbfa9f3c311")
    /*    CommonService.getLocation(function () {*/
    var map = new AMap.Map('gaode-map', {
        resizeEnable: true,
        zoom: 16,
        center: [localStorage.getItem("longitude") || 114.0557100, localStorage.getItem("latitude") || 22.5224500,]
      })
    ;
    AMap.plugin(['AMap.ToolBar', 'AMap.Scale', 'AMap.OverView'],
      function () {
        map.addControl(new AMap.ToolBar());

        map.addControl(new AMap.Scale());

        /*          map.addControl(new AMap.OverView({isOpen:true}));*/
      });
    //基本地图加载
    /*      var map = new AMap.Map("gaode-map", {
     resizeEnable: true,
     center: [116.397428, 39.90923],//地图中心点
     zoom: 13 //地图显示的缩放级别
     });
     //构造路线导航类
     var driving = new AMap.Driving({
     map: map,
     panel: "panel"
     });
     // 根据起终点经纬度规划驾车导航路线
     driving.search(new AMap.LngLat(116.379028, 39.865042), new AMap.LngLat(116.427281, 39.903719));*/
    /*    })*/
  })

  //通知消息列表
  .controller('NewsCtrl', function ($scope, CommonService, NewsService, $ionicScrollDelegate) {
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
        size: 5,//条数
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
        $scope.total = data.total_count;
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
        $scope.newslist(0);
      })
    }
  })

  //我的设置页面
  .controller('AccountCtrl', function ($scope, $rootScope, CommonService, AccountService) {
    //是否登录
    if (!CommonService.isLogin(true)) {
      return;
    }
    CommonService.customModal($scope, 'templates/modal/share.html');
    //根据会员ID获取会员账号基本信息

    AccountService.getUser({userid: localStorage.getItem("userid")}).success(function (data) {
      if (data.code == 1001) {
        $rootScope.userdata = data.data;
        localStorage.setItem("user", JSON.stringify(data.data));
      } else {
        CommonService.platformPrompt(data.message, 'close');
      }
    })

    //微信分享
    $scope.weixinShare = function (type) {
      Wechat.share({
        text: "博绿固废回收分享",
        scene: type == 0 ? Wechat.Scene.SESSION : Wechat.Scene.TIMELINE
      }, function () {
        CommonService.platformPrompt("微信分享成功", 'close');
      }, function (reason) {
        CommonService.platformPrompt("微信分享失败:" + reason, 'close');
      });
    }
  })

  //账号信息
  .controller('AccountInfoCtrl', function ($scope, $rootScope, CommonService, AccountService, BoRecycle) {
    /*    $scope.isprovider = JSON.parse(localStorage.getItem("user")).grade == 5 ? true : false*/
    $rootScope.userinfo = JSON.parse(localStorage.getItem("user"));

    //获取定位信息
    $scope.cityName = "深圳";//默认地址
    CommonService.getLocation(function () {
      //获取首页地理位置城市名称
      AccountService.getCurrentCityName({
        key: BoRecycle.gaoDeKey,
        location: Number(localStorage.getItem("longitude")).toFixed(6) + "," + Number(localStorage.getItem("latitude")).toFixed(6)
      }).success(function (data) {
        console.log(data);
        var addressComponent = data.regeocode.addressComponent;
        $scope.cityName = addressComponent.city ? addressComponent.city.replace("市", "") : addressComponent.province.replace("市", "");

      })
    });
    //城市选择modal
    CommonService.customModal($scope, 'templates/modal/citymodal.html');
    //点击选择城市
    $scope.openCustomModal = function () {
      $scope.city = {};//城市相关json数据
      $scope.modal.show();
      AccountService.selectCity($scope);
    }
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
          if (data.code = 1001) {
            $state.go('tab.account');
          }
          CommonService.platformPrompt(data.message, 'close');

        })
      } else if ($scope.type == 'sex') {//修改性别
        AccountService.modifySex($scope.params).success(function (data) {
          if (data.code = 1001) {
            $state.go('tab.account');
          }
          CommonService.platformPrompt(data.message, 'close');

        })
      }
    }

  })

  //地址详细列表
  .controller('MyAddressCtrl', function ($scope, $state, $rootScope, $ionicHistory, CommonService, AddressService, AccountService) {
    if ($rootScope.addrlistFirst) {
      $scope.selectAddress = function (item) {
        $rootScope.addrlistFirst = []
        $rootScope.addrlistFirst.push(item);
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
        console.log(data);
        $scope.isNotData = false;
        if (data.data == null || data.data.length == 0) {
          $scope.isNotData = true;
          $rootScope.addrlistFirst = [];//无交易地址的时候清除数据
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
    $scope.deleteAddr = function (addrid, status) {
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
  .controller('AddAddressCtrl', function ($scope, $rootScope, $state, CommonService, AccountService, AddressService, $ionicHistory) {
      CommonService.customModal($scope, 'templates/modal/addressmodal.html');
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

      //获取省市县
      $scope.getAddressPCCList = function (item) {
        AddressService.getAddressPCCList($scope, item)
      }
      //打开选择省市县modal
      $scope.openModal = function () {
        $scope.modal.show();
        $scope.getAddressPCCList();
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
      }
      //增加地址方法
      $scope.dealaddresssubmit = function () {
        console.log($scope.addressiteminfo);
        $scope.addrinfo.addrid = $scope.addressiteminfo ? $scope.addressiteminfo.ID : null;//传入id 则是修改地址
        $scope.addrinfo.userid = localStorage.getItem("userid");//用户id
        $scope.addrinfo.addrcode = $scope.addrareacountyone ? $scope.addrareacountyone.ID : $scope.addressiteminfo.AddrCode;	//地区id
        $scope.addrinfo.is_default = $scope.addrinfoother.isstatus ? 1 : 0;	//是否默认0-否，1-是
        $scope.addrinfo.lat = $scope.addrareacountyone ? $scope.addrareacountyone.Lat : $scope.addressiteminfo.Lat;	//纬度
        $scope.addrinfo.lng = $scope.addrareacountyone ? $scope.addrareacountyone.Lng : $scope.addressiteminfo.Lng; 	//经度
        console.log($scope.addrinfo);
        AddressService.addAddress($scope.addrinfo).success(function (data) {
          if (data.code == 1001) {
            CommonService.platformPrompt('恭喜您 地址信息' + $scope.buttonText + '成功', '');
          } else {
            CommonService.platformPrompt('地址信息' + $scope.buttonText + '失败', 'close');
          }
        })

      }
    }
  )

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
          CommonService.platformPrompt('绑定手机号失败', 'close');
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
          CommonService.platformPrompt('绑定邮箱失败', 'close');
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
    //上传照片
    $scope.uploadActionSheet = function () {
      CommonService.uploadActionSheet($scope, 'User');
    }

    //获取实名认证信息
    if ($scope.status == 3) { //已认证
      $scope.params = {
        userid: localStorage.getItem("userid")
      }
      AccountService.getrealNameIdentity($scope.params).success(function (data) {
        if (data.code == 1001) {
          $scope.realname = data.data;
        } else {
          CommonService.platformPrompt('获取实名认证信息失败', 'close');
        }

      })
    }

    //申请实名认证
    $scope.addCertificationName = function () {
      if ($scope.ImgsPicAddr.length == 0) {
        CommonService.platformPrompt("请先上传认证照片后再提交", 'close');
        return;
      }

      $scope.datas = {
        userid: localStorage.getItem("userid"),	//当前用户userid
        name: $scope.realname.name,	    //姓名
        no: $scope.realname.no,	//身份证号码
        frontpic: $scope.ImgsPicAddr[0]	//身份证照片地址。必须上传、上传使用公用上传图片接口
      }
      AccountService.realNameAuthenticate($scope.datas).success(function (data) {
        if (data.code == 1001) {
          CommonService.platformPrompt('实名认证提交成功,我们会尽快处理', 'accountsecurity');
          /*          CommonService.showAlert('', '<p>温馨提示:您的认证信息已经</p><p>提交成功,我们会尽快处理！</p>', '')*/
        } else {
          CommonService.platformPrompt('实名认证失败', 'close');
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
          CommonService.showAlert('', '<p>温馨提示:您的反馈我们已经接收,</p><p>我们会针对您的问题尽快做出答复,</p><p>非常感谢您对博绿网的支持！</p>', '')
        } else {
          CommonService.platformPrompt('提交反馈失败', 'close');
        }
      })
    }
  })


  //帮助信息共用模板
  .controller('HelpCtrl', function ($scope, $rootScope, $stateParams, $state, BoRecycle, CommonService, AccountService, WeiXinService) {
    CommonService.customModal($scope, 'templates/modal/share.html');
    $scope.getHelpDetails = function () {
      var id = $stateParams.ID;
      if (id == 11) {
        $scope.title = '登录注册协议';
      }
      if (id == 12) {
        $scope.title = '提升额度';
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
          CommonService.shareActionSheet($scope.helpdata.Title, $scope.helpdata.Abstract, BoRecycle.moblileApi + '/#/help/' + id, '');
        }
        //调用分享面板
        $scope.shareActionSheet = function () {
          //   umeng.share($scope.helpdata.Title, $scope.helpdata.Abstract, '', BoRecycle.moblileApi + '/#/help/' + id);
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
  .controller('InformationCtrl', function ($scope, CommonService, BoRecycle, AccountService, AddressService, OrderService) {
    CommonService.customModal($scope, 'templates/modal/addressmodal.html');
    $scope.dengji = {};//登记信息
    $scope.addrinfo = {};

    //获取产品品类
    OrderService.getProductList({ID: "", Name: ""}).success(function (data) {
      console.log(data);
      if (data.code == 1001) {
        $scope.productList = data.data;
      } else {
        CommonService.platformPrompt("获取产品品类失败", 'close');
      }
    }).then(function () {
      $scope.checkChecded = function () {
        $scope.recyclingCategory = [];//回收品类数组
        CommonService.checkChecded($scope, $scope.productList);
        angular.forEach($scope.productList, function (item) {
          if (item.checked) {
            $scope.recyclingCategory.push(item.grpid);
          }
        })
        console.log($scope.recyclingCategory.join(","));
        OrderService.getListManufacte({
          ShorteName: '',
          Name: '',
          GrpID: ''// $scope.recyclingCategory.join(",")
        }).success(function (data) {
          console.log(data);
          if (data.code == 1001) {
            $scope.manufacteList = data.data
          } else {
            CommonService.platformPrompt("获取品类所属厂商失败", 'close');
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
    //获取当前位置 定位
    $scope.location = function () {
      CommonService.getLocation(function () {
        //当前位置 定位
        AccountService.getCurrentCityName({
          key: BoRecycle.gaoDeKey,
          location: Number(localStorage.getItem("longitude")).toFixed(6) + "," + Number(localStorage.getItem("latitude")).toFixed(6)
        }).success(function (data) {
          var addressComponent = data.regeocode.addressComponent;
          $scope.dengji.addrdetail = addressComponent.township + addressComponent.streetNumber.street;
        })
      })

    }

    //信息登记提交
    $scope.informationSubmit = function () {


      //添加登记信息/货源信息(添加登记货源时明细不能为空，添加登记信息时明细为空)
      /*      OrderService.addDengJi($scope.dengji).success(function (data) {
       console.log(data);
       CommonService.platformPrompt(data.message, 'close');
       })*/

    }
  })

  //登记货源
  .controller('SupplyOfGoodsCtrl', function ($scope, CommonService) {

  })
