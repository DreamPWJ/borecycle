angular.module('starter.directive', [])
  .directive('hideTabs', function ($rootScope) {  //隐藏底部tabs指令
    return {
      restrict: 'AE',
      link: function ($scope) {
        $rootScope.hideTabs = 'tabs-item-hide';
        //监听$destory事件,这个事件会在页面发生跳转的时候触发
        $scope.$on('$destroy', function () {
          $rootScope.hideTabs = ' ';
        })
      }
    }
  })
  .directive('hideShow', function () {  //点击触发显示隐藏元素指令
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        scope.showme = true;
        scope.toggle = function (arg) {//每次点击调用此方法都让scope.showme值反转1次
          if (arg == 0) {
            scope.showme = !scope.showme;
          }
        }
      }
    }
  })
  .directive('scrollTop', function ($ionicScrollDelegate) {//返回顶部指令
    return {
      restrict: 'AE',
      link: function (scope, element, attrs) {
        scope.scrollTop = function () {
          $ionicScrollDelegate.scrollTop(500);
        };
      }
    }
  })
  .directive('toolTip', [function () { //提示框tooltip

    return {
      restrict: 'EA',
      templateUrl: 'templates/popover/tooltip.html',
      scope: {
        message: "=",
        type: "="
      },
      link: function (scope, element, attrs) {

      }
    };
  }])
  .directive('checkForm', function ($rootScope, CommonService) {//验证表单类型 提示
    $rootScope.verifyarray = [];
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        $rootScope.commonService = CommonService;
        $rootScope.verify = true;
        $rootScope.verifyarray[scope.$id] = true;
        scope.publicCheckForm = function (regular, value, content,isshowtip) { //验证公共部分封装
          if (regular) {
            if(value==0){
              $rootScope.verifyarray[scope.$id] = false;
              $rootScope.verify = false;
              return;
            }
            $rootScope.verifyarray[scope.$id] = true;
            $rootScope.verify = true;
            angular.forEach($rootScope.verifyarray, function (item, index) {
              if (!item) {
                $rootScope.verify = false;
              }
            })
          } else {
            if (value || value == 0) {
              if(isshowtip){
                $rootScope.commonService.toolTip(content, '');
              }
              $rootScope.verifyarray[scope.$id] = false;
              $rootScope.verify = false;
            }
            if(!value){ //非必填清空不再验证 可下一步
              $rootScope.verifyarray[scope.$id] = true;
            }
          }
        }
        scope.checkForm = function (value, content, type, maxvalue) {
          if (type == 'mobilephone') {//验证手机号
            scope.publicCheckForm(/^1(3|4|5|7|8)\d{9}$/.test(value), value, content,true)
          }
          if (type == 'maxvalue') {//最大不能超过maxvalue值
            scope.publicCheckForm(value > 0 && value <= maxvalue, value, content,true);
          }
          if (type == 'positivenumber') {//正数验证(如 价格)
            scope.publicCheckForm(/^(0|[1-9][0-9]{0,9})(\.[0-9]{1,2})?$/.test(value), value, content,true)
          }
          if (type == 'positiveinteger') {//正整数
            scope.publicCheckForm(/^[1-9]\d*$/.test(value), value, content,true);
          }
          if (type == 'identitycard') {//验证身份证号
            scope.publicCheckForm(/^[1-9]\d{5}[1-9]\d{3}((0\d)|(1[0-2]))(([0|1|2]\d)|3[0-1])\d{3}([0-9]|X)$/.test(value), value, content,false)
          }
        };
        scope.checkAtLeastOne = function (array,keystr){  //检测相同遍历数据至少填写一个
          $rootScope.verifyLeastOne = false;
          angular.forEach(array,function (item,index) {
            if(item[keystr]){
              $rootScope.verifyLeastOne = true;
            }
           })
        }
      }
    }
  })
.directive('repeatFinish', function() { //利用angular指令监听ng-repeat渲染完成后执行脚本
  return {
    link: function(scope, element, attrs) {
      if (scope.$last) {                   // 这个判断意味着最后一个 OK
        scope.$eval(attrs.repeatFinish)    // 执行绑定的表达式
      }
    }
  }
})
