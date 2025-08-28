// 智能分配算法模块
// 用于根据不同策略为用户分配最合适的服务提供者

/**
 * 计算两点间的地理距离（单位：米）
 * @param {number} lat1 纬度1
 * @param {number} lon1 经度1
 * @param {number} lat2 纬度2
 * @param {number} lon2 经度2
 * @returns {number} 距离（米）
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // 地球半径（米）
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return Math.round(R * c);
}

/**
 * 距离优先算法
 * 优先分配距离最近的服务提供者
 * @param {Object} user 用户信息
 * @param {Array} providers 可用服务提供者列表
 * @param {Object} options 选项
 * @returns {Object|null} 最佳匹配结果
 */
function distancePriorityMatch(user, providers, options = {}) {
  const { maxDistance = 5000 } = options;
  
  if (!user.latitude || !user.longitude) {
    return null; // 用户没有位置信息
  }

  let bestMatch = null;
  let minDistance = Infinity;

  for (const provider of providers) {
    if (!provider.service_center_lat || !provider.service_center_lng) {
      continue; // 服务提供者没有位置信息
    }

    if (provider.current_users >= provider.max_users) {
      continue; // 服务提供者已满
    }

    const distance = calculateDistance(
      user.latitude, user.longitude,
      provider.service_center_lat, provider.service_center_lng
    );

    if (distance <= maxDistance && distance < minDistance) {
      minDistance = distance;
      bestMatch = {
        provider,
        distance,
        score: Math.max(0, 100 - (distance / maxDistance) * 100),
        reason: `距离最近（${Math.round(distance/1000 * 10)/10}公里）`
      };
    }
  }

  return bestMatch;
}

/**
 * 负载均衡算法
 * 优先分配给用户数量较少的服务提供者
 * @param {Object} user 用户信息
 * @param {Array} providers 可用服务提供者列表
 * @param {Object} options 选项
 * @returns {Object|null} 最佳匹配结果
 */
function loadBalanceMatch(user, providers, options = {}) {
  const { maxDistance = 5000, considerDistance = true } = options;
  
  let bestMatch = null;
  let bestScore = -1;

  for (const provider of providers) {
    if (provider.current_users >= provider.max_users) {
      continue; // 服务提供者已满
    }

    let score = 0;
    let distance = null;

    // 负载因子（0-100）
    const loadFactor = provider.max_users > 0 ? 
      (1 - provider.current_users / provider.max_users) * 60 : 60;
    score += loadFactor;

    // 距离因子（0-40）
    if (considerDistance && user.latitude && user.longitude && 
        provider.service_center_lat && provider.service_center_lng) {
      distance = calculateDistance(
        user.latitude, user.longitude,
        provider.service_center_lat, provider.service_center_lng
      );
      
      if (distance > maxDistance) {
        continue; // 超出服务范围
      }
      
      const distanceFactor = Math.max(0, 40 - (distance / maxDistance) * 40);
      score += distanceFactor;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        provider,
        distance,
        score: Math.round(score),
        reason: `负载均衡最优（${provider.current_users}/${provider.max_users}用户）`
      };
    }
  }

  return bestMatch;
}

/**
 * 专业匹配算法
 * 根据用户健康状况匹配专业服务提供者
 * @param {Object} user 用户信息
 * @param {Array} providers 可用服务提供者列表
 * @param {Object} options 选项
 * @returns {Object|null} 最佳匹配结果
 */
function specialtyMatch(user, providers, options = {}) {
  const { maxDistance = 5000, healthConditionMap } = options;
  
  // 健康状况到专业的映射
  const defaultHealthConditionMap = {
    'high_blood_pressure': ['blood_pressure', 'general_medicine'],
    'diabetes': ['diabetes_care', 'general_medicine'],
    'heart_disease': ['cardiac_care', 'general_medicine'],
    'rehabilitation': ['physical_therapy', 'rehabilitation'],
    'elderly_care': ['elderly_care', 'general_medicine']
  };
  
  const conditionMap = healthConditionMap || defaultHealthConditionMap;
  const userConditions = user.health_condition ? [user.health_condition] : [];
  
  let bestMatch = null;
  let bestScore = -1;

  for (const provider of providers) {
    if (provider.current_users >= provider.max_users) {
      continue;
    }

    let score = 0;
    let distance = null;
    let specialtyMatch = false;

    // 解析服务提供者的专业特长
    let providerSpecialties = [];
    if (provider.specialties) {
      try {
        providerSpecialties = typeof provider.specialties === 'string' ? 
          JSON.parse(provider.specialties) : provider.specialties;
      } catch (e) {
        providerSpecialties = [];
      }
    }

    // 专业匹配评分（0-50分）
    for (const condition of userConditions) {
      const requiredSpecialties = conditionMap[condition] || [];
      const matchCount = requiredSpecialties.filter(spec => 
        providerSpecialties.includes(spec)
      ).length;
      
      if (matchCount > 0) {
        specialtyMatch = true;
        score += (matchCount / requiredSpecialties.length) * 50;
      }
    }

    // 如果没有专业匹配，给通用医疗一定分数
    if (!specialtyMatch && providerSpecialties.includes('general_medicine')) {
      score += 25;
      specialtyMatch = true;
    }

    // 距离评分（0-30分）
    if (user.latitude && user.longitude && 
        provider.service_center_lat && provider.service_center_lng) {
      distance = calculateDistance(
        user.latitude, user.longitude,
        provider.service_center_lat, provider.service_center_lng
      );
      
      if (distance > maxDistance) {
        continue;
      }
      
      score += Math.max(0, 30 - (distance / maxDistance) * 30);
    }

    // 负载评分（0-20分）
    if (provider.max_users > 0) {
      score += (1 - provider.current_users / provider.max_users) * 20;
    }

    if (score > bestScore) {
      bestScore = score;
      const matchedSpecialties = userConditions.map(condition => 
        conditionMap[condition] || []
      ).flat().filter(spec => providerSpecialties.includes(spec));
      
      bestMatch = {
        provider,
        distance,
        score: Math.round(score),
        reason: specialtyMatch ? 
          `专业匹配（${matchedSpecialties.join(', ')}）` : 
          '通用医疗服务'
      };
    }
  }

  return bestMatch;
}

/**
 * 综合评分算法
 * 综合考虑距离、负载、专业匹配等多个因子
 * @param {Object} user 用户信息
 * @param {Array} providers 可用服务提供者列表
 * @param {Object} options 选项
 * @returns {Object|null} 最佳匹配结果
 */
function comprehensiveMatch(user, providers, options = {}) {
  const { 
    maxDistance = 5000,
    distanceWeight = 0.4,
    loadWeight = 0.3,
    specialtyWeight = 0.3
  } = options;
  
  let bestMatch = null;
  let bestScore = -1;

  for (const provider of providers) {
    if (provider.current_users >= provider.max_users) {
      continue;
    }

    let totalScore = 0;
    let distance = null;
    const scoreBreakdown = {
      distance: 0,
      load: 0,
      specialty: 0
    };

    // 距离评分
    if (user.latitude && user.longitude && 
        provider.service_center_lat && provider.service_center_lng) {
      distance = calculateDistance(
        user.latitude, user.longitude,
        provider.service_center_lat, provider.service_center_lng
      );
      
      if (distance > maxDistance) {
        continue;
      }
      
      scoreBreakdown.distance = Math.max(0, 100 - (distance / maxDistance) * 100);
      totalScore += scoreBreakdown.distance * distanceWeight;
    }

    // 负载评分
    if (provider.max_users > 0) {
      scoreBreakdown.load = (1 - provider.current_users / provider.max_users) * 100;
      totalScore += scoreBreakdown.load * loadWeight;
    }

    // 专业匹配评分
    let providerSpecialties = [];
    if (provider.specialties) {
      try {
        providerSpecialties = typeof provider.specialties === 'string' ? 
          JSON.parse(provider.specialties) : provider.specialties;
      } catch (e) {
        providerSpecialties = [];
      }
    }

    if (user.health_condition) {
      const healthConditionMap = {
        'high_blood_pressure': ['blood_pressure', 'general_medicine'],
        'diabetes': ['diabetes_care', 'general_medicine'],
        'heart_disease': ['cardiac_care', 'general_medicine']
      };
      
      const requiredSpecialties = healthConditionMap[user.health_condition] || ['general_medicine'];
      const matchCount = requiredSpecialties.filter(spec => 
        providerSpecialties.includes(spec)
      ).length;
      
      scoreBreakdown.specialty = (matchCount / requiredSpecialties.length) * 100;
      totalScore += scoreBreakdown.specialty * specialtyWeight;
    } else {
      scoreBreakdown.specialty = providerSpecialties.includes('general_medicine') ? 80 : 50;
      totalScore += scoreBreakdown.specialty * specialtyWeight;
    }

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestMatch = {
        provider,
        distance,
        score: Math.round(totalScore),
        reason: `综合评分最优（距离:${Math.round(scoreBreakdown.distance)}, 负载:${Math.round(scoreBreakdown.load)}, 专业:${Math.round(scoreBreakdown.specialty)}）`,
        scoreBreakdown
      };
    }
  }

  return bestMatch;
}

/**
 * 主分配函数
 * 根据指定算法为用户找到最佳服务提供者
 * @param {Object} user 用户信息
 * @param {Array} providers 可用服务提供者列表
 * @param {string} algorithm 算法类型
 * @param {Object} options 选项
 * @returns {Object|null} 最佳匹配结果
 */
async function findBestMatch(user, providers, algorithm = 'comprehensive', options = {}) {
  // 过滤可用的服务提供者
  const availableProviders = providers.filter(provider => 
    provider.status === 'active' && provider.current_users < provider.max_users
  );

  if (availableProviders.length === 0) {
    return null;
  }

  switch (algorithm) {
    case 'distance_priority':
      return distancePriorityMatch(user, availableProviders, options);
    
    case 'load_balance':
      return loadBalanceMatch(user, availableProviders, options);
    
    case 'specialty_match':
      return specialtyMatch(user, availableProviders, options);
    
    case 'comprehensive':
    default:
      return comprehensiveMatch(user, availableProviders, options);
  }
}

/**
 * 批量分配函数
 * 为多个用户批量分配服务提供者
 * @param {Array} users 用户列表
 * @param {Array} providers 服务提供者列表
 * @param {string} algorithm 算法类型
 * @param {Object} options 选项
 * @returns {Array} 分配结果列表
 */
async function batchAssign(users, providers, algorithm = 'comprehensive', options = {}) {
  const results = [];
  const providersCopy = providers.map(p => ({...p})); // 创建副本以追踪当前用户数
  
  for (const user of users) {
    const match = await findBestMatch(user, providersCopy, algorithm, options);
    
    if (match) {
      results.push({
        userId: user.id,
        providerId: match.provider.id,
        distance: match.distance,
        score: match.score,
        reason: match.reason
      });
      
      // 更新服务提供者的当前用户数
      const providerIndex = providersCopy.findIndex(p => p.id === match.provider.id);
      if (providerIndex >= 0) {
        providersCopy[providerIndex].current_users += 1;
      }
    } else {
      results.push({
        userId: user.id,
        error: '未找到合适的服务提供者'
      });
    }
  }
  
  return results;
}

module.exports = {
  findBestMatch,
  batchAssign,
  calculateDistance,
  distancePriorityMatch,
  loadBalanceMatch,
  specialtyMatch,
  comprehensiveMatch
};