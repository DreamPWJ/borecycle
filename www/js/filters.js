/*自定义过滤器*/
angular.module('starter.filter', [])
  .filter('substring', function () {
    return function (str) {
      if (str.length >= 40) {
        return str.substr(0, 40) + "...";
      }
      return str;
    }
  })
  .filter('hidepartinfo', function () { //隐藏部分信息 如手机  188****2302  潘**
    return function (str, type) {
      if(!str){
        return;
      }
      if (type == 'name') { //姓名信息
        return str.replace(str.length>=3?str.substr(1,2):str.substr(1,1), str.length>=3?'**':'*');
      }
      if (type == 'phone') { //手机信息
        return str.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
      }
      if (type == 'address') { //地址信息
        return str.replace(str.substring(str.lastIndexOf(','),str.length), '*****');
      }
    }
  })
