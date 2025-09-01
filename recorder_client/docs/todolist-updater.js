/**
 * TodoList更新助手工具
 * 用于快速更新"开发预约时间调整功能"的子任务进展
 */

const fs = require('fs');
const path = require('path');

class TodoListUpdater {
  constructor() {
    this.todoListPath = path.join(__dirname, '记录员小程序开发TodoList.md');
    this.statusEmojis = {
      '未开始': '⭕',
      '正在做': '🟡', 
      '已完成': '✅'
    };
  }

  /**
   * 更新子任务状态
   * @param {string} taskPath - 任务路径，如 "3.1.1"
   * @param {string} status - 状态：未开始/正在做/已完成
   * @param {string} completionTime - 完成时间（可选）
   */
  async updateSubTask(taskPath, status, completionTime = null) {
    try {
      const content = fs.readFileSync(this.todoListPath, 'utf8');
      const lines = content.split('\n');
      
      // 查找对应任务行
      const taskRegex = new RegExp(`^(\\s*)- \\*\\*${taskPath.replace('.', '\\.')} .+?\\*\\* [⭕🟡✅🔴]`);
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(taskRegex);
        
        if (match) {
          const indent = match[1];
          const taskName = line.split('**')[1].split('**')[0];
          const emoji = this.statusEmojis[status] || '⭕';
          
          // 构建新的任务行
          let newLine = `${indent}- **${taskName}** ${emoji}`;
          if (status === '已完成' && completionTime) {
            newLine += ` (完成时间: ${completionTime})`;
          }
          
          lines[i] = newLine;
          
          // 更新对应的子任务状态
          this.updateSubTaskDetails(lines, i, taskPath, status, completionTime);
          
          break;
        }
      }
      
      // 写回文件
      fs.writeFileSync(this.todoListPath, lines.join('\n'), 'utf8');
      console.log(`✅ 已更新任务 ${taskPath} 状态为: ${status}`);
      
    } catch (error) {
      console.error('❌ 更新TodoList失败:', error.message);
    }
  }

  /**
   * 更新子任务详细内容
   */
  updateSubTaskDetails(lines, startIndex, taskPath, status, completionTime) {
    const emoji = this.statusEmojis[status] || '⭕';
    
    // 查找子任务详细列表
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      
      // 如果遇到下一个主任务，停止搜索
      if (line.match(/^- \*\*\d+\.\d+\.\d+/)) {
        break;
      }
      
      // 更新对应的详细任务项
      if (line.includes(`${taskPath} `)) {
        const taskContent = line.split(' ')[1]; // 获取任务内容
        let newLine = `  - ${taskContent} ${emoji}`;
        if (status === '已完成' && completionTime) {
          newLine += ` (完成时间: ${completionTime})`;
        }
        lines[i] = newLine;
        break;
      }
    }
  }

  /**
   * 更新主要阶段状态
   * @param {string} phase - 阶段编号，如 "3.1", "3.2"
   * @param {string} status - 状态
   * @param {string} startTime - 开始时间（可选）
   * @param {string} completionTime - 完成时间（可选）
   */
  async updatePhase(phase, status, startTime = null, completionTime = null) {
    try {
      const content = fs.readFileSync(this.todoListPath, 'utf8');
      const lines = content.split('\n');
      
      // 查找对应阶段
      const phaseRegex = new RegExp(`^\\*\\*${phase.replace('.', '\\.')} .+?\\*\\* [⭕🟡✅🔴]`);
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(phaseRegex);
        
        if (match) {
          const phaseName = line.split('**')[1].split('**')[0];
          const emoji = this.statusEmojis[status] || '⭕';
          
          lines[i] = `**${phaseName}** ${emoji}`;
          
          // 更新状态和时间信息
          if (i + 1 < lines.length && lines[i + 1].includes('**状态**:')) {
            lines[i + 1] = `**状态**: ${emoji} ${status}`;
          }
          
          if (startTime && i + 2 < lines.length && lines[i + 2].includes('**开始时间**:')) {
            lines[i + 2] = `**开始时间**: ${startTime}`;
          }
          
          if (completionTime && i + 3 < lines.length && lines[i + 3].includes('**完成时间**:')) {
            lines[i + 3] = `**完成时间**: ${completionTime}`;
          }
          
          break;
        }
      }
      
      fs.writeFileSync(this.todoListPath, lines.join('\n'), 'utf8');
      console.log(`✅ 已更新阶段 ${phase} 状态为: ${status}`);
      
    } catch (error) {
      console.error('❌ 更新阶段状态失败:', error.message);
    }
  }

  /**
   * 批量更新一组子任务
   * @param {Array} tasks - 任务数组，格式: [{path: "3.1.1", status: "已完成", time: "2025-08-31"}]
   */
  async batchUpdateTasks(tasks) {
    for (const task of tasks) {
      await this.updateSubTask(task.path, task.status, task.time);
    }
  }

  /**
   * 生成当前时间字符串
   */
  getCurrentTime() {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD格式
  }

  /**
   * 显示使用帮助
   */
  showHelp() {
    console.log(`
📋 TodoList更新助手使用说明:

1. 更新单个子任务:
   updater.updateSubTask("3.1.1", "已完成", "2025-08-31");

2. 更新阶段状态:
   updater.updatePhase("3.1", "正在做", "2025-08-31");

3. 批量更新:
   updater.batchUpdateTasks([
     {path: "3.1.1", status: "已完成", time: "2025-08-31"},
     {path: "3.1.2", status: "正在做"}
   ]);

4. 获取当前时间:
   updater.getCurrentTime();

状态选项: 未开始 | 正在做 | 已完成
    `);
  }
}

// 导出实例
const updater = new TodoListUpdater();

// 使用示例
if (require.main === module) {
  updater.showHelp();
  
  // 示例：更新第一个子任务为已完成
  // updater.updateSubTask("3.1.1", "已完成", updater.getCurrentTime());
}

module.exports = updater;