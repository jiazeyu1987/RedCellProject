const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

// 获取openid
const getOpenId = async () => {
  // 获取基础信息
  const wxContext = cloud.getWXContext();
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  };
};

// 获取小程序二维码
const getMiniProgramCode = async () => {
  // 获取小程序二维码的buffer
  const resp = await cloud.openapi.wxacode.get({
    path: "pages/index/index",
  });
  const { buffer } = resp;
  // 将图片上传云存储空间
  const upload = await cloud.uploadFile({
    cloudPath: "code.png",
    fileContent: buffer,
  });
  return upload.fileID;
};

// 创建集合
const createCollection = async () => {
  try {
    // 创建集合
    await db.createCollection("sales");
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华东",
        city: "上海",
        sales: 11,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华东",
        city: "南京",
        sales: 11,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华南",
        city: "广州",
        sales: 22,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华南",
        city: "深圳",
        sales: 22,
      },
    });
    return {
      success: true,
    };
  } catch (e) {
    // 这里catch到的是该collection已经存在，从业务逻辑上来说是运行成功的，所以catch返回success给前端，避免工具在前端抛出异常
    return {
      success: true,
      data: "create collection success",
    };
  }
};

// 查询数据
const selectRecord = async () => {
  // 返回数据库查询结果
  return await db.collection("sales").get();
};

// 更新数据
const updateRecord = async (event) => {
  try {
    // 遍历修改数据库信息
    for (let i = 0; i < event.data.length; i++) {
      await db
        .collection("sales")
        .where({
          _id: event.data[i]._id,
        })
        .update({
          data: {
            sales: event.data[i].sales,
          },
        });
    }
    return {
      success: true,
      data: event.data,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 新增数据
const insertRecord = async (event) => {
  try {
    const insertRecord = event.data;
    // 插入数据
    await db.collection("sales").add({
      data: {
        region: insertRecord.region,
        city: insertRecord.city,
        sales: Number(insertRecord.sales),
      },
    });
    return {
      success: true,
      data: event.data,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 删除数据
const deleteRecord = async (event) => {
  try {
    await db
      .collection("sales")
      .where({
        _id: event.data._id,
      })
      .remove();
    return {
      success: true,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 健康数据管理
const saveHealthData = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    const { type, value, unit, status, notes, recordTime } = event.data;
    
    const result = await db.collection('healthRecords').add({
      data: {
        openid,
        type,
        value,
        unit: unit || '',
        status: status || 'normal',
        notes: notes || '',
        recordTime: recordTime || new Date(),
        createTime: new Date()
      }
    });
    
    return {
      success: true,
      data: result
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.toString()
    };
  }
};

const getHealthData = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    const { type, limit = 20, page = 1 } = event.data || {};
    const skip = (page - 1) * limit;
    
    let whereCondition = { openid };
    if (type && type !== 'all') {
      whereCondition.type = type;
    }
    
    const result = await db.collection('healthRecords')
      .where(whereCondition)
      .orderBy('recordTime', 'desc')
      .skip(skip)
      .limit(limit)
      .get();
    
    return {
      success: true,
      data: result.data
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.toString()
    };
  }
};

// 家庭成员管理
const saveFamilyMember = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    const { name, relation, age, gender, phone, idCard, medicalHistory, allergies } = event.data;
    
    const result = await db.collection('familyMembers').add({
      data: {
        openid,
        name,
        relation,
        age: parseInt(age),
        gender,
        phone: phone || '',
        idCard: idCard || '',
        medicalHistory: medicalHistory || '',
        allergies: allergies || '',
        createTime: new Date()
      }
    });
    
    return {
      success: true,
      data: result
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.toString()
    };
  }
};

const getFamilyMembers = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    const result = await db.collection('familyMembers')
      .where({ openid })
      .orderBy('createTime', 'desc')
      .get();
    
    return {
      success: true,
      data: result.data
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.toString()
    };
  }
};

const updateFamilyMember = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    const { _id, ...updateData } = event.data;
    
    const result = await db.collection('familyMembers')
      .where({
        _id,
        openid
      })
      .update({
        data: {
          ...updateData,
          updateTime: new Date()
        }
      });
    
    return {
      success: true,
      data: result
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.toString()
    };
  }
};

const deleteFamilyMember = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    const { _id } = event.data;
    
    const result = await db.collection('familyMembers')
      .where({
        _id,
        openid
      })
      .remove();
    
    return {
      success: true,
      data: result
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.toString()
    };
  }
};

// 社区数据管理
const getCommunityPosts = async (event) => {
  try {
    const { limit = 20, page = 1 } = event.data || {};
    const skip = (page - 1) * limit;
    
    const result = await db.collection('communityPosts')
      .where({ status: 'published' })
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(limit)
      .get();
    
    return {
      success: true,
      data: result.data
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.toString()
    };
  }
};

const getHealthKnowledge = async (event) => {
  try {
    const { category, limit = 20, page = 1 } = event.data || {};
    const skip = (page - 1) * limit;
    
    let whereCondition = { status: 'published' };
    if (category && category !== 'all') {
      whereCondition.category = category;
    }
    
    const result = await db.collection('healthKnowledge')
      .where(whereCondition)
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(limit)
      .get();
    
    return {
      success: true,
      data: result.data
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.toString()
    };
  }
};

// 获取服务配置
const getServiceTypes = async () => {
  try {
    const result = await db.collection('serviceTypes')
      .where({ status: 'active' })
      .orderBy('sortOrder', 'asc')
      .get();
    
    return {
      success: true,
      data: result.data
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.toString()
    };
  }
};

const getHospitals = async (event) => {
  try {
    const { city, limit = 20, page = 1 } = event.data || {};
    const skip = (page - 1) * limit;
    
    let whereCondition = { status: 'active' };
    if (city && city !== 'all') {
      whereCondition.city = city;
    }
    
    const result = await db.collection('hospitals')
      .where(whereCondition)
      .orderBy('distance', 'asc')
      .skip(skip)
      .limit(limit)
      .get();
    
    return {
      success: true,
      data: result.data
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.toString()
    };
  }
};

// 地址管理
const saveAddress = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    console.log('保存地址请求:', {
      openid,
      data: event.data
    });
    
    const { contactName, contactPhone, province, city, district, detail, isDefault } = event.data;
    
    // 如果设置为默认地址，先取消其他默认地址
    if (isDefault) {
      await db.collection('addresses')
        .where({ openid, isDefault: true })
        .update({
          data: {
            isDefault: false,
            updateTime: new Date()
          }
        });
    }
    
    const result = await db.collection('addresses').add({
      data: {
        openid,
        contactName,
        contactPhone,
        province,
        city,
        district,
        detail,
        isDefault: isDefault || false,
        createTime: new Date()
      }
    });
    
    console.log('地址保存成功:', result);
    
    return {
      success: true,
      data: result
    };
  } catch (e) {
    console.error('保存地址失败:', e);
    return {
      success: false,
      errMsg: e.toString()
    };
  }
};

const getUserAddresses = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    const result = await db.collection('addresses')
      .where({ openid })
      .orderBy('createTime', 'desc')
      .get();
    
    return {
      success: true,
      data: result.data
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.toString()
    };
  }
};

const updateAddress = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    const { _id, contactName, contactPhone, province, city, district, detail, isDefault } = event.data;
    
    // 如果设置为默认地址，先取消其他默认地址
    if (isDefault) {
      await db.collection('addresses')
        .where({ 
          openid, 
          isDefault: true,
          _id: _.neq(_id)
        })
        .update({
          data: {
            isDefault: false,
            updateTime: new Date()
          }
        });
    }
    
    const result = await db.collection('addresses')
      .where({
        _id,
        openid
      })
      .update({
        data: {
          contactName,
          contactPhone,
          province,
          city,
          district,
          detail,
          isDefault: isDefault || false,
          updateTime: new Date()
        }
      });
    
    return {
      success: true,
      data: result
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.toString()
    };
  }
};

const deleteAddress = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    const { _id } = event.data;
    
    // 检查是否是默认地址
    const addressInfo = await db.collection('addresses')
      .where({ _id, openid })
      .get();
    
    if (addressInfo.data.length === 0) {
      return {
        success: false,
        errMsg: '地址不存在'
      };
    }
    
    const isDefaultAddress = addressInfo.data[0].isDefault;
    
    // 删除地址
    const result = await db.collection('addresses')
      .where({
        _id,
        openid
      })
      .remove();
    
    // 如果删除的是默认地址，设置第一个地址为默认
    if (isDefaultAddress) {
      const remainingAddresses = await db.collection('addresses')
        .where({ openid })
        .limit(1)
        .get();
      
      if (remainingAddresses.data.length > 0) {
        await db.collection('addresses')
          .where({ _id: remainingAddresses.data[0]._id })
          .update({
            data: {
              isDefault: true,
              updateTime: new Date()
            }
          });
      }
    }
    
    return {
      success: true,
      data: result
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.toString()
    };
  }
};

// 云函数入口函数
exports.main = async (event, context) => {
  switch (event.type) {
    case "getOpenId":
      return await getOpenId();
    case "getMiniProgramCode":
      return await getMiniProgramCode();
    case "createCollection":
      return await createCollection();
    case "selectRecord":
      return await selectRecord();
    case "updateRecord":
      return await updateRecord(event);
    case "insertRecord":
      return await insertRecord(event);
    case "deleteRecord":
      return await deleteRecord(event);
    // 健康数据相关
    case "saveHealthData":
      return await saveHealthData(event);
    case "getHealthData":
      return await getHealthData(event);
    // 家庭成员相关
    case "saveFamilyMember":
      return await saveFamilyMember(event);
    case "getFamilyMembers":
      return await getFamilyMembers(event);
    case "updateFamilyMember":
      return await updateFamilyMember(event);
    case "deleteFamilyMember":
      return await deleteFamilyMember(event);
    // 社区数据相关
    case "getCommunityPosts":
      return await getCommunityPosts(event);
    case "getHealthKnowledge":
      return await getHealthKnowledge(event);
    // 配置数据相关
    case "getServiceTypes":
      return await getServiceTypes();
    case "getHospitals":
      return await getHospitals(event);
    // 地址管理相关
    case "saveAddress":
      return await saveAddress(event);
    case "getUserAddresses":
      return await getUserAddresses(event);
    case "updateAddress":
      return await updateAddress(event);
    case "deleteAddress":
      return await deleteAddress(event);
    default:
      return {
        success: false,
        errMsg: `Unknown type: ${event.type}`
      };
  }
};
