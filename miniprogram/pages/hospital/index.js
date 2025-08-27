// pages/hospital/index.js
Page({
  data: {
    searchKeyword: '',
    showHospitalModal: false,
    selectedHospital: {},
    
    // 医院列表
    hospitalList: [
      {
        id: 1,
        name: '深圳市人民医院',
        level: '三级甲等',
        type: '综合医院',
        address: '深圳市罗湖区东门北路1017号',
        phone: '0755-25533018',
        distance: 2.5,
        logo: '🏥',
        specialties: ['心内科', '神经内科', '骨科', '消化内科'],
        departments: [
          {
            id: 101,
            name: '心内科',
            expertCount: 8,
            available: true
          },
          {
            id: 102,
            name: '神经内科',
            expertCount: 6,
            available: true
          },
          {
            id: 103,
            name: '骨科',
            expertCount: 5,
            available: false
          },
          {
            id: 104,
            name: '消化内科',
            expertCount: 7,
            available: true
          }
        ]
      },
      {
        id: 2,
        name: '深圳市中医院',
        level: '三级甲等',
        type: '中医医院',
        address: '深圳市福田区福华路1号',
        phone: '0755-88359666',
        distance: 3.2,
        logo: '🏥',
        specialties: ['中医内科', '针灸科', '推拿科', '中医妇科'],
        departments: [
          {
            id: 201,
            name: '中医内科',
            expertCount: 10,
            available: true
          },
          {
            id: 202,
            name: '针灸科',
            expertCount: 4,
            available: true
          },
          {
            id: 203,
            name: '推拿科',
            expertCount: 3,
            available: true
          },
          {
            id: 204,
            name: '中医妇科',
            expertCount: 5,
            available: false
          }
        ]
      },
      {
        id: 3,
        name: '北京大学深圳医院',
        level: '三级甲等',
        type: '综合医院',
        address: '深圳市福田区莲花路1120号',
        phone: '0755-83923333',
        distance: 4.1,
        logo: '🏥',
        specialties: ['肿瘤科', '心血管内科', '呼吸内科', '内分泌科'],
        departments: [
          {
            id: 301,
            name: '肿瘤科',
            expertCount: 12,
            available: true
          },
          {
            id: 302,
            name: '心血管内科',
            expertCount: 9,
            available: true
          },
          {
            id: 303,
            name: '呼吸内科',
            expertCount: 6,
            available: true
          },
          {
            id: 304,
            name: '内分泌科',
            expertCount: 7,
            available: true
          }
        ]
      }
    ],
    
    // 快速科室
    quickDepartments: [
      {
        name: '心内科',
        icon: '❤️'
      },
      {
        name: '神经内科',
        icon: '🧠'
      },
      {
        name: '骨科',
        icon: '🦴'
      },
      {
        name: '消化内科',
        icon: '🐲'
      },
      {
        name: '呼吸内科',
        icon: '💭'
      },
      {
        name: '内分泌科',
        icon: '💊'
      }
    ]
  },

  onLoad: function() {
    this.loadNearbyHospitals();
  },

  // 加载附近医院
  async loadNearbyHospitals() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'getHospitals',
          data: {
            limit: 20,
            page: 1
          }
        }
      });
      
      if (result.result.success) {
        this.setData({
          hospitalList: result.result.data
        });
      } else {
        console.error('获取医院信息失败:', result.result.errMsg);
        // 使用默认数据
        this.setData({
          hospitalList: this.getDefaultHospitals()
        });
      }
    } catch (error) {
      console.error('加载附近医院失败:', error);
      // 使用默认数据
      this.setData({
        hospitalList: this.getDefaultHospitals()
      });
    }
  },

  // 获取默认医院数据
  getDefaultHospitals() {
    return [
      {
        id: 1,
        name: '深圳市人民医院',
        level: '三级甲等',
        type: '综合医院',
        address: '深圳市罗湖区东门北路1017号',
        phone: '0755-25533018',
        distance: 2.5,
        logo: '🏥',
        specialties: ['心内科', '神经内科', '骨科', '消化内科'],
        departments: [
          {
            id: 101,
            name: '心内科',
            expertCount: 8,
            available: true
          },
          {
            id: 102,
            name: '神经内科',
            expertCount: 6,
            available: true
          },
          {
            id: 103,
            name: '骨科',
            expertCount: 5,
            available: false
          },
          {
            id: 104,
            name: '消化内科',
            expertCount: 7,
            available: true
          }
        ]
      },
      {
        id: 2,
        name: '深圳市中医院',
        level: '三级甲等',
        type: '中医医院',
        address: '深圳市福田区福华路1号',
        phone: '0755-88359666',
        distance: 3.2,
        logo: '🏥',
        specialties: ['中医内科', '针灸科', '推拿科', '中医妇科'],
        departments: [
          {
            id: 201,
            name: '中医内科',
            expertCount: 10,
            available: true
          },
          {
            id: 202,
            name: '针灸科',
            expertCount: 4,
            available: true
          },
          {
            id: 203,
            name: '推拿科',
            expertCount: 3,
            available: true
          },
          {
            id: 204,
            name: '中医妇科',
            expertCount: 5,
            available: false
          }
        ]
      },
      {
        id: 3,
        name: '北京大学深圳医院',
        level: '三级甲等',
        type: '综合医院',
        address: '深圳市福田区莲花路1120号',
        phone: '0755-83923333',
        distance: 4.1,
        logo: '🏥',
        specialties: ['肿瘤科', '心血管内科', '呼吸内科', '内分泌科'],
        departments: [
          {
            id: 301,
            name: '肿瘤科',
            expertCount: 12,
            available: true
          },
          {
            id: 302,
            name: '心血管内科',
            expertCount: 9,
            available: true
          },
          {
            id: 303,
            name: '呼吸内科',
            expertCount: 6,
            available: true
          },
          {
            id: 304,
            name: '内分泌科',
            expertCount: 7,
            available: true
          }
        ]
      }
    ];
  },

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({
      searchKeyword: keyword
    });
    
    if (keyword) {
      this.performSearch();
    }
  },

  // 执行搜索
  performSearch() {
    const keyword = this.data.searchKeyword.toLowerCase();
    if (!keyword) {
      return;
    }

    // 模拟搜索
    const filteredHospitals = this.data.hospitalList.filter(hospital => {
      return hospital.name.toLowerCase().includes(keyword) ||
             hospital.specialties.some(specialty => specialty.includes(keyword));
    });

    // 这里可以更新医院列表显示搜索结果
    wx.showToast({
      title: `找到${filteredHospitals.length}个结果`,
      icon: 'none'
    });
  },

  // 选择医院
  selectHospital(e) {
    const hospital = e.currentTarget.dataset.hospital;
    this.setData({
      selectedHospital: hospital,
      showHospitalModal: true
    });
  },

  // 关闭医院弹窗
  closeHospitalModal() {
    this.setData({
      showHospitalModal: false,
      selectedHospital: {}
    });
  },

  // 拨打医院电话
  callHospital() {
    const phone = this.data.selectedHospital.phone;
    wx.makePhoneCall({
      phoneNumber: phone
    });
  },

  // 选择科室
  selectDepartment(e) {
    const dept = e.currentTarget.dataset.dept;
    
    if (!dept.available) {
      wx.showToast({
        title: '该科室暂时无法预约',
        icon: 'none'
      });
      return;
    }

    // 导航到医生列表页面
    wx.navigateTo({
      url: `/pages/doctor-list/index?hospitalId=${this.data.selectedHospital.id}&deptId=${dept.id}&deptName=${dept.name}`
    });
  },

  // 快速预约科室
  quickBookDepartment(e) {
    const dept = e.currentTarget.dataset.dept;
    
    // 显示相关医院列表
    const relatedHospitals = this.data.hospitalList.filter(hospital => 
      hospital.departments && hospital.departments.some(d => d.name === dept.name && d.available)
    );

    if (relatedHospitals.length === 0) {
      wx.showToast({
        title: '暂无该科室可预约',
        icon: 'none'
      });
      return;
    }

    if (relatedHospitals.length === 1) {
      // 只有一个医院，直接进入
      const hospital = relatedHospitals[0];
      const department = hospital.departments.find(d => d.name === dept.name);
      
      wx.navigateTo({
        url: `/pages/doctor-list/index?hospitalId=${hospital.id}&deptId=${department.id}&deptName=${department.name}`
      });
    } else {
      // 多个医院，显示选择列表
      const hospitalNames = relatedHospitals.map(h => h.name);
      wx.showActionSheet({
        itemList: hospitalNames,
        success: (res) => {
          const selectedHospital = relatedHospitals[res.tapIndex];
          const department = selectedHospital.departments.find(d => d.name === dept.name);
          
          wx.navigateTo({
            url: `/pages/doctor-list/index?hospitalId=${selectedHospital.id}&deptId=${department.id}&deptName=${department.name}`
          });
        }
      });
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadNearbyHospitals();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  // 分享页面
  onShareAppMessage() {
    return {
      title: '医院挂号 - 绿色通道快速预约',
      path: '/pages/hospital/index'
    };
  }
});