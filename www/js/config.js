/**
 * Created by pwj on 2017/6/1.
 * 系统接口常量配置
 */
var configMod = angular.module("starter.config", []);

configMod.constant("BoRecycle", {
  'name': 'BoRecycle', //项目名称
  'debug': false, //调试标示
  'api': 'https://hs.api.boolv.com',//接口服务地址  使用
  'siteUrl': 'http://a.boolv.com',//仓库地址 暂无使用
  'imgUrl': 'http://f.boolv.com',//图片地址
  'mobApi': 'http://s.boolv.com',//手机端服务  使用（分享链接展示等调用）
  'gaoDeKey': '972cafdc2472d8f779c5274db770ac22',//高德web API服务key
  'version': '1.0.4' //当前版本号
});

