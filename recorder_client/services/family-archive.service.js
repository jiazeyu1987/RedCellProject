/**
 * 家庭档案管理服务
 * 提供统一的家庭成员数据管理、CRUD操作和业务逻辑
 */

const StorageService = require('../utils/storage.js');
const { PatientAPI } = require('../api/index.js');

class FamilyArchiveService {
  constructor() {
    this.storageKey = 'family_archive_data';
    this.cacheExpire = 30 * 60 * 1000; // 30分钟缓存过期时间
    this.localData = null;
    this.lastSyncTime = null;
  }

  /**
   * 获取家庭成员列表
   * @param {Object} params - 查询参数
   * @param {boolean} forceRefresh - 是否强制刷新
   * @returns {Promise<Object>} 成员列表和统计信息
   */
  async getFamilyMembers(params = {}, forceRefresh = false) {
    try {
      // 检查是否需要从服务器获取数据
      if (forceRefresh || this.shouldRefreshData()) {
        const serverData = await this.fetchFromServer(params);
        this.updateLocalCache(serverData);
        return serverData;
      }

      // 使用本地缓存数据
      const cachedData = this.getLocalCache();
      if (cachedData) {
        return this.applyLocalFilters(cachedData, params);
      }

      // 如果没有缓存，从服务器获取
      const serverData = await this.fetchFromServer(params);
      this.updateLocalCache(serverData);
      return serverData;

    } catch (error) {
      console.error('获取家庭成员列表失败:', error);
      
      // 如果服务器请求失败，尝试使用本地缓存
      const cachedData = this.getLocalCache();
      if (cachedData) {
        return this.applyLocalFilters(cachedData, params);
      }
      
      throw error;
    }
  }

  /**
   * 获取单个成员详情
   * @param {string} memberId - 成员ID
   * @returns {Promise<Object>} 成员详情
   */
  async getMemberDetail(memberId) {
    try {
      // 首先尝试从本地缓存获取
      const cachedData = this.getLocalCache();
      if (cachedData && cachedData.members) {
        const member = cachedData.members.find(m => m.id === memberId);
        if (member) {
          // 如果找到缓存数据，但数据较旧，异步更新
          if (this.shouldRefreshData()) {
            this.fetchMemberDetailFromServer(memberId).then(serverMember => {
              this.updateMemberInCache(serverMember);
            }).catch(console.error);
          }
          return member;
        }
      }

      // 从服务器获取
      const memberDetail = await this.fetchMemberDetailFromServer(memberId);
      this.updateMemberInCache(memberDetail);
      return memberDetail;

    } catch (error) {
      console.error('获取成员详情失败:', error);
      throw error;
    }
  }

  /**
   * 添加家庭成员
   * @param {Object} memberData - 成员数据
   * @returns {Promise<Object>} 添加结果
   */
  async addFamilyMember(memberData) {
    try {
      // 数据验证
      this.validateMemberData(memberData);

      // 调用API创建成员
      const result = await PatientAPI.addFamilyMember(memberData);
      
      // 更新本地缓存
      this.addMemberToCache(result.data);
      
      // 触发数据变更事件
      this.notifyDataChange('add', result.data);
      
      return result;

    } catch (error) {
      console.error('添加家庭成员失败:', error);
      throw error;
    }
  }

  /**
   * 更新家庭成员信息
   * @param {string} memberId - 成员ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<Object>} 更新结果
   */
  async updateFamilyMember(memberId, updateData) {
    try {
      // 数据验证
      this.validateMemberData(updateData, false);

      // 调用API更新成员
      const result = await PatientAPI.updateFamilyMember(memberId, updateData);
      
      // 更新本地缓存
      this.updateMemberInCache(result.data);
      
      // 触发数据变更事件
      this.notifyDataChange('update', result.data);
      
      return result;

    } catch (error) {
      console.error('更新家庭成员失败:', error);
      throw error;
    }
  }

  /**
   * 删除家庭成员
   * @param {string} memberId - 成员ID
   * @returns {Promise<Object>} 删除结果
   */
  async deleteFamilyMember(memberId) {
    try {
      // 调用API删除成员
      const result = await PatientAPI.deleteFamilyMember(memberId);
      
      // 从本地缓存移除
      this.removeMemberFromCache(memberId);
      
      // 触发数据变更事件
      this.notifyDataChange('delete', { id: memberId });
      
      return result;

    } catch (error) {
      console.error('删除家庭成员失败:', error);
      throw error;
    }
  }

  /**
   * 获取家庭统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getFamilyStatistics() {
    try {
      const cachedData = this.getLocalCache();
      
      if (cachedData && cachedData.members) {
        return this.calculateStatistics(cachedData.members);
      }

      // 如果没有缓存，先获取成员列表
      const data = await this.getFamilyMembers();
      return this.calculateStatistics(data.members);

    } catch (error) {
      console.error('获取家庭统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 搜索家庭成员
   * @param {string} keyword - 搜索关键字
   * @param {Object} filters - 筛选条件
   * @returns {Promise<Array>} 搜索结果
   */
  async searchMembers(keyword, filters = {}) {
    try {
      const data = await this.getFamilyMembers();
      let results = Array.isArray(data.members) ? data.members : [];

      // 关键字搜索
      if (keyword) {
        const lowerKeyword = keyword.toLowerCase();
        results = results.filter(member => 
          member.name.toLowerCase().includes(lowerKeyword) ||
          member.phone.includes(keyword) ||
          member.idCard.includes(keyword) ||
          (member.relationship && member.relationship.toLowerCase().includes(lowerKeyword))
        );
      }

      // 应用筛选条件
      results = this.applyFilters(results, filters);

      return {
        members: results,
        total: results.length,
        keyword,
        filters
      };

    } catch (error) {
      console.error('搜索家庭成员失败:', error);
      throw error;
    }
  }

  /**
   * 批量操作家庭成员
   * @param {Array} memberIds - 成员ID列表
   * @param {string} operation - 操作类型 ('delete', 'updateStatus', etc.)
   * @param {Object} operationData - 操作数据
   * @returns {Promise<Object>} 批量操作结果
   */
  async batchOperation(memberIds, operation, operationData = {}) {
    try {
      const results = {
        success: [],
        failed: [],
        total: memberIds.length
      };

      for (const memberId of memberIds) {
        try {
          let result;
          switch (operation) {
            case 'delete':
              result = await this.deleteFamilyMember(memberId);
              break;
            case 'updateStatus':
              result = await this.updateFamilyMember(memberId, { 
                isActive: operationData.isActive 
              });
              break;
            case 'updateHealthStatus':
              result = await this.updateFamilyMember(memberId, { 
                healthStatus: operationData.healthStatus 
              });
              break;
            default:
              throw new Error(`不支持的批量操作: ${operation}`);
          }
          
          results.success.push({ memberId, result });
        } catch (error) {
          results.failed.push({ memberId, error: error.message });
        }
      }

      return results;

    } catch (error) {
      console.error('批量操作失败:', error);
      throw error;
    }
  }

  /**
   * 创建新的家庭档案
   * @param {Object} familyData - 家庭基本信息
   * @returns {Promise<Object>} 创建结果
   */
  async createFamilyArchive(familyData) {
    try {
      // 数据验证
      this.validateFamilyData(familyData);

      // 调用API创建家庭档案
      const result = await PatientAPI.createFamilyArchive(familyData);
      
      // 更新本地缓存
      this.updateFamilyInfoCache(result.data);
      
      // 触发数据变更事件
      this.notifyDataChange('createFamily', result.data);
      
      return result;

    } catch (error) {
      console.error('创建家庭档案失败:', error);
      throw error;
    }
  }

  /**
   * 获取多个家庭的档案信息
   * @param {Array} familyIds - 家庭ID列表
   * @param {boolean} forceRefresh - 是否强制刷新
   * @returns {Promise<Array>} 家庭档案列表
   */
  async getMultipleFamilyArchives(familyIds, forceRefresh = false) {
    try {
      const promises = familyIds.map(async (familyId) => {
        try {
          return await this.getFamilyArchive(familyId, forceRefresh);
        } catch (error) {
          console.error(`获取家庭档案失败 (${familyId}):`, error);
          return { id: familyId, error: error.message, data: null };
        }
      });

      const results = await Promise.all(promises);
      
      return {
        total: results.length,
        success: results.filter(r => !r.error),
        failed: results.filter(r => r.error),
        data: results
      };

    } catch (error) {
      console.error('批量获取家庭档案失败:', error);
      throw error;
    }
  }

  /**
   * 获取单个家庭档案
   * @param {string} familyId - 家庭ID
   * @param {boolean} forceRefresh - 是否强制刷新
   * @returns {Promise<Object>} 家庭档案详情
   */
  async getFamilyArchive(familyId, forceRefresh = false) {
    try {
      const cacheKey = `family_archive_${familyId}`;
      
      // 检查缓存
      if (!forceRefresh) {
        const cached = this.getFamilyCache(familyId);
        if (cached) {
          return cached;
        }
      }

      // 从服务器获取
      const response = await PatientAPI.getFamilyArchive(familyId);
      const familyData = {
        id: familyId,
        familyInfo: response.familyInfo || {},
        members: response.members || [],
        relationships: response.relationships || [],
        statistics: response.statistics || {},
        settings: response.settings || {},
        lastUpdateTime: new Date().toISOString()
      };

      // 更新缓存
      this.updateFamilyCache(familyId, familyData);
      
      return familyData;

    } catch (error) {
      console.error('获取家庭档案失败:', error);
      throw error;
    }
  }

  /**
   * 管理家庭成员关系
   * @param {string} familyId - 家庭ID
   * @param {Array} relationships - 关系数据
   * @returns {Promise<Object>} 管理结果
   */
  async manageFamilyRelationships(familyId, relationships) {
    try {
      // 验证关系数据
      this.validateRelationships(relationships);

      // 调用API更新关系
      const result = await PatientAPI.updateFamilyRelationships(familyId, relationships);
      
      // 更新本地缓存
      this.updateRelationshipsCache(familyId, result.data);
      
      // 触发数据变更事件
      this.notifyDataChange('updateRelationships', { familyId, relationships: result.data });
      
      return result;

    } catch (error) {
      console.error('管理家庭关系失败:', error);
      throw error;
    }
  }

  /**
   * 合并家庭档案
   * @param {string} sourceFamilyId - 源家庭ID
   * @param {string} targetFamilyId - 目标家庭ID
   * @param {Object} mergeOptions - 合并选项
   * @returns {Promise<Object>} 合并结果
   */
  async mergeFamilyArchives(sourceFamilyId, targetFamilyId, mergeOptions = {}) {
    try {
      // 验证合并参数
      if (!sourceFamilyId || !targetFamilyId) {
        throw new Error('缺少家庭ID参数');
      }

      if (sourceFamilyId === targetFamilyId) {
        throw new Error('不能合并同一个家庭');
      }

      // 获取两个家庭的数据
      const sourceFamily = await this.getFamilyArchive(sourceFamilyId);
      const targetFamily = await this.getFamilyArchive(targetFamilyId);

      // 调用API执行合并
      const result = await PatientAPI.mergeFamilyArchives({
        sourceFamilyId,
        targetFamilyId,
        sourceFamily,
        targetFamily,
        mergeOptions
      });

      // 清理源家庭缓存
      this.clearFamilyCache(sourceFamilyId);
      
      // 更新目标家庭缓存
      this.updateFamilyCache(targetFamilyId, result.data);
      
      // 触发数据变更事件
      this.notifyDataChange('mergeFamilies', { 
        sourceFamilyId, 
        targetFamilyId, 
        result: result.data 
      });
      
      return result;

    } catch (error) {
      console.error('合并家庭档案失败:', error);
      throw error;
    }
  }

  /**
   * 分离家庭成员（创建新家庭）
   * @param {string} originalFamilyId - 原家庭ID
   * @param {Array} memberIds - 要分离的成员ID列表
   * @param {Object} newFamilyInfo - 新家庭信息
   * @returns {Promise<Object>} 分离结果
   */
  async separateFamilyMembers(originalFamilyId, memberIds, newFamilyInfo) {
    try {
      // 验证参数
      if (!memberIds || memberIds.length === 0) {
        throw new Error('请选择要分离的成员');
      }

      // 调用API执行分离
      const result = await PatientAPI.separateFamilyMembers({
        originalFamilyId,
        memberIds,
        newFamilyInfo
      });

      // 更新原家庭缓存
      this.clearFamilyCache(originalFamilyId);
      
      // 创建新家庭缓存
      if (result.data.newFamily) {
        this.updateFamilyCache(result.data.newFamily.id, result.data.newFamily);
      }
      
      // 触发数据变更事件
      this.notifyDataChange('separateFamily', {
        originalFamilyId,
        memberIds,
        newFamily: result.data.newFamily
      });
      
      return result;

    } catch (error) {
      console.error('分离家庭成员失败:', error);
      throw error;
    }
  }

  /**
   * 获取家庭关系图谱数据
   * @param {string} familyId - 家庭ID
   * @returns {Promise<Object>} 关系图谱数据
   */
  async getFamilyRelationshipMap(familyId) {
    try {
      const familyData = await this.getFamilyArchive(familyId);
      
      // 构建关系图谱
      const relationshipMap = this.buildRelationshipMap(familyData.members, familyData.relationships);
      
      return {
        familyId,
        nodes: relationshipMap.nodes,
        edges: relationshipMap.edges,
        layout: relationshipMap.layout,
        statistics: this.calculateRelationshipStatistics(relationshipMap)
      };

    } catch (error) {
      console.error('获取关系图谱失败:', error);
      throw error;
    }
  }

  /**
   * 智能推荐家庭关系
   * @param {string} familyId - 家庭ID
   * @param {Object} memberData - 新成员数据
   * @returns {Promise<Array>} 推荐关系列表
   */
  async recommendFamilyRelationships(familyId, memberData) {
    try {
      const familyData = await this.getFamilyArchive(familyId);
      
      // 基于年龄、姓名等信息推荐关系
      const recommendations = this.analyzeRelationships(familyData.members, memberData);
      
      return recommendations.map(rec => ({
        targetMemberId: rec.memberId,
        targetMemberName: rec.memberName,
        relationshipType: rec.relationship,
        confidence: rec.confidence,
        reasons: rec.reasons
      }));

    } catch (error) {
      console.error('推荐家庭关系失败:', error);
      throw error;
    }
  }

  /**
   * 导出家庭档案数据
   * @param {string} format - 导出格式 ('json', 'csv')
   * @returns {Promise<Object>} 导出数据
   */
  async exportFamilyArchive(format = 'json') {
    try {
      const data = await this.getFamilyMembers();
      const exportData = {
        exportTime: new Date().toISOString(),
        familyInfo: data.familyInfo || {},
        members: data.members || [],
        statistics: await this.getFamilyStatistics()
      };

      if (format === 'csv') {
        return this.convertToCSV(exportData);
      }

      return exportData;

    } catch (error) {
      console.error('导出家庭档案失败:', error);
      throw error;
    }
  }

  /**
   * 从服务器获取数据
   * @private
   */
  async fetchFromServer(params = {}) {
    try {
      const response = await PatientAPI.getFamilyMembers(params);
      return {
        members: response.data || [],
        statistics: response.statistics || {},
        familyInfo: response.familyInfo || {},
        pagination: response.pagination || {},
        lastUpdateTime: new Date().toISOString()
      };
    } catch (error) {
      console.error('从服务器获取数据失败:', error);
      throw error;
    }
  }

  /**
   * 从服务器获取成员详情
   * @private
   */
  async fetchMemberDetailFromServer(memberId) {
    try {
      const response = await PatientAPI.getFamilyMemberDetail(memberId);
      return response.data;
    } catch (error) {
      console.error('从服务器获取成员详情失败:', error);
      throw error;
    }
  }

  /**
   * 应用本地筛选
   * @private
   */
  applyLocalFilters(data, params) {
    // 确保 data 存在且有效
    if (!data || typeof data !== 'object') {
      console.warn('applyLocalFilters: data 参数无效', data);
      return {
        members: [],
        pagination: { total: 0, page: 1, pageSize: 10 }
      };
    }
    
    if (!params || Object.keys(params).length === 0) {
      return data;
    }

    const filteredMembers = this.applyFilters(data.members, params);
    
    return {
      ...data,
      members: filteredMembers,
      pagination: {
        ...data.pagination,
        total: filteredMembers.length
      }
    };
  }

  /**
   * 应用筛选条件
   * @private
   */
  applyFilters(members, filters) {
    // 确保 members 是数组
    if (!Array.isArray(members)) {
      console.warn('applyFilters: members 参数不是数组，返回空数组', members);
      return [];
    }
    
    let results = [...members];

    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (!value) return;

      switch (key) {
        case 'ageRange':
          results = results.filter(member => {
            const age = member.age;
            switch (value) {
              case 'child': return age <= 18;
              case 'adult': return age > 18 && age < 60;
              case 'elderly': return age >= 60;
              default: return true;
            }
          });
          break;
        case 'gender':
          results = results.filter(member => member.gender === value);
          break;
        case 'healthStatus':
          results = results.filter(member => member.healthStatus === value);
          break;
        case 'serviceFrequency':
          results = results.filter(member => member.serviceFrequency === value);
          break;
        case 'isActive':
          results = results.filter(member => member.isActive === value);
          break;
        case 'relationship':
          results = results.filter(member => member.relationship === value);
          break;
      }
    });

    return results;
  }

  /**
   * 计算统计信息
   * @private
   */
  calculateStatistics(members) {
    if (!Array.isArray(members) || members.length === 0) {
      return {
        total: 0,
        activeMembers: 0,
        pendingService: 0,
        averageAge: 0,
        genderDistribution: { male: 0, female: 0 },
        ageDistribution: { child: 0, adult: 0, elderly: 0 },
        healthStatusDistribution: { healthy: 0, chronic: 0, critical: 0 }
      };
    }

    const stats = {
      total: members.length,
      activeMembers: members.filter(m => m.isActive).length,
      pendingService: members.filter(m => m.serviceFrequency === 'daily').length,
      averageAge: Math.round(members.reduce((sum, m) => sum + m.age, 0) / members.length),
      genderDistribution: { male: 0, female: 0 },
      ageDistribution: { child: 0, adult: 0, elderly: 0 },
      healthStatusDistribution: { healthy: 0, chronic: 0, critical: 0 }
    };

    // 性别分布
    members.forEach(member => {
      if (member.gender === 'male') stats.genderDistribution.male++;
      else if (member.gender === 'female') stats.genderDistribution.female++;
    });

    // 年龄分布
    members.forEach(member => {
      if (member.age <= 18) stats.ageDistribution.child++;
      else if (member.age < 60) stats.ageDistribution.adult++;
      else stats.ageDistribution.elderly++;
    });

    // 健康状态分布
    members.forEach(member => {
      if (member.healthStatus === 'healthy') stats.healthStatusDistribution.healthy++;
      else if (member.healthStatus === 'chronic') stats.healthStatusDistribution.chronic++;
      else if (member.healthStatus === 'critical') stats.healthStatusDistribution.critical++;
    });

    return stats;
  }

  /**
   * 数据验证
   * @private
   */
  validateMemberData(data, isCreate = true) {
    const required = isCreate ? ['name', 'age', 'gender', 'phone'] : [];
    
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`缺少必填字段: ${field}`);
      }
    }

    // 手机号格式验证
    if (data.phone && !/^1[3-9]\d{9}$/.test(data.phone)) {
      throw new Error('手机号格式不正确');
    }

    // 年龄验证
    if (data.age !== undefined && (data.age < 0 || data.age > 150)) {
      throw new Error('年龄范围不正确');
    }

    // 身份证格式验证（简单验证）
    if (data.idCard && !/^\d{17}[\dX]$/.test(data.idCard)) {
      throw new Error('身份证格式不正确');
    }
  }

  /**
   * 验证家庭数据
   * @private
   */
  validateFamilyData(data) {
    const required = ['familyName', 'address'];
    
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`缺少必填字段: ${field}`);
      }
    }

    // 家庭名称长度验证
    if (data.familyName && data.familyName.length > 50) {
      throw new Error('家庭名称过长');
    }

    // 地址长度验证
    if (data.address && data.address.length > 200) {
      throw new Error('地址信息过长');
    }
  }

  /**
   * 验证关系数据
   * @private
   */
  validateRelationships(relationships) {
    if (!Array.isArray(relationships)) {
      throw new Error('关系数据必须是数组');
    }

    for (const rel of relationships) {
      if (!rel.memberA || !rel.memberB || !rel.relationship) {
        throw new Error('关系数据不完整');
      }
      
      // 不能与自己建立关系
      if (rel.memberA === rel.memberB) {
        throw new Error('不能与自己建立关系');
      }
    }
  }

  /**
   * 构建关系图谱
   * @private
   */
  buildRelationshipMap(members, relationships) {
    const nodes = members.map(member => ({
      id: member.id,
      name: member.name,
      age: member.age,
      gender: member.gender,
      avatar: member.avatar,
      relationship: member.relationship || '未知',
      healthStatus: member.healthStatus,
      isActive: member.isActive
    }));

    const edges = relationships.map(rel => ({
      source: rel.memberA,
      target: rel.memberB,
      relationship: rel.relationship,
      type: this.getRelationshipType(rel.relationship)
    }));

    // 计算布局位置
    const layout = this.calculateGraphLayout(nodes, edges);

    return { nodes, edges, layout };
  }

  /**
   * 分析关系推荐
   * @private
   */
  analyzeRelationships(existingMembers, newMember) {
    const recommendations = [];
    
    for (const member of existingMembers) {
      const analysis = this.analyzeRelationshipBetween(member, newMember);
      if (analysis.confidence > 0.3) {
        recommendations.push({
          memberId: member.id,
          memberName: member.name,
          relationship: analysis.relationship,
          confidence: analysis.confidence,
          reasons: analysis.reasons
        });
      }
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 分析两个成员之间的关系
   * @private
   */
  analyzeRelationshipBetween(memberA, memberB) {
    const reasons = [];
    let confidence = 0;
    let relationship = '亲戚';

    // 年龄差分析
    const ageDiff = Math.abs(memberA.age - memberB.age);
    
    if (ageDiff <= 5) {
      if (memberA.gender !== memberB.gender) {
        relationship = '配偶';
        confidence += 0.4;
        reasons.push('年龄相近且性别不同');
      } else {
        relationship = '兄弟姐妹';
        confidence += 0.3;
        reasons.push('年龄相近且性别相同');
      }
    } else if (ageDiff >= 20 && ageDiff <= 35) {
      relationship = memberA.age > memberB.age ? '父母' : '子女';
      confidence += 0.5;
      reasons.push('年龄差符合父母子女关系');
    } else if (ageDiff >= 40) {
      relationship = memberA.age > memberB.age ? '祖父母' : '孙子/孙女';
      confidence += 0.4;
      reasons.push('年龄差较大，可能是祖孙关系');
    }

    // 姓名相似度分析
    if (memberA.name && memberB.name) {
      const nameSimilarity = this.calculateNameSimilarity(memberA.name, memberB.name);
      if (nameSimilarity > 0.3) {
        confidence += nameSimilarity * 0.3;
        reasons.push('姓名有相似之处');
      }
    }

    return { relationship, confidence, reasons };
  }

  /**
   * 计算姓名相似度
   * @private
   */
  calculateNameSimilarity(nameA, nameB) {
    if (!nameA || !nameB) return 0;
    
    // 简单的字符匹配算法
    const commonChars = nameA.split('').filter(char => nameB.includes(char));
    return commonChars.length / Math.max(nameA.length, nameB.length);
  }

  /**
   * 获取关系类型
   * @private
   */
  getRelationshipType(relationship) {
    const types = {
      '配偶': 'spouse',
      '父亲': 'parent',
      '母亲': 'parent',
      '子女': 'child',
      '兄弟姐妹': 'sibling',
      '祖父母': 'grandparent',
      '孙子': 'grandchild',
      '孙女': 'grandchild'
    };
    return types[relationship] || 'relative';
  }

  /**
   * 计算图形布局
   * @private
   */
  calculateGraphLayout(nodes, edges) {
    // 简单的圆形布局算法
    const centerX = 200;
    const centerY = 200;
    const radius = 150;
    
    return nodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / nodes.length;
      return {
        id: node.id,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });
  }

  /**
   * 计算关系统计
   * @private
   */
  calculateRelationshipStatistics(relationshipMap) {
    const { nodes, edges } = relationshipMap;
    
    return {
      totalMembers: nodes.length,
      totalRelationships: edges.length,
      relationshipTypes: this.groupBy(edges, 'type'),
      generations: this.calculateGenerations(nodes, edges),
      avgConnectionsPerMember: edges.length / nodes.length
    };
  }

  /**
   * 计算代数
   * @private
   */
  calculateGenerations(nodes, edges) {
    // 简化算法：根据年龄分组
    const ageGroups = {
      '第一代': nodes.filter(n => n.age >= 60).length,
      '第二代': nodes.filter(n => n.age >= 30 && n.age < 60).length,
      '第三代': nodes.filter(n => n.age < 30).length
    };
    
    return ageGroups;
  }

  /**
   * 检查是否需要刷新数据
   * @private
   */
  shouldRefreshData() {
    if (!this.lastSyncTime) return true;
    return Date.now() - this.lastSyncTime > this.cacheExpire;
  }

  /**
   * 获取本地缓存
   * @private
   */
  getLocalCache() {
    try {
      const cached = StorageService.get(this.storageKey, null, true); // 使用同步获取
      if (cached && cached.lastUpdateTime) {
        const cacheTime = new Date(cached.lastUpdateTime).getTime();
        if (Date.now() - cacheTime < this.cacheExpire) {
          return cached;
        }
      }
      return null;
    } catch (error) {
      console.error('获取本地缓存失败:', error);
      return null;
    }
  }

  /**
   * 更新本地缓存
   * @private
   */
  updateLocalCache(data) {
    try {
      const cacheData = {
        ...data,
        lastUpdateTime: new Date().toISOString()
      };
      StorageService.set(this.storageKey, cacheData, true); // 使用同步存储
      this.localData = cacheData;
      this.lastSyncTime = Date.now();
    } catch (error) {
      console.error('更新本地缓存失败:', error);
    }
  }

  /**
   * 在缓存中更新成员信息
   * @private
   */
  updateMemberInCache(memberData) {
    try {
      const cached = this.getLocalCache();
      if (cached && Array.isArray(cached.members)) {
        const index = cached.members.findIndex(m => m.id === memberData.id);
        if (index !== -1) {
          cached.members[index] = memberData;
        } else {
          cached.members.push(memberData);
        }
        this.updateLocalCache(cached);
      } else {
        // 如果缓存不存在或 members 不是数组，创建新的缓存结构
        const newCacheData = {
          members: [memberData],
          pagination: { total: 1, page: 1, pageSize: 10 },
          statistics: {},
          familyInfo: {},
          lastUpdateTime: new Date().toISOString()
        };
        this.updateLocalCache(newCacheData);
      }
    } catch (error) {
      console.error('更新缓存中的成员信息失败:', error);
    }
  }

  /**
   * 在缓存中添加成员
   * @private
   */
  addMemberToCache(memberData) {
    try {
      const cached = this.getLocalCache();
      if (cached && Array.isArray(cached.members)) {
        cached.members.push(memberData);
        this.updateLocalCache(cached);
      } else {
        // 如果缓存不存在或 members 不是数组，创建新的缓存结构
        const newCacheData = {
          members: [memberData],
          pagination: { total: 1, page: 1, pageSize: 10 },
          statistics: {},
          familyInfo: {},
          lastUpdateTime: new Date().toISOString()
        };
        this.updateLocalCache(newCacheData);
      }
    } catch (error) {
      console.error('在缓存中添加成员失败:', error);
    }
  }

  /**
   * 从缓存中移除成员
   * @private
   */
  removeMemberFromCache(memberId) {
    try {
      const cached = this.getLocalCache();
      if (cached && Array.isArray(cached.members)) {
        cached.members = cached.members.filter(m => m.id !== memberId);
        this.updateLocalCache(cached);
      }
    } catch (error) {
      console.error('从缓存中移除成员失败:', error);
    }
  }

  /**
   * 通知数据变更
   * @private
   */
  notifyDataChange(operation, data) {
    try {
      // 触发自定义事件
      if (typeof wx !== 'undefined' && wx.eventCenter) {
        wx.eventCenter.trigger('familyDataChange', {
          operation,
          data,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('通知数据变更失败:', error);
    }
  }

  /**
   * 转换为CSV格式
   * @private
   */
  convertToCSV(data) {
    const headers = ['姓名', '年龄', '性别', '手机号', '关系', '健康状态', '服务频率', '最近服务时间'];
    const rows = data.members.map(member => [
      member.name,
      member.age,
      member.gender === 'male' ? '男' : '女',
      member.phone,
      member.relationship,
      this.getHealthStatusText(member.healthStatus),
      this.getServiceFrequencyText(member.serviceFrequency),
      member.lastServiceTime || '无'
    ]);

    return {
      headers,
      rows,
      csv: [headers, ...rows].map(row => row.join(',')).join('\n')
    };
  }

  /**
   * 获取健康状态文本
   * @private
   */
  getHealthStatusText(status) {
    const map = {
      'healthy': '健康',
      'chronic': '慢性病',
      'critical': '重症'
    };
    return map[status] || status;
  }

  /**
   * 获取服务频率文本
   * @private
   */
  getServiceFrequencyText(frequency) {
    const map = {
      'daily': '每日',
      'weekly': '每周',
      'monthly': '每月'
    };
    return map[frequency] || frequency;
  }

  /**
   * 获取家庭缓存
   * @private
   */
  getFamilyCache(familyId) {
    try {
      const cacheKey = `family_cache_${familyId}`;
      const cached = StorageService.get(cacheKey, null, true); // 使用同步获取
      
      if (cached && cached.lastUpdateTime) {
        const cacheTime = new Date(cached.lastUpdateTime).getTime();
        if (Date.now() - cacheTime < this.cacheExpire) {
          return cached;
        }
      }
      return null;
    } catch (error) {
      console.error('获取家庭缓存失败:', error);
      return null;
    }
  }

  /**
   * 更新家庭缓存
   * @private
   */
  updateFamilyCache(familyId, data) {
    try {
      const cacheKey = `family_cache_${familyId}`;
      const cacheData = {
        ...data,
        lastUpdateTime: new Date().toISOString()
      };
      StorageService.set(cacheKey, cacheData, true); // 使用同步存储
    } catch (error) {
      console.error('更新家庭缓存失败:', error);
    }
  }

  /**
   * 更新家庭信息缓存
   * @private
   */
  updateFamilyInfoCache(familyInfo) {
    try {
      const cacheKey = 'family_info_cache';
      StorageService.set(cacheKey, {
        ...familyInfo,
        lastUpdateTime: new Date().toISOString()
      }, true); // 使用同步存储
    } catch (error) {
      console.error('更新家庭信息缓存失败:', error);
    }
  }

  /**
   * 更新关系缓存
   * @private
   */
  updateRelationshipsCache(familyId, relationships) {
    try {
      const cached = this.getFamilyCache(familyId);
      if (cached) {
        cached.relationships = relationships;
        this.updateFamilyCache(familyId, cached);
      }
    } catch (error) {
      console.error('更新关系缓存失败:', error);
    }
  }

  /**
   * 清理家庭缓存
   * @private
   */
  clearFamilyCache(familyId) {
    try {
      const cacheKey = `family_cache_${familyId}`;
      StorageService.remove(cacheKey, true); // 使用同步删除
    } catch (error) {
      console.error('清理家庭缓存失败:', error);
    }
  }

  /**
   * 数组分组工具
   * @private
   */
  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key];
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  }

  /**
   * 深度克隆对象
   * @private
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item));
    }
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }

  /**
   * 格式化日期
   * @private
   */
  formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
    if (!date) return '';
    
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    const second = String(d.getSeconds()).padStart(2, '0');
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hour)
      .replace('mm', minute)
      .replace('ss', second);
  }

  /**
   * 生成唯一ID
   * @private
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 获取缓存状态
   */
  getCacheStatus() {
    const cached = this.getLocalCache();
    return {
      hasCache: !!cached,
      cacheTime: cached ? cached.lastUpdateTime : null,
      isExpired: this.shouldRefreshData(),
      memberCount: cached ? (cached.members || []).length : 0
    };
  }
}

// 创建全局实例
const familyArchiveService = new FamilyArchiveService();

module.exports = familyArchiveService;