/**
 * 退款申请组件
 * @description 用于提交退款申请的组件
 * @version 1.0.0
 * @author 系统管理员
 * @date 2025-09-01
 */

import { REFUND_TYPES } from '../../constants/payment-constants.js';
import refundService from '../../services/refund.service.js';

Component({
  properties: {
    // 支付信息
    paymentInfo: {
      type: Object,
      value: {}
    },
    
    // 是否显示组件
    visible: {
      type: Boolean,
      value: false
    }
  },

  data: {
    // 退款申请表单
    refundForm: {
      amount: 0,
      reason: '',
      type: REFUND_TYPES.USER_REQUEST,
      evidence: []
    },
    
    // 退款类型选项
    refundTypes: [
      { value: REFUND_TYPES.USER_REQUEST, label: '用户申请退款' },
      { value: REFUND_TYPES.SERVICE_CANCEL, label: '服务取消退款' },
      { value: REFUND_TYPES.SYSTEM_ERROR, label: '系统错误退款' }
    ],
    
    // 常用退款原因
    commonReasons: [
      '服务不满意',
      '重复支付',
      '服务取消',
      '系统故障',
      '其他原因'
    ],
    
    // 上传的证据文件
    evidenceFiles: [],
    
    // 提交状态
    submitting: false,
    
    // 表单验证错误
    errors: {}
  },

  observers: {
    'visible': function(visible) {
      if (visible) {
        this.resetForm();
        this.loadPaymentInfo();
      }
    }
  },

  methods: {
    /**
     * 重置表单
     */
    resetForm() {
      this.setData({
        refundForm: {
          amount: 0,
          reason: '',
          type: REFUND_TYPES.USER_REQUEST,
          evidence: []
        },
        evidenceFiles: [],
        errors: {}
      });
    },

    /**
     * 加载支付信息
     */
    loadPaymentInfo() {
      const { paymentInfo } = this.properties;
      if (paymentInfo && paymentInfo.amount) {
        this.setData({
          'refundForm.amount': paymentInfo.amount
        });
      }
    },

    /**
     * 更新退款金额
     */
    onAmountChange(e) {
      const amount = parseFloat(e.detail.value) || 0;
      const { paymentInfo } = this.properties;
      
      // 验证金额
      if (amount > paymentInfo.amount) {
        this.setData({
          'errors.amount': '退款金额不能超过原支付金额'
        });
        return;
      }
      
      if (amount <= 0) {
        this.setData({
          'errors.amount': '请输入有效的退款金额'
        });
        return;
      }
      
      this.setData({
        'refundForm.amount': amount,
        'errors.amount': ''
      });
    },

    /**
     * 更新退款原因
     */
    onReasonChange(e) {
      const reason = e.detail.value.trim();
      
      if (!reason) {
        this.setData({
          'errors.reason': '请填写退款原因'
        });
        return;
      }
      
      this.setData({
        'refundForm.reason': reason,
        'errors.reason': ''
      });
    },

    /**
     * 选择退款类型
     */
    onTypeSelect(e) {
      const { type } = e.currentTarget.dataset;
      this.setData({
        'refundForm.type': type
      });
    },

    /**
     * 选择常用原因
     */
    onReasonSelect(e) {
      const { reason } = e.currentTarget.dataset;
      this.setData({
        'refundForm.reason': reason,
        'errors.reason': ''
      });
    },

    /**
     * 上传证据文件
     */
    onUploadEvidence() {
      const that = this;
      
      wx.chooseMedia({
        count: 9,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const tempFiles = res.tempFiles;
          const evidenceFiles = [...this.data.evidenceFiles];
          
          // 处理选中的文件
          tempFiles.forEach(file => {
            if (evidenceFiles.length < 9) {
              evidenceFiles.push({
                tempFilePath: file.tempFilePath,
                size: file.size,
                type: 'image',
                uploaded: false
              });
            }
          });
          
          this.setData({ evidenceFiles });
          
          // 上传文件
          this.uploadEvidenceFiles();
        },
        fail: (error) => {
          console.error('选择文件失败:', error);
          wx.showToast({
            title: '选择文件失败',
            icon: 'error'
          });
        }
      });
    },

    /**
     * 上传证据文件到服务器
     */
    async uploadEvidenceFiles() {
      const { evidenceFiles } = this.data;
      const uploadPromises = [];
      
      evidenceFiles.forEach((file, index) => {
        if (!file.uploaded) {
          const promise = this.uploadSingleFile(file, index);
          uploadPromises.push(promise);
        }
      });
      
      try {
        await Promise.all(uploadPromises);
        console.log('所有证据文件上传完成');
      } catch (error) {
        console.error('文件上传失败:', error);
        wx.showToast({
          title: '文件上传失败',
          icon: 'error'
        });
      }
    },

    /**
     * 上传单个文件
     */
    uploadSingleFile(file, index) {
      return new Promise((resolve, reject) => {
        wx.uploadFile({
          url: '/api/upload/evidence',
          filePath: file.tempFilePath,
          name: 'file',
          success: (res) => {
            try {
              const result = JSON.parse(res.data);
              if (result.success) {
                const updatedFiles = [...this.data.evidenceFiles];
                updatedFiles[index] = {
                  ...file,
                  uploaded: true,
                  url: result.url,
                  fileId: result.fileId
                };
                
                this.setData({ evidenceFiles: updatedFiles });
                resolve(result);
              } else {
                reject(new Error(result.message));
              }
            } catch (error) {
              reject(error);
            }
          },
          fail: reject
        });
      });
    },

    /**
     * 删除证据文件
     */
    onDeleteEvidence(e) {
      const { index } = e.currentTarget.dataset;
      const evidenceFiles = [...this.data.evidenceFiles];
      evidenceFiles.splice(index, 1);
      
      this.setData({ evidenceFiles });
    },

    /**
     * 预览证据文件
     */
    onPreviewEvidence(e) {
      const { index } = e.currentTarget.dataset;
      const { evidenceFiles } = this.data;
      
      const urls = evidenceFiles.map(file => file.url || file.tempFilePath);
      
      wx.previewImage({
        current: urls[index],
        urls: urls
      });
    },

    /**
     * 验证表单
     */
    validateForm() {
      const { refundForm } = this.data;
      const { paymentInfo } = this.properties;
      const errors = {};
      
      // 验证金额
      if (!refundForm.amount || refundForm.amount <= 0) {
        errors.amount = '请输入有效的退款金额';
      } else if (refundForm.amount > paymentInfo.amount) {
        errors.amount = '退款金额不能超过原支付金额';
      }
      
      // 验证原因
      if (!refundForm.reason || refundForm.reason.trim().length < 5) {
        errors.reason = '请填写详细的退款原因（至少5个字符）';
      }
      
      this.setData({ errors });
      return Object.keys(errors).length === 0;
    },

    /**
     * 提交退款申请
     */
    async onSubmitRefund() {
      if (this.data.submitting) return;

      // 验证表单
      if (!this.validateForm()) {
        wx.showToast({
          title: '请检查表单信息',
          icon: 'error'
        });
        return;
      }

      try {
        this.setData({ submitting: true });

        const { refundForm, evidenceFiles } = this.data;
        const { paymentInfo } = this.properties;

        // 构建退款申请
        const refundRequest = {
          paymentId: paymentInfo.paymentId,
          userId: wx.getStorageSync('userInfo')?.userId || 'current_user',
          amount: refundForm.amount,
          reason: refundForm.reason.trim(),
          type: refundForm.type,
          evidence: evidenceFiles.filter(file => file.uploaded).map(file => ({
            fileId: file.fileId,
            url: file.url,
            type: file.type
          }))
        };

        // 提交退款申请
        const result = await refundService.applyRefund(refundRequest);

        if (result.success) {
          wx.showToast({
            title: '退款申请提交成功',
            icon: 'success'
          });

          // 触发申请成功事件
          this.triggerEvent('refundApplied', {
            refundId: result.refundId,
            status: result.status,
            approvalRequired: result.approvalRequired
          });

          this.onClose();
        }

      } catch (error) {
        console.error('提交退款申请失败:', error);
        
        let errorMessage = '提交失败';
        if (error.message.includes('不存在')) {
          errorMessage = '支付记录不存在';
        } else if (error.message.includes('状态')) {
          errorMessage = '支付状态不允许退款';
        } else if (error.message.includes('金额')) {
          errorMessage = '退款金额无效';
        }

        wx.showToast({
          title: errorMessage,
          icon: 'error'
        });

        // 触发申请失败事件
        this.triggerEvent('refundError', {
          error: error.message
        });

      } finally {
        this.setData({ submitting: false });
      }
    },

    /**
     * 关闭组件
     */
    onClose() {
      this.triggerEvent('close');
    },

    /**
     * 格式化金额显示
     */
    formatAmount(amount) {
      return (amount || 0).toFixed(2);
    },

    /**
     * 获取退款类型文本
     */
    getTypeText(type) {
      const typeMap = {
        [REFUND_TYPES.USER_REQUEST]: '用户申请',
        [REFUND_TYPES.SERVICE_CANCEL]: '服务取消',
        [REFUND_TYPES.SYSTEM_ERROR]: '系统错误',
        [REFUND_TYPES.FULL]: '全额退款',
        [REFUND_TYPES.PARTIAL]: '部分退款'
      };
      return typeMap[type] || '未知类型';
    }
  }
});