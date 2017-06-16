angular.module('starter.controllers', [])
  .config(function ($httpProvider) { //统一配置设置
    //服务注册到$httpProvider.interceptors中  用于接口授权
    $httpProvider.interceptors.push('MyInterceptor');
    /* $httpProvider.defaults.headers.common['Authorization'] = localStorage.getItem('token');*/
    /*    $http.defaults.cache = true/false;*/
  })


  //APP首页面
  .controller('MainCtrl', function ($scope, $rootScope, CommonService, $ionicHistory, $ionicSlideBoxDelegate) {

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
  .controller('AccountInfoCtrl', function ($scope, CommonService, AccountService, BoRecycle) {
    /*    $scope.isprovider = JSON.parse(localStorage.getItem("user")).grade == 5 ? true : false*/
    //获取定位信息
    $scope.cityName = "深圳";//默认地址
    CommonService.getLocation(function () {
      //获取首页地理位置城市名称
      AccountService.getCurrentCityName({
        key: BoRecycle.gaoDeKey,
        location: Number(localStorage.getItem("longitude")).toFixed(6) + "," + Number(localStorage.getItem("latitude")).toFixed(6)
      }).success(function (data) {
        if (data.status == 1) {
          var addressComponent = data.regeocode.addressComponent;
          $scope.cityName = addressComponent.city ? addressComponent.city.replace("市", "") : addressComponent.province.replace("市", "");
        }
      }).finally(function () {
        $scope.setLocation($scope.cityName);
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
    $scope.uploadtype = 5;//上传媒体操作类型 1.卖货单 2 供货单 3 买货单 4身份证 5 头像
    $scope.uploadActionSheet = function () {
      CommonService.uploadActionSheet($scope, 'User',true);
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

  //地址详细列表
  .controller('MyAddressCtrl', function ($scope, $state, $rootScope, $ionicHistory, CommonService, AccountService) {
    /* if ($rootScope.addrlistFirst) {
     $scope.selectAddress = function (item) {
     $rootScope.addrlistFirst = []
     $rootScope.addrlistFirst.push(item);
     $ionicHistory.goBack();
     }
     }
     $scope.addrlist = [];
     $scope.page = 0;
     $scope.total = 1;
     $scope.getAddrlist = function () {
     if (arguments != [] && arguments[0] == 0) {
     $scope.page = 0;
     $scope.addrlist = [];
     }
     $scope.page++;
     $scope.params = {
     page: $scope.page,
     size: 5,
     userid: localStorage.getItem("usertoken")
     }
     //获取用户常用地址
     AccountService.getAddrlist($scope.params).success(function (data) {
     $scope.isNotData = false;
     if (data.Values.data_list == null) {
     $scope.isNotData = true;
     $rootScope.addrlistFirst = [];//无交易地址的时候清除数据
     return;
     }
     angular.forEach(data.Values.data_list, function (item) {
     $scope.addrlist.push(item);
     })
     $scope.total = data.Values.page_count;
     }).finally(function () {
     $scope.$broadcast('scroll.refreshComplete');
     $scope.$broadcast('scroll.infiniteScrollComplete');
     })
     }
     $scope.getAddrlist(0);//交易地址加载刷新

     //删除用户常用地址
     $scope.deleteAddr = function (addrid, status) {
     if (JSON.parse(localStorage.getItem("user")).grade == 5 && status == 1) {//当会员是供货商（=5）时，默认地址不能删除
     CommonService.platformPrompt('供货商会员不能删除默认地址', 'close');
     return;
     }
     $scope.delparams = {
     id: addrid,
     userid: localStorage.getItem("usertoken")
     }
     AccountService.deleteAddr($scope.delparams).success(function (data) {
     $scope.getAddrlist(0);//重新加载列表
     })
     }
     //修改地址信息
     $scope.updateaddress = function (item) {
     $rootScope.addressitem = item;
     $state.go('adddealaddress');
     }*/

  })

  //添加地址
  .controller('AddAddressCtrl', function ($scope, $rootScope, $state, CommonService, BoRecycle, AccountService, $ionicHistory, $ionicScrollDelegate) {
    CommonService.customModal($scope, 'templates/modal/addressmodal.html');
    //去掉默认的只在下单的地方去掉，会员中心要显示
    if ($ionicHistory.backView().stateName == 'address') {
      $scope.isshowstatus = true;
    } else {
      $scope.isshowstatus = false;
    }


    $scope.addrinfo = {};
    $scope.addrinfoother = {};
    $scope.buttonText = '添加';
    $scope.addrcode = '0';
    //获取省市县
    $scope.getAddressPCCList = function (adcode) {
      if (isNaN(adcode) && adcode) {
        $scope.addresspcd = $scope.addrinfo.province + $scope.addrinfo.city + $scope.addrinfo.area;
        $scope.addrinfo.address = adcode;
        $scope.modal.hide();
        return;
      }
      AccountService.getDistrict({
        key: BoRecycle.gaoDeKey,
        keywords: adcode || "",
        showbiz: false
      }).success(function (data) {
        $scope.addressinfo = data.districts[0].districts;
        $scope.level = data.districts[0].level;
        if ($scope.level == "province") {
          $scope.addrinfo.province = data.districts[0].name;
        } else if ($scope.level == "city") {
          $scope.addrinfo.city = data.districts[0].name;
        } else if ($scope.level == "district") {
          $scope.addrinfo.area = data.districts[0].name;
        }
        $ionicScrollDelegate.scrollTop()
      }).error(function () {
        CommonService.platformPrompt("获取添加地址省市县失败", 'close');
      })
    }

    //打开选择省市县modal
    $scope.openModal = function () {
      $scope.modal.show();
      $scope.getAddressPCCList();
    }
    /*
     AccountService.getArea($scope.addrcode).success(function (data) {
     $scope.addrareaprovince = data.Values;
     })
     //选择省级联查询市
     $scope.selectProvince = function (addrcode) {
     AccountService.getArea(addrcode).success(function (data) {
     $scope.addrareacity = data.Values;
     $scope.addrinfoother.city = '';//清空市的选择项
     $scope.addrareacounty = {};//选择省的时候同时情况县
     $scope.addrinfo.addr = '';//清空详细地址
     })
     }
     //选择市级联查询县级
     $scope.selectCity = function (addrcode) {
     AccountService.getArea(addrcode).success(function (data) {
     $scope.addrareacounty = data.Values;
     $scope.addrinfoother.county = '';//清空县的选择项
     $scope.addrinfo.addr = '';//清空详细地址
     })
     }
     //选择县级
     $scope.selectAcounty = function (addrcode) {
     $scope.addrinfo.addr = '';//清空详细地址
     }

     if ($rootScope.addressitem && $rootScope.addressitem.length != 0) {//是否是修改信息
     $scope.addressiteminfo = $rootScope.addressitem;
     $scope.addrinfo.username = $scope.addressiteminfo.username;
     $scope.addrinfo.mobile = $scope.addressiteminfo.mobile;
     $scope.addrinfo.addr = $scope.addressiteminfo.addr;
     $scope.addrinfoother.isstatus = $scope.addressiteminfo.status == 1 ? true : false;
     /!* $scope.selectCity($rootScope.addressitem.addrcode);*!/
     $rootScope.addressitem = [];
     $scope.buttonText = '修改';
     //获取省市县信息赋值
     $scope.$on('$ionicView.beforeEnter', function () {
     AccountService.getAddrPCC({code: $scope.addressiteminfo.addrcode}).success(function (data) {
     $scope.pccinfo = data.Values;
     $scope.addrinfoother.province = $scope.pccinfo.province.toString();
     $scope.addrinfoother.city = $scope.pccinfo.city.toString();
     $scope.addrinfoother.county = $scope.pccinfo.county.toString();
     }).then(function () {
     //市级信息
     AccountService.getArea($scope.pccinfo.province).success(function (data) {
     $scope.addrareacity = data.Values;
     })
     //县级信息
     AccountService.getArea($scope.pccinfo.city).success(function (data) {
     $scope.addrareacounty = data.Values;
     })

     })
     })
     } else {//查询是否有默认地址
     $scope.addrinfoother.isstatus = true;
     }
     //增加地址方法
     $scope.dealaddresssubmit = function () {
     //选择县级查询当前记录
     angular.forEach($scope.addrareacounty, function (item) {
     if (item.code == $scope.addrinfoother.county) {
     $scope.addrareacountyone = item;
     }
     })
     $scope.addrinfo.id = $scope.addressiteminfo ? $scope.addressiteminfo.id : 0;//传入id 则是修改地址
     $scope.addrinfo.userid = localStorage.getItem("usertoken");//用户id
     $scope.addrinfo.tel = $scope.addrinfo.mobile;//固定电话
     $scope.addrinfo.addrcode = $scope.addrareacountyone.code;	//地区编码
     $scope.addrinfo.areaname = $scope.addrareacountyone.mergername; // 地区全称
     $scope.addrinfo.status = $scope.addrinfoother.isstatus ? 1 : 0;	//是否默认0-否，1-是
     $scope.addrinfo.postcode = $scope.addrareacountyone.zipcode;	//邮政编码
     $scope.addrinfo.lat = $scope.addrareacountyone.lat;	//纬度
     $scope.addrinfo.lon = $scope.addrareacountyone.lng; 	//经度
     $scope.addrinfo.addrtype = 0;//地址类型0-	交易地址（默认）1-	家庭住址2-公司地址
     $scope.addrinfo.addr = $scope.addrinfo.addr;
     AccountService.setAddr($scope.addrinfo).success(function (data) {
     if (data.Key == 200) {
     CommonService.showAlert('', '<p>恭喜您！</p><p>地址信息' + $scope.buttonText + '成功！</p>', '');
     } else {
     CommonService.platformPrompt('地址信息' + $scope.buttonText + '失败', 'close');
     }

     })

     }*/

  })

  //我的设置
  .controller('SettingCtrl', function ($scope, $rootScope, $state, BoRecycle, CommonService) {
    $scope.version = BoRecycle.version;
    $scope.securitylevel = '未知';
   /* var certstate = JSON.parse(localStorage.getItem("user")).certstate;
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
    }*/
  })

  //设置安全
  .controller('AccountSecurityCtrl', function ($scope, $rootScope, $state, CommonService, AccountService) {
/*    $scope.userid = localStorage.getItem("usertoken");
    AccountService.getUserInfo($scope.userid).success(function (data) {
      if (data.Key == 200) {
        localStorage.setItem('user', JSON.stringify(data.Values));
        $rootScope.userinfo = data.Values;
        var certstate = data.Values.certstate;//获取认证状态参数
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

    })*/
  })

  //解绑手机
  .controller('CancelMobileCtrl', function ($scope, $rootScope, $state, CommonService, AccountService) {
    $scope.user = {};//提前定义用户对象
    $scope.paracont = "获取验证码"; //初始发送按钮中的文字
    $scope.paraclass = false; //控制验证码的disable
    $scope.checkphone = function (mobilephone) {//检查手机号
      AccountService.checkMobilePhone($scope, mobilephone);
    }
    $scope.sendCode = function () {
      event.preventDefault();
      if ($scope.user.username != JSON.parse(localStorage.getItem("user")).mobile) {
        CommonService.platformPrompt("输入手机号与原手机号不一致", 'cancelmobile');
        return;
      }
      if ($scope.paraclass) { //按钮可用
        //60s倒计时
        AccountService.countDown($scope);
        AccountService.sendCode($scope.user.username).success(function (data) {
          $scope.user.passwordcode = data.Values;
        }).error(function () {
          CommonService.platformPrompt("验证码获取失败!", "close");
        })
      }
    }
    $scope.cancelMobileSubmit = function () {
      if ($scope.user.passwordcode != $scope.user.password) {
        CommonService.platformPrompt("输入验证码不正确", "close");
        return;
      }
      $state.go("bindingmobile", {'oldphone': $scope.user.username});//绑定页面
    }

  })

  //绑定手机
  .controller('BindingMobileCtrl', function ($scope, $rootScope, $state, $stateParams, CommonService, AccountService) {
    $scope.oldphone = $stateParams.oldphone;
    $scope.user = {};//提前定义用户对象
    $scope.paracont = "获取验证码"; //初始发送按钮中的文字
    $scope.paraclass = false; //控制验证码的disable
    $scope.checkphone = function (mobilephone) {//检查手机号
      AccountService.checkMobilePhone($scope, mobilephone);
    }
    $scope.sendCode = function () {
      event.preventDefault();
      if ($scope.paraclass) { //按钮可用
        //60s倒计时
        AccountService.countDown($scope);
        AccountService.sendCode($scope.user.username).success(function (data) {
          $scope.user.passwordcode = data.Values;
        }).error(function () {
          CommonService.platformPrompt("验证码获取失败!", 'close');
        })
      }
      $scope.bindingMobileSubmit = function () {
        if ($scope.user.passwordcode != $scope.user.password) {
          CommonService.platformPrompt("输入验证码不正确", 'close');
          return;
        }
        //修改手机号码
        $scope.datas = {
          userid: localStorage.getItem("usertoken"),		//用户id
          old_mobile: $scope.oldphone,		//旧用户手机号码
          new_mobile: $scope.user.username,	//新用户号码
          new_code: $scope.user.password	//短信验证码
        }
        AccountService.modifyMobile($scope.datas).success(function (data) {
          if (data.Key == 200) {
            CommonService.platformPrompt('修改手机号成功', 'tab.account');
          } else {
            CommonService.platformPrompt('修改手机号失败', 'close');
          }

        })
      }
    }
  })

  //实名认证
  .controller('RealNameCtrl', function ($scope, $rootScope, CommonService, AccountService) {
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
    $scope.params = {
      userid: localStorage.getItem("usertoken"),
    }
/*    AccountService.getCertification($scope.params).success(function (data) {
      $scope.certificationinfo = data.Values;
      console.log($scope.certificationinfo);
    })*/
    //申请实名认证
    $scope.addCertificationName = function () {
      if ($scope.ImgsPicAddr.length == 0) {
        CommonService.platformPrompt("请先上传认证照片后再提交!", 'close');
        return;
      }

      $scope.datas = {
        userid: localStorage.getItem("usertoken"),	//当前用户userid
        name: $scope.realname.name,	    //姓名
        no: $scope.realname.no,	//身份证号码
        frontpic: $scope.ImgsPicAddr[0]	//身份证照片地址。必须上传、上传使用公用上传图片接口
      }
      AccountService.certificationName($scope.datas).success(function (data) {
        if (data.Key == 200) {
          CommonService.showAlert('', '<p>温馨提示:您的认证信息已经</p><p>提交成功,我们会尽快处理！</p>', '')
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

  //绑定邮箱
  .controller('BindingEmailCtrl', function ($scope, $rootScope, CommonService, AccountService) {
    $rootScope.email = {};//邮箱
    //发送验证邮件
    $scope.sendEmail = function () {
      $scope.params = {
        email: $rootScope.email.No//邮箱号
      }

      AccountService.sendEmailCode($scope.params).success(function (data) {
        if (data.Key == 200) {
          $rootScope.email.rescode = data.Values;
          CommonService.showAlert('', '<p>温馨提示:验证邮件已经发送到您的</p><p>邮箱,请尽快去您的邮箱进行验证！</p>', 'authenticationemail')
        } else {
          CommonService.platformPrompt('发送邮件失败', 'close');
        }
      })
    }
  })

  //认证邮箱
  .controller('AuthenticationEmailCtrl', function ($scope, $rootScope, CommonService, AccountService) {
    $scope.verify = true;
    //认证邮箱
    $scope.authenticationEmail = function () {
      if ($rootScope.email.rescode != $rootScope.email.code) {
        CommonService.platformPrompt('邮箱认证码输入错误', 'close');
        return;
      }
      $scope.datas = {
        userid: localStorage.getItem("usertoken"),		//用户id
        email: $rootScope.email.No,//邮箱号
        code: $rootScope.email.code //邮箱验证码
      }
      AccountService.authEmail($scope.datas).success(function (data) {
        if (data.Key == 200) {
          CommonService.platformPrompt('认证邮箱成功');
          $scope.verify = false;
        } else {
          CommonService.platformPrompt('认证邮箱失败', 'close');
        }
      })
    }
  })

  //帮助信息共用模板
  .controller('HelpCtrl', function ($scope, $rootScope, $stateParams, $state, BooLv, CommonService, MainService, WeiXinService) {

    $scope.getHelpDetails = function () {
      var id = $stateParams.ID;
      if (id == 11) {
        $scope.title = '登录注册协议';
      }
      if (id == 12) {
        $scope.title = '提升额度';
      }
      if (id == 13) {
        $scope.title = '关于我们';
      }
      if (id == 14) {
        $scope.title = '信用分解读';
      }
      //获取帮助中心详情
      $scope.params = {
        ID: id
      }
      MainService.getHelpDetails($scope.params).success(function (data) {
        $scope.helpdata = data.Values;
        if (!$scope.title) {
          $scope.title = data.Values.Title;
        }
      }).then(function () {
        if (WeiXinService.isWeiXin()) { //如果是微信
          $scope.isWeiXin = true;
          CommonService.shareActionSheet($scope.helpdata.Title, $scope.helpdata.Abstract, BooLv.moblileApi + '/#/help/' + id, '');
        }
        //调用分享面板
        $scope.shareActionSheet = function () {
          umeng.share($scope.helpdata.Title, $scope.helpdata.Abstract, '', BooLv.moblileApi + '/#/help/' + id);
        }
      })
    }
    if (!localStorage.getItem("token")) {//如果没有授权先授权
      //接口授权
      MainService.authLogin().success(function (data) {
        localStorage.setItem('token', data.Values)
      }).then(function () {
        $scope.getHelpDetails();
      })
    } else {
      $scope.getHelpDetails();
    }


  })
