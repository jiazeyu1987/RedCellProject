/**
 * 调整审批服务
 * 负责管理时间调整的审批流程、状态跟踪和通知
 */

const TimeAdjustPermissionService = require('./time-adjust-permission.service.js');
const NotificationService = require('./notification-service.js');
const { TIME_ADJUST_CONFIG } = require('../constants/time-adjust-config.js');
const CONFIG = require('../constants/config.js');

class AdjustmentApprovalService {
  
  /**
   * 创建调整审批申请
   * @param {Object} userInfo 申请用户信息
   * @param {Object} adjustData 调整数据
   * @returns {Promise<Object>} 审批申请结果
   */
  static async createAdjustmentApproval(userInfo, adjustData) {
    const result = {
      success: false,
      approvalId: null,
      status: 'pending',
      workflow: null,
      estimatedTime: 0,
      message: ''
    };
    
    try {
      // 1. 验证调整权限
      const permissionResult = await TimeAdjustPermissionService.validateAdjustRequest(userInfo, adjustData);
      
      if (!permissionResult.valid) {
        result.message = '调整请求验证失败：' + permissionResult.errors.join(', ');
        return result;
      }
      
      // 2. 生成审批ID
      const approvalId = this.generateApprovalId();
      result.approvalId = approvalId;
      
      // 3. 构建审批工作流
      const workflow = TimeAdjustPermissionService.getApprovalWorkflow(
        permissionResult.adjustType,
        permissionResult.impactScore
      );
      
      result.workflow = workflow;
      result.estimatedTime = this.calculateEstimatedApprovalTime(workflow);
      
      // 4. 创建审批记录
      const approvalRecord = {
        id: approvalId,
        applicant: {
          id: userInfo.id,
          name: userInfo.name,
          role: userInfo.role
        },
        adjustmentRequest: adjustData,
        permissionAnalysis: permissionResult,
        workflow: workflow,
        status: 'pending',
        currentStep: 1,
        steps: workflow.steps.map((step, index) => ({
          stepNumber: index + 1,
          role: step.role,
          name: step.name,
          status: index === 0 ? 'pending' : 'waiting',
          assignedTo: null,
          startTime: index === 0 ? new Date() : null,
          completedTime: null,
          decision: null,
          comments: null,
          autoApprove: step.autoApprove || false,
          urgent: step.urgent || false
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          source: 'mobile_app',
          priority: this.determineApprovalPriority(permissionResult),
          tags: this.generateApprovalTags(adjustData, permissionResult)
        }
      };
      
      // 5. 保存审批记录
      await this.saveApprovalRecord(approvalRecord);
      
      // 6. 启动审批流程
      const workflowResult = await this.startApprovalWorkflow(approvalRecord);
      
      if (workflowResult.success) {
        result.success = true;
        result.status = 'pending';
        result.message = `审批申请已提交（${approvalId}），预计${result.estimatedTime}小时内完成审批`;
        
        // 7. 发送审批通知
        await this.sendApprovalNotifications(approvalRecord);
      } else {
        result.message = workflowResult.error || '启动审批流程失败';
      }
      
      return result;
      
    } catch (error) {
      console.error('创建调整审批申请失败:', error);
      result.message = '审批申请创建失败，请稍后重试';
      return result;
    }
  }
  
  /**
   * 处理审批决策
   * @param {string} approvalId 审批ID
   * @param {Object} approverInfo 审批人信息
   * @param {Object} decision 审批决策
   * @returns {Promise<Object>} 处理结果
   */
  static async processApprovalDecision(approvalId, approverInfo, decision) {
    const result = {
      success: false,
      status: '',
      nextStep: null,
      completed: false,
      message: ''
    };
    
    try {
      // 1. 获取审批记录
      const approvalRecord = await this.getApprovalRecord(approvalId);
      if (!approvalRecord) {
        result.message = '审批记录不存在';
        return result;
      }
      
      // 2. 验证审批权限
      const canApprove = TimeAdjustPermissionService.canApproveAdjustment(
        approverInfo.role,
        approvalRecord.adjustmentRequest
      );
      
      if (!canApprove) {
        result.message = '没有审批权限';
        return result;
      }
      
      // 3. 更新当前步骤
      const currentStepIndex = approvalRecord.currentStep - 1;
      const currentStep = approvalRecord.steps[currentStepIndex];
      
      currentStep.status = decision.action === 'approve' ? 'approved' : 'rejected';
      currentStep.assignedTo = approverInfo.id;
      currentStep.completedTime = new Date();
      currentStep.decision = decision.action;
      currentStep.comments = decision.comments || '';
      
      // 4. 处理审批结果
      if (decision.action === 'reject') {
        // 拒绝，结束审批流程
        approvalRecord.status = 'rejected';
        approvalRecord.finalDecision = 'rejected';
        result.status = 'rejected';
        result.completed = true;
        result.message = '审批已拒绝';
        
        // 标记后续步骤为取消
        for (let i = currentStepIndex + 1; i < approvalRecord.steps.length; i++) {
          approvalRecord.steps[i].status = 'cancelled';
        }
      } else {
        // 批准，检查是否有下一步
        if (currentStepIndex + 1 < approvalRecord.steps.length) {
          // 有下一步，继续审批流程
          approvalRecord.currentStep = currentStepIndex + 2;
          const nextStep = approvalRecord.steps[currentStepIndex + 1];
          nextStep.status = 'pending';
          nextStep.startTime = new Date();
          
          approvalRecord.status = 'in_progress';
          result.status = 'in_progress';
          result.nextStep = {
            stepNumber: nextStep.stepNumber,
            role: nextStep.role,
            name: nextStep.name,
            urgent: nextStep.urgent
          };
          result.message = `当前步骤已批准，转至下一步：${nextStep.name}`;
        } else {
          // 最后一步，审批完成
          approvalRecord.status = 'approved';
          approvalRecord.finalDecision = 'approved';
          approvalRecord.completedAt = new Date();
          result.status = 'approved';
          result.completed = true;
          result.message = '审批已完成，调整申请获得批准';
        }
      }
      
      // 5. 更新审批记录
      approvalRecord.updatedAt = new Date();
      await this.updateApprovalRecord(approvalRecord);
      
      // 6. 发送通知
      await this.sendApprovalDecisionNotifications(approvalRecord, decision, approverInfo);
      
      // 7. 如果审批完成，执行调整
      if (result.completed && result.status === 'approved') {
        await this.executeApprovedAdjustment(approvalRecord);
      }
      
      result.success = true;
      return result;
      
    } catch (error) {
      console.error('处理审批决策失败:', error);
      result.message = '审批处理失败，请稍后重试';
      return result;
    }
  }
  
  /**
   * 获取用户的审批列表
   * @param {Object} userInfo 用户信息
   * @param {Object} options 查询选项
   * @returns {Promise<Array>} 审批列表
   */
  static async getUserApprovalList(userInfo, options = {}) {
    try {
      const {
        status = null,
        role = null,
        timeRange = 'week'
      } = options;
      
      const approvals = [];
      
      // 获取作为申请人的审批
      if (!role || role === 'applicant') {
        const applicantApprovals = await this.getApprovalsByApplicant(userInfo.id, status);
        approvals.push(...applicantApprovals.map(approval => ({
          ...approval,
          userRole: 'applicant'
        })));
      }
      
      // 获取作为审批人的审批
      if (!role || role === 'approver') {
        const approverApprovals = await this.getApprovalsByApprover(userInfo.role, status);
        approvals.push(...approverApprovals.map(approval => ({
          ...approval,
          userRole: 'approver'
        })));
      }
      
      return this.filterAndSortApprovals(approvals, timeRange);
      
    } catch (error) {
      console.error('获取审批列表失败:', error);
      return [];
    }
  }
  
  // 工具方法
  static generateApprovalId() {
    return 'APPR_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  static calculateEstimatedApprovalTime(workflow) {
    let totalTime = 0;
    workflow.steps.forEach(step => {
      if (step.autoApprove) {
        totalTime += 0.1;
      } else if (step.urgent) {
        totalTime += 2;
      } else {
        totalTime += step.deadline || 24;
      }
    });
    return Math.ceil(totalTime);
  }
  
  static determineApprovalPriority(permissionResult) {
    if (permissionResult.adjustType === 'emergency') {
      return 'urgent';
    } else if (permissionResult.impactScore > 70) {
      return 'high';
    } else if (permissionResult.warnings.length > 0) {
      return 'medium';
    }
    return 'normal';
  }
  
  static generateApprovalTags(adjustData, permissionResult) {
    const tags = [permissionResult.adjustType];
    
    if (permissionResult.impactScore > 70) tags.push('high_impact');
    if (adjustData.isEmergency) tags.push('emergency');
    if (adjustData.batchAdjust) tags.push('batch');
    
    const hoursDiff = Math.abs(new Date(adjustData.newTime) - new Date(adjustData.originalTime)) / (1000 * 60 * 60);
    if (hoursDiff > 24) tags.push('large_adjustment');
    
    return tags;
  }
  
  // 存储方法
  static async saveApprovalRecord(approvalRecord) {
    try {
      const storageKey = `approval_record_${approvalRecord.id}`;
      wx.setStorageSync(storageKey, approvalRecord);
      return true;
    } catch (error) {
      console.error('保存审批记录失败:', error);
      return false;
    }
  }
  
  static async getApprovalRecord(approvalId) {
    try {
      const storageKey = `approval_record_${approvalId}`;
      return wx.getStorageSync(storageKey) || null;
    } catch (error) {
      console.error('获取审批记录失败:', error);
      return null;
    }
  }
  
  static async updateApprovalRecord(approvalRecord) {
    try {
      const storageKey = `approval_record_${approvalRecord.id}`;
      wx.setStorageSync(storageKey, approvalRecord);
      return true;
    } catch (error) {
      console.error('更新审批记录失败:', error);
      return false;
    }
  }
  
  // 其他方法...
  static async startApprovalWorkflow(approvalRecord) {
    try {
      const currentStep = approvalRecord.steps[0];
      
      if (currentStep.autoApprove) {
        const autoDecision = {
          action: 'approve',
          comments: '系统自动审批通过',
          timestamp: new Date()
        };
        
        return await this.processApprovalDecision(
          approvalRecord.id,
          { id: 'system', name: '系统', role: 'system' },
          autoDecision
        );
      }
      
      return { success: true };
    } catch (error) {
      console.error('启动审批工作流失败:', error);
      return { success: false, error: error.message };
    }
  }
  
  static async sendApprovalNotifications(approvalRecord) {
    // 通知实现...
  }
  
  static async sendApprovalDecisionNotifications(approvalRecord, decision, approverInfo) {
    // 通知实现...
  }
  
  static async executeApprovedAdjustment(approvalRecord) {
    // 执行调整...
  }
  
  static async getApprovalsByApplicant(applicantId, status = null) {
    // 获取申请人审批...
    return [];
  }
  
  static async getApprovalsByApprover(approverRole, status = null) {
    // 获取审批人审批...
    return [];
  }
  
  static filterAndSortApprovals(approvals, timeRange) {
    // 过滤和排序...
    return approvals;
  }
}

module.exports = AdjustmentApprovalService;