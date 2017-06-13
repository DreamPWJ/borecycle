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
  .controller('RegisterCtrl', function ($scope, $rootScope, CommonService, AccountService) {
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
  //通知消息列表
  .controller('NewsCtrl', function ($scope, $rootScope, $state, CommonService, NewsService, $ionicScrollDelegate) {
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
  .controller('AccountCtrl', function ($scope, $rootScope, CommonService) {
    //是否登录
    /*    if (!CommonService.isLogin(true)) {
     return;
     }*/
  });
