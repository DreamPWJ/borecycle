// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'starter.controllers', 'starter.services', 'starter.config', 'starter.directive', 'starter.filter', 'ngCordova', 'ionic-native-transitions'])

  .run(function ($ionicPlatform, $rootScope, $location, $ionicHistory, $cordovaToast, $cordovaNetwork, CommonService, MainService, $state) {
    $ionicPlatform.ready(function () {
      localStorage.setItem("isStart", true);//记录首页启动轮播展示图已经展示

      if (window.StatusBar) {
        //状态栏颜色设置
        // org.apache.cordova.statusbar required
        if ($ionicPlatform.is('ios')) {
          StatusBar.styleLightContent();
        }
        if ($ionicPlatform.is('android')) {
          StatusBar.backgroundColorByHexString("#00ACFF");
        }

      }

      //hide splash immediately 加载完成立刻隐藏启动画面
      if (navigator && navigator.splashscreen) {
        setTimeout(function () { //延迟显示 让页面先加载 不显示不美观的加载过程
          navigator.splashscreen.hide();
        }, 500);

      }

      // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
      // for form inputs)
      if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
        cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        cordova.plugins.Keyboard.disableScroll(true);

      }
      //主页面显示退出提示
      $ionicPlatform.registerBackButtonAction(function (e) {
        e.preventDefault();
        if ($location.path() == '/mobilelogin') {//登录页面
          $state.go("tab.main");//返回主页
          return;
        }
        // Is there a page to go back to? 制定页面返回退出程序
        if ($location.path() == '/tab/main') {
          if ($rootScope.backButtonPressedOnceToExit) {
            ionic.Platform.exitApp();
          } else {
            $rootScope.backButtonPressedOnceToExit = true;
            $cordovaToast.showShortCenter('再按返回退出收收');
            setTimeout(function () {
              $rootScope.backButtonPressedOnceToExit = false;
            }, 2000);
          }

        } else if ($ionicHistory.backView()) {
          // Go back in history
          $ionicHistory.goBack();
        } else {
        }

        return false;
      }, 101);
      //启动极光推送服务
      try {
        window.plugins.jPushPlugin.init();
      } catch (e) {
        console.log(e);
      }

      function resume() {
        if (window.plugins.jPushPlugin.isPlatformIOS()) {
          window.plugins.jPushPlugin.setBadge(0);
          window.plugins.jPushPlugin.resetBadge();
          window.plugins.jPushPlugin.setApplicationIconBadgeNumber(0);
        } else if (device.platform == "Android") {
          window.plugins.jPushPlugin.setLatestNotificationNum(5);
          window.plugins.jPushPlugin.clearAllNotification();
        }
      }

      // System events
      document.addEventListener("resume", resume, false);

      //点击极光推送跳转到相应页面/点击通知栏的回调
      var onOpenNotification = function (data) {
        try {
          var blno = ""; //订单号
          if (device.platform == "Android") {
            blno = data.extras.BLNo; //订单号
          } else {
            blno = data.BLNo; //订单号
          }
          $state.go("myorderdetails", {no: blno});//订单详情
        } catch (exception) {
          console.log("JPushPlugin:onOpenNotification" + exception);
        }
      };
      document.addEventListener("jpush.openNotification", onOpenNotification, false)

      //调试模式，这样报错会在应用中弹出一个遮罩层显示错误信息
      //window.plugins.jPushPlugin.setDebugMode(true);

      //判断网络状态以及横屏事件
      document.addEventListener("deviceready", function () {
        // listen for Online event
        $rootScope.$on('$cordovaNetwork:online', function (event, networkState) {
          var onlineState = networkState;
          if (onlineState == '2g') {
            CommonService.platformPrompt("您当前的网络是2G网络，为了不影响您的使用，请切换到4G或wifi网络再使用", 'close');
          }
        })

        // listen for Offline event
        $rootScope.$on('$cordovaNetwork:offline', function (event, networkState) {
          var offlineState = networkState;
          //提醒用户的网络异常
          CommonService.platformPrompt("网络异常 无法连接收收服务器", 'close');
        })
        //添加JS 屏幕监听事件 禁止APP 横屏
        if (screenOrientation) {
          screenOrientation.setOrientation('portrait');
        }

      }, false);

      //打开外部网页
      if (window.cordova && window.cordova.InAppBrowser) {
        window.open = window.cordova.InAppBrowser.open;
      }

      //统一授权
      $rootScope.$on('$ionicView.beforeEnter', function (event, data) {
        //获取公共接口授权token  公共接口授权token两个小时失效  超过两个小时重新请求
        if (!localStorage.getItem("userid") && (!localStorage.getItem("token") || localStorage.getItem("token") == "undefined" || ((new Date().getTime() - new Date(localStorage.getItem("expires_in")).getTime()) / 1000) > 7199)) {
          MainService.authLogin({grant_type: 'client_credentials'}).success(function (data) {
            if (data.access_token) {
              localStorage.setItem("token", data.access_token);//公共接口授权token
              localStorage.setItem("expires_in", new Date());//公共接口授权token 有效时间
            } else {
              CommonService.platformPrompt("获取公众接口授权token失败", 'close');
              return;
            }
          })
        } else if (localStorage.getItem("userid") && ((new Date().getTime() - new Date(localStorage.getItem("expires_in")).getTime()) / 1000) > 7199) {
          //登录授权
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
      });

    });
  })

  .config(function ($stateProvider, $locationProvider, $urlRouterProvider, $ionicConfigProvider, $ionicNativeTransitionsProvider) {
    /* 设置平台特性*/
    $ionicConfigProvider.platform.ios.tabs.style('standard');
    $ionicConfigProvider.platform.ios.tabs.position('bottom');
    $ionicConfigProvider.platform.android.tabs.style('standard');
    $ionicConfigProvider.platform.android.tabs.position('bottom');

    $ionicConfigProvider.platform.ios.navBar.alignTitle('center');
    $ionicConfigProvider.platform.android.navBar.alignTitle('center');

    $ionicConfigProvider.platform.ios.backButton.previousTitleText('').icon('ion-ios-arrow-left');
    $ionicConfigProvider.platform.android.backButton.previousTitleText('').icon('ion-ios-arrow-left');

    $ionicConfigProvider.platform.ios.views.transition('ios');
    $ionicConfigProvider.platform.android.views.transition('android');
    //设置默认返回按钮的文字
    $ionicConfigProvider.backButton.previousTitleText(false).text('');

    // $ionicConfigProvider.views.maxCache(15);
    // $ionicConfigProvider.views.transition('platform');
    // $ionicConfigProvider.views.forwardCache(true); // 缓存下一页

    // false 默认所有的滚动使用native，会比js的滚动快很多，并且很平滑 ; 安卓使用,ios不使用
    $ionicConfigProvider.scrolling.jsScrolling(false);
    //Checkbox style. Android defaults to square and iOS defaults to circle
    $ionicConfigProvider.form.checkbox('circle');
    //Toggle item style. Android defaults to small and iOS defaults to large.
    $ionicConfigProvider.form.toggle('large');
    //原生动画效果统一配置
    $ionicNativeTransitionsProvider.setDefaultOptions({
      duration: 300, // in milliseconds (ms), default 400,
      slowdownfactor: 10, // overlap views (higher number is more) or no overlap (1), default 4
      iosdelay: -1, // ms to wait for the iOS webview to update before animation kicks in, default -1
      androiddelay: -1, // same as above but for Android, default -1
      winphonedelay: -1, // same as above but for Windows Phone, default -1,
      fixedPixelsTop: 0, // the number of pixels of your fixed header, default 0 (iOS and Android)
      fixedPixelsBottom: 0, // the number of pixels of your fixed footer (f.i. a tab bar), default 0 (iOS and Android)
      triggerTransitionEvent: '$ionicView.beforeEnter', // internal ionic-native-transitions option
      backInOppositeDirection: false // Takes over default back transition and state back transition to use the opposite direction transition to go back
    });
    $ionicNativeTransitionsProvider.setDefaultTransition({
      type: 'slide',
      direction: 'left'
    });
    $ionicNativeTransitionsProvider.setDefaultBackTransition({
      type: 'slide',
      direction: 'right'
    });

    //在ionic这个框架下(Angular JS)，对URL进行重写，过滤掉URL中的#号
    //$locationProvider.html5Mode(true);

    // Ionic uses AngularUI Router which uses the concept of states
    // Learn more here: https://github.com/angular-ui/ui-router
    // Set up the various states which the app can be in.
    // Each state's controller can be found in controllers.js
    $stateProvider

    // setup an abstract state for the tabs directive
      .state('tab', {
        url: '/tab',
        abstract: true,
        cache: true,
        templateUrl: 'templates/tabs.html',
        controller: 'TabsCtrl'
      })

      // Each tab has its own nav history stack:

      //APP首页面
      .state('tab.main', {
        url: '/main',
        nativeTransitions: null,
        cache: true,
        views: {
          'tab-main': {
            templateUrl: 'templates/main.html',
            controller: 'MainCtrl'
          }
        }
      })

      //APP初次启动轮播图片
      .state('start', {
        url: '/start',
        templateUrl: 'templates/start.html',
        controller: 'StartCtrl'
      })

      //参考价页面
      .state('referenceprice', {
        url: '/referenceprice',
        templateUrl: 'templates/referenceprice.html',
        controller: 'ReferencePriceCtrl'

      })

      //我的接单订单页面
      .state('jiedan', {
        url: '/jiedan/:hytype', //orderType类型 0是我的回收单  1.接单收货（回收者接的是“登记信息”） 2.货源归集（货场接的是“登记货源”）
        cache: false,
        templateUrl: 'templates/order/jiedan.html',
        controller: 'jiedanCtrl'

      })

      //我的回收订单页面
      .state('order', {
        url: '/order/:state', //orderType类型 0是我的回收单  1.接单收货（回收者接的是“登记信息”） 2.货源归集（货场接的是“登记货源”）
        cache: false,
        templateUrl: 'templates/order.html',
        controller: 'OrderCtrl'

      })

      //我的回收单订单详情页面
      .state('orderdetails', {
        url: '/orderdetails/:no/:type/:hytype',
        cache: false,
        templateUrl: 'templates/order/orderdetails.html',
        controller: 'OrderDetailsCtrl'

      })

      //我的订单页面
      .state('myorder', {
        url: '/myorder',
        cache: false,
        templateUrl: 'templates/order/myorder.html',
        controller: 'MyOrderCtrl'

      })

      //我的订单详情页面
      .state('myorderdetails', {
        url: '/myorderdetails/:no',
        cache: false,
        templateUrl: 'templates/order/myorderdetails.html',
        controller: 'MyOrderDetailsCtrl'

      })

      //我的订单预警页面
      .state('orderwarning', {
        url: '/orderwarning',
        cache: false,
        templateUrl: 'templates/order/orderwarning.html',
        controller: 'OrderWarningCtrl'

      })

      //我的回收录单页面
      .state('recycleorder', {
        url: '/recycleorder/:orderinfo',
        cache: false,
        templateUrl: 'templates/orderreceipt/recycleorder.html',
        controller: 'RecycleOrderCtrl'

      })

      //回收数量以及报价
      .state('recyclewrite', {
        url: '/recyclewrite/:orderinfo/:item',
        cache: false,
        templateUrl: 'templates/orderreceipt/recyclewrite.html',
        controller: 'RecycleWriteCtrl'
      })

      //付款页面
      .state('payment', {
        url: '/payment/:orderinfo',
        cache: false,
        templateUrl: 'templates/orderreceipt/payment.html',
        controller: 'PaymentCtrl'
      })

      //导航页面
      .state('navigation', {
        url: '/navigation/:longitude/:latitude',
        cache: false,
        templateUrl: 'templates/order/navigation.html',
        controller: 'NavigationCtrl'

      })

      //通知消息列表
      .state('tab.news', {
        url: '/news',
        cache: false,
        nativeTransitions: null,
        views: {
          'tab-news': {
            templateUrl: 'templates/news.html',
            controller: 'NewsCtrl'
          }
        }
      })

      //我的账号
      .state('tab.account', {
        url: '/account',
        cache: false,
        nativeTransitions: null,
        views: {
          'tab-account': {
            templateUrl: 'templates/account.html',
            controller: 'AccountCtrl'
          }
        }
      })

      //账号信息
      .state('accountinfo', {
        url: '/accountinfo',
        cache: false,
        templateUrl: 'templates/account/accountinfo.html',
        controller: 'AccountInfoCtrl'
      })

      //修改用户头像图片
      .state('uploadhead', {
        url: '/uploadhead/:figure',
        templateUrl: 'templates/account/uploadhead.html',
        controller: 'UploadHeadCtrl'
      })

      //修改用户信息
      .state('updateuser', {
        url: '/updateuser/:type/:value',
        templateUrl: 'templates/account/updateuser.html',
        controller: 'UpdateUserCtrl'
      })

      //地址详细列表
      .state('myaddress', {
        url: '/myaddress',
        cache: false,
        templateUrl: 'templates/account/myaddress.html',
        controller: 'MyAddressCtrl'

      })

      //添加地址
      .state('addaddress', {
        url: '/addaddress',
        cache: false,
        templateUrl: 'templates/account/addaddress.html',
        controller: 'AddAddressCtrl'

      })

      //我的设置
      .state('setting', {
        url: '/setting',
        cache: false,
        templateUrl: 'templates/account/setting.html',
        controller: 'SettingCtrl'
      })

      //设置安全
      .state('accountsecurity', {
        url: '/accountsecurity',
        cache: false,
        templateUrl: 'templates/account/accountsecurity.html',
        controller: 'AccountSecurityCtrl'
      })

      //绑定手机
      .state('bindingmobile', {
        url: '/bindingmobile/:status',
        cache: false,
        templateUrl: 'templates/account/bindingmobile.html',
        controller: 'BindingMobileCtrl'
      })

      //绑定邮箱
      .state('bindingemail', {
        url: '/bindingemail/:status',
        cache: false,
        templateUrl: 'templates/account/bindingemail.html',
        controller: 'BindingEmailCtrl'
      })

      //实名认证
      .state('realname', {
        url: '/realname/:status',
        cache: false,
        templateUrl: 'templates/account/realname.html',
        controller: 'RealNameCtrl'
      })

      //帮助与反馈
      .state('helpfeedback', {
        url: '/helpfeedback',
        cache: false,
        templateUrl: 'templates/account/helpfeedback.html',
        controller: 'HelpFeedBackCtrl'
      })

      //帮助信息共用模板
      .state('help', {
        url: '/help/:ID',
        templateUrl: 'templates/account/help.html',
        controller: 'HelpCtrl'
      })

      //用户密码登录页面
      .state('login', {
        url: '/login',
        cache: false,
        templateUrl: 'templates/login.html',
        controller: 'LoginCtrl'
      })

      //手机验证登录页面
      .state('mobilelogin', {
        url: '/mobilelogin',
        cache: false,
        templateUrl: 'templates/account/mobilelogin.html',
        controller: 'MobileLoginCtrl'
      })

      //注册页面
      .state('register', {
        url: '/register',
        cache: false,
        templateUrl: 'templates/account/register.html',
        controller: 'RegisterCtrl'
      })

      //找回密码
      .state('findpassword', {
        url: '/findpassword',
        cache: false,
        templateUrl: 'templates/account/findpassword.html',
        controller: 'FindPasswordCtrl'
      })

      //完善资料页面
      .state('organizingdata', {
        url: '/organizingdata/:type',
        cache: false,
        templateUrl: 'templates/account/organizingdata.html',
        controller: 'OrganizingDataCtrl'
      })

      //登记信息
      .state('information', {
        url: '/information',
        cache: false,
        templateUrl: 'templates/dengji/information.html',
        controller: 'InformationCtrl'
      })

      //登记货源
      .state('supplyofgoods', {
        url: '/supplyofgoods',
        cache: false,
        templateUrl: 'templates/dengji/supplyofgoods.html',
        controller: 'SupplyOfGoodsCtrl'
      })

      //评论页面
      .state('evaluate', {
        url: '/evaluate/:no/:type',
        cache: false,
        templateUrl: 'templates/dengji/evaluate.html',
        controller: 'EvaluateCtrl'
      })

      //取消订单
      .state('cancelorder', {
        url: '/cancelorder/:no/:type', //订单号  订单类型 1.回收单 2.登记单
        cache: false,
        templateUrl: 'templates/orderreceipt/cancelorder.html',
        controller: 'CancelOrderCtrl'
      })

      //修改回收品类
      .state('modifycategory', {
        url: '/modifycategory',
        cache: false,
        templateUrl: 'templates/account/modifycategory.html',
        controller: 'ModifyCategoryCtrl'
      })

      //我的钱包
      .state('wallet', {
        url: '/wallet',
        cache: false,
        templateUrl: 'templates/wallet/index.html',
        controller: 'WalletCtrl'
      })

      //提现
      .state('cash', {
        url: '/cash',
        cache: false,
        templateUrl: 'templates/wallet/cash.html',
        controller: 'CashCtrl'
      })

      //交易列表
      .state('transactionlist', {
        url: '/transactionlist',
        cache: false,
        templateUrl: 'templates/wallet/transactionlist.html',
        controller: 'TransactionlistCtrl'
      })

      //我的银行卡
      .state('bankcard', {
        url: '/bankcard',
        cache: false,
        templateUrl: 'templates/wallet/bankcard.html',
        controller: 'BankcardCtrl'
      })

      //添加银行卡
      .state('addcard', {
        url: '/addcard',
        cache: false,
        templateUrl: 'templates/wallet/addbankcard.html',
        controller: 'AddcardCtrl'
      })

      //充值
      .state('recharge', {
        url: '/pay/recharge',
        cache: false,
        templateUrl: 'templates/wallet/recharge.html',
        controller: 'RechargeCtrl'
      })

      //生成邀请码
      .state('tuiguang', {
        url: '/tuiguang',
        cache: false,
        templateUrl: 'templates/tuiguang/index.html',
        controller: 'tuiguangCtrl'
      })

      //信息费标准
      .state('infee', {
        url: '/infee',
        cache: true,
        templateUrl: 'templates/infofee.html',
        controller: 'infeeCtrl'
      })

      //下载页
      .state('download', {
        url: '/download',
        cache: true,
        templateUrl: 'templates/download.html',
        controller: 'downloadCtrl'
      })

    // if none of the above states are matched, use this as the fallback
    //动态判断是否显示初始化页面
    if (localStorage.getItem('isStart')) {
      $urlRouterProvider.otherwise('/tab/main');
    } else {
      $urlRouterProvider.otherwise('start');
    }
  });
