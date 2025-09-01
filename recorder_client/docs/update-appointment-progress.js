#!/usr/bin/env node

/**
 * 预约时间调整功能 - 快速进度更新脚本
 * 
 * 使用方法:
 * node update-appointment-progress.js [阶段] [子任务] [状态]
 * 
 * 例如：
 * node update-appointment-progress.js 3.1 3.1.1 已完成
 * node update-appointment-progress.js 3.1 all 正在做
 */

const fs = require('fs');
const path = require('path');

class AppointmentProgressUpdater {
  constructor() {
    this.todoListPath = path.join(__dirname, '记录员小程序开发TodoList.md');
    this.currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // 预约时间调整功能的任务映射
    this.taskMap = {
      '3.1': {
        title: '设计时间调整界面',
        subtasks: {
          '3.1.1': '设计时间调整弹窗界面',
          '3.1.2': '开发时间选择器增强功能', 
          '3.1.3': '设计调整历史界面'
        }
      },
      '3.2': {
        title: '实现时间调整核心功能',
        subtasks: {
          '3.2.1': '开发单个预约时间调整',
          '3.2.2': '开发批量时间调整功能',
          '3.2.3': '实现智能调整推荐'
        }
      },
      '3.3': {
        title: '开发调整通知系统',
        subtasks: {
          '3.3.1': '实现患者通知功能',
          '3.3.2': '实现内部协调通知',
          '3.3.3': '开发通知历史管理'
        }
      },
      '3.4': {
        title: '实现调整权限与审批',
        subtasks: {
          '3.4.1': '开发调整权限控制',
          '3.4.2': '实现审批流程功能',
          '3.4.3': '开发紧急调整处理'
        }
      },
      '3.5': {
        title: '开发调整历史与统计',
        subtasks: {
          '3.5.1': '实现调整历史记录',
          '3.5.2': '开发调整统计分析',
          '3.5.3': '实现调整效果追踪'
        }
      },
      '3.6': {
        title: '开发调整异常处理',
        subtasks: {
          '3.6.1': '实现调整冲突处理',
          '3.6.2': '开发调整失败处理',
          '3.6.3': '实现调整数据恢复'
        }
      },
      '3.7': {
        title: '开发调整性能优化',
        subtasks: {
          '3.7.1': '实现调整算法优化',
          '3.7.2': '优化调整界面响应',
          '3.7.3': '实现调整数据优化'
        }
      }
    };
  }

  /**
   * 更新指定任务的状态
   */
  async updateTask(phase, subtask, status) {
    try {
      console.log(`🔄 开始更新任务进度...`);
      
      if (subtask === 'all') {
        await this.updatePhaseStatus(phase, status);
      } else {
        await this.updateSubtaskStatus(phase, subtask, status);
      }
      
      // 检查是否需要更新阶段状态
      await this.checkAndUpdatePhaseStatus(phase);
      
      console.log(`✅ 更新完成！`);
      
    } catch (error) {
      console.error(`❌ 更新失败: ${error.message}`);
    }
  }

  /**
   * 更新子任务状态
   */
  async updateSubtaskStatus(phase, subtask, status) {
    const content = fs.readFileSync(this.todoListPath, 'utf8');
    let updatedContent = content;

    const emoji = this.getStatusEmoji(status);
    const timeInfo = status === '已完成' ? ` (完成时间: ${this.currentDate})` : '';

    // 更新主要子任务行
    const subtaskRegex = new RegExp(
      `(- \\*\\*${subtask.replace('.', '\\.')} [^*]+\\*\\*) [🔴🟡🟢⭕✅][^\\n]*`,
      'g'
    );
    
    updatedContent = updatedContent.replace(subtaskRegex, `$1 ${emoji}${timeInfo}`);

    // 更新详细任务项
    const taskTitle = this.taskMap[phase]?.subtasks[subtask];
    if (taskTitle) {
      const detailRegex = new RegExp(
        `(\\s+- [^\\n]*${taskTitle}[^\\n]*) [🔴🟡🟢⭕✅][^\\n]*`,
        'g'
      );
      updatedContent = updatedContent.replace(detailRegex, `$1 ${emoji}${timeInfo}`);
    }

    fs.writeFileSync(this.todoListPath, updatedContent, 'utf8');
    console.log(`  ✓ 已更新子任务 ${subtask}: ${status}`);
  }

  /**
   * 更新阶段状态
   */
  async updatePhaseStatus(phase, status) {
    const content = fs.readFileSync(this.todoListPath, 'utf8');
    let updatedContent = content;

    const emoji = this.getStatusEmoji(status);
    const timeInfo = status === '已完成' ? ` (完成时间: ${this.currentDate})` : '';

    // 更新主要阶段行
    const phaseTitle = this.taskMap[phase]?.title;
    if (phaseTitle) {
      const phaseRegex = new RegExp(
        `(\\*\\*${phase.replace('.', '\\.')} [^*]+\\*\\*) [🔴🟡🟢⭕✅][^\\n]*`,
        'g'
      );
      updatedContent = updatedContent.replace(phaseRegex, `$1 ${emoji}${timeInfo}`);

      // 更新状态行
      const statusRegex = new RegExp(
        `(\\*\\*状态\\*\\*): [🔴🟡🟢⭕✅] [^\\n]+`,
        'g'
      );
      updatedContent = updatedContent.replace(statusRegex, `$1: ${emoji} ${status}`);

      // 如果是已完成，更新完成时间
      if (status === '已完成') {
        const timeRegex = new RegExp(
          `(\\*\\*完成时间\\*\\*): [^\\n]+`,
          'g'
        );
        updatedContent = updatedContent.replace(timeRegex, `$1: ${this.currentDate}`);
      }
    }

    fs.writeFileSync(this.todoListPath, updatedContent, 'utf8');
    console.log(`  ✓ 已更新阶段 ${phase}: ${status}`);
  }

