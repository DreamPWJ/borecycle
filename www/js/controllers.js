angular.module('starter.controllers', [])
  .config(function ($httpProvider) { //统一配置设置
    //服务注册到$httpProvider.interceptors中  用于接口授权
    $httpProvider.interceptors.push('MyInterceptor');
    /* $httpProvider.defaults.headers.common['Authorization'] = localStorage.getItem('token');*/
    /*    $http.defaults.cache = true/false;*/
  })


  //APP首页面
  .controller('MainCtrl', function ($scope, $rootScope, CommonService, $ionicHistory, $ionicSlideBoxDelegate) {
    $scope.imgsPicAddr = [];//图片信息数组
    $scope.imageList = [];  //上传图片数组集合
    $scope.uploadActionSheet = function () {
      CommonService.uploadActionSheet($scope, "upload", true);
    }
    //获取广告图
    /*    MainService.getAdMsg().success(function (data) {
     $scope.adImg = data.Values;
     //ng-repeat遍历生成一个个slide块的时候，执行完成页面是空白的 手动在渲染之后更新一下，在控制器注入$ionicSlideBoxDelegate，然后渲染数据之后
     $timeout(function () {
     $ionicSlideBoxDelegate.$getByHandle("slideboximgs").update();
     //上面这句就是实现无限循环的关键，绑定了滑动框，
     $ionicSlideBoxDelegate.$getByHandle("slideboximgs").loop(true);
     /!*            console.log($ionicSlideBoxDelegate.$getByHandle("slideboximgs").slidesCount());*!/
     }, 100)
     })*/

    //在首页中清除导航历史退栈
    $scope.$on('$ionicView.afterEnter', function () {
      $ionicHistory.clearHistory();
    })
  })

  //登录页面
  .controller('LoginCtrl', function ($scope, $rootScope, CommonService, AccountService) {
    $scope.user = {};//提前定义用户对象
    $scope.loginSubmit = function () {
      AccountService.login($scope.user).success(function (data) {
        CommonService.getStateName();   //跳转页面
      }).error(function () {
        CommonService.platformPrompt("登录失败!", 'close');
      })
    }
  })

  //注册页面
  .controller('RegisterCtrl', function ($scope, CommonService, AccountService) {
    $scope.user = {};//定义用户对象
    $scope.paracont = "获取验证码"; //初始发送按钮中的文字
    $scope.paraclass = true; //控制验证码的disable
    $scope.getVerifyCode = function () {
      event.preventDefault();
      event.stopPropagation();
      if ($scope.paraclass) { //按钮可用
        //60s倒计时
        AccountService.countDown($scope);
        AccountService.getVerifyCode({
          mobile: localStorage.getItem("login_name"),
          isFindPwd: "2"
        }).success(function (data) {
          if (data.status == 1) {
            $scope.verify = data.data.info.verify;
          } else {
            CommonService.platformPrompt(data.info, 'close');
          }

        })
      }
    }
  })

  //参考价页面
  .controller('ReferencePriceCtrl', function ($scope, CommonService) {

  })

  //我的订单页面
  .controller('OrderCtrl', function ($scope, CommonService, $ionicSlideBoxDelegate) {
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
  })

  //通知消息列表
  .controller('NewsCtrl', function ($scope, CommonService, NewsService, $ionicScrollDelegate) {
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
        userid: localStorage.getItem("usertoken")//用户id
      }
      NewsService.getNewsList($scope.params).success(function (data) {
        $scope.isNotData = false;
        if (data.Values == null || data.Values.data_list == 0) {
          $scope.isNotData = true;
          return
        }
        angular.forEach(data.Values.data_list, function (item) {
          $scope.newsList.push(item);
        })
        $scope.total = data.Values.page_count;
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
  .controller('AccountCtrl', function ($scope, CommonService) {
    //是否登录
    /*    if (!CommonService.isLogin(true)) {
     return;
     }*/
    CommonService.customModal($scope, 'templates/modal/share.html');

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
  .controller('AccountInfoCtrl', function ($scope, CommonService,AccountService) {
    /*    $scope.isprovider = JSON.parse(localStorage.getItem("user")).grade == 5 ? true : false*/

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
    $scope.uploadtype = 5;//上传媒体操作类型 1.卖货单 2 供货单 3 买货单 4身份证 5 头像
    $scope.uploadActionSheet = function () {
      CommonService.uploadActionSheet($scope, 'User');
    }
  })

  //修改用户信息
  .controller('UpdateUserCtrl', function ($scope, $rootScope, $stateParams, $state, CommonService, AccountService) {
    $scope.type = $stateParams.type;
    $scope.value = $stateParams.value;

    $scope.user = {};
    $scope.updateUser = function () {
      $scope.params = {
        userid: localStorage.getItem("usertoken"),
        sex: $scope.user.sex,
        nickname: $scope.user.nickname
      }
      if ($scope.type == 'nickname') { //修改昵称
        AccountService.modifyNickname($scope.params).success(function (data) {
          $state.go('tab.account');
        })
      } else if ($scope.type == 'sex') {//修改性别
        AccountService.modifySex($scope.params).success(function (data) {
          $state.go('tab.account');
        })
      }
    }

  })
