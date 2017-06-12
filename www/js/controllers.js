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
  //登录页面
  .controller('RegisterCtrl', function ($scope, $rootScope, CommonService, AccountService) {

  })
  //我的设置页面
  .controller('AccountCtrl', function ($scope, $rootScope, CommonService) {
    $scope.settings = {
      enableFriends: true
    };
  });