  /**
   * 检查并自动更新阶段状态
   */
  async checkAndUpdatePhaseStatus(phase) {
    const content = fs.readFileSync(this.todoListPath, 'utf8');
    const subtasks = this.taskMap[phase]?.subtasks;
    
    if (!subtasks) return;

    const subtaskKeys = Object.keys(subtasks);
    let completedCount = 0;
    let inProgressCount = 0;

    // 检查每个子任务状态
    for (const subtaskKey of subtaskKeys) {
      const subtaskRegex = new RegExp(`\\*\\*${subtaskKey.replace('.', '\\.')} [^*]+\\*\\* ([🔴🟡🟢⭕✅])`);
      const match = content.match(subtaskRegex);
      
      if (match) {
        const statusEmoji = match[1];
        if (statusEmoji === '✅' || statusEmoji === '🟢') {
          completedCount++;
        } else if (statusEmoji === '🟡') {
          inProgressCount++;
        }
      }
    }

    // 自动更新阶段状态
    let newPhaseStatus = null;
    if (completedCount === subtaskKeys.length) {
      newPhaseStatus = '已完成';
    } else if (inProgressCount > 0 || completedCount > 0) {
      newPhaseStatus = '正在做';
    }

    if (newPhaseStatus) {
      const currentPhaseRegex = new RegExp(`\\*\\*状态\\*\\*: [🔴🟡🟢⭕✅] ([^\\n]+)`);
      const currentMatch = content.match(currentPhaseRegex);
      
      if (currentMatch && currentMatch[1] !== newPhaseStatus) {
        await this.updatePhaseStatus(phase, newPhaseStatus);
        console.log(`  ✓ 自动更新阶段 ${phase} 状态为: ${newPhaseStatus}`);
      }
    }
  }

  /**
   * 获取状态对应的emoji
   */
  getStatusEmoji(status) {
    const statusMap = {
      '未开始': '🔴',
      '正在做': '🟡', 
      '已完成': '✅'
    };
    return statusMap[status] || '⭕';
  }

  /**
   * 显示当前进度概览
   */
  showProgress() {
    const content = fs.readFileSync(this.todoListPath, 'utf8');
    
    console.log('\n📊 预约时间调整功能开发进度概览:\n');
    
    for (const [phase, phaseData] of Object.entries(this.taskMap)) {
      const phaseRegex = new RegExp(`\\*\\*${phase.replace('.', '\\.')} [^*]+\\*\\* ([🔴🟡🟢⭕✅])`);
      const phaseMatch = content.match(phaseRegex);
      const phaseStatus = phaseMatch ? phaseMatch[1] : '🔴';
      
      console.log(`${phaseStatus} ${phase} ${phaseData.title}`);
      
      for (const [subtask, subtaskTitle] of Object.entries(phaseData.subtasks)) {
        const subtaskRegex = new RegExp(`\\*\\*${subtask.replace('.', '\\.')} [^*]+\\*\\* ([🔴🟡🟢⭕✅])`);
        const subtaskMatch = content.match(subtaskRegex);
        const subtaskStatus = subtaskMatch ? subtaskMatch[1] : '🔴';
        
        console.log(`    ${subtaskStatus} ${subtask} ${subtaskTitle}`);
      }
      console.log('');
    }
  }

  /**
   * 显示使用帮助
   */
  showHelp() {
    console.log(`
📋 预约时间调整功能进度更新工具

使用方法:
  node update-appointment-progress.js [命令] [参数...]

命令:
  update <阶段> <子任务> <状态>   - 更新指定任务状态
  progress                        - 显示当前进度概览
  help                           - 显示此帮助信息

参数说明:
  阶段: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
  子任务: 3.1.1, 3.1.2, 3.1.3, ... 或 'all' (更新整个阶段)
  状态: 未开始, 正在做, 已完成

示例:
  node update-appointment-progress.js update 3.1 3.1.1 已完成
  node update-appointment-progress.js update 3.1 all 正在做
  node update-appointment-progress.js progress
    `);
  }
}

// 处理命令行参数
const args = process.argv.slice(2);
const updater = new AppointmentProgressUpdater();

if (args.length === 0) {
  updater.showHelp();
} else {
  const command = args[0];
  
  switch (command) {
    case 'update':
      if (args.length === 4) {
        updater.updateTask(args[1], args[2], args[3]);
      } else {
        console.log('❌ update命令需要3个参数: <阶段> <子任务> <状态>');
        updater.showHelp();
      }
      break;
      
    case 'progress':
      updater.showProgress();
      break;
      
    case 'help':
    default:
      updater.showHelp();
      break;
  }
}

module.exports = AppointmentProgressUpdater;