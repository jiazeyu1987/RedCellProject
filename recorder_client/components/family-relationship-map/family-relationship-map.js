/**
 * 家庭关系图谱组件
 * 用于显示和管理家庭成员之间的关系
 */
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 家庭关系数据
    relationshipData: {
      type: Object,
      value: null
    },
    
    // 显示模式：view(查看), edit(编辑)
    mode: {
      type: String,
      value: 'view'
    },
    
    // 是否显示操作按钮
    showActions: {
      type: Boolean,
      value: false
    },
    
    // 当前选中的成员ID
    selectedMemberId: {
      type: String,
      value: ''
    },
    
    // 自定义样式类
    customClass: {
      type: String,
      value: ''
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // Canvas相关
    canvasId: 'family-relationship-canvas',
    canvasWidth: 350,
    canvasHeight: 400,
    
    // 节点和连线数据
    nodes: [],
    edges: [],
    
    // 选中状态
    selectedNode: null,
    selectedEdge: null,
    
    // 交互状态
    isDrawing: false,
    dragStartPos: null,
    
    // 缩放和平移
    scale: 1,
    scalePercentage: 100,
    offsetX: 0,
    offsetY: 0,
    
    // 布局配置
    layoutConfig: {
      nodeRadius: 25,
      nodePadding: 10,
      levelHeight: 80,
      centerX: 175,
      centerY: 200
    },
    
    // 样式配置
    styleConfig: {
      nodeColor: '#4A90E2',
      selectedNodeColor: '#F5A623',
      edgeColor: '#B8B8B8',
      selectedEdgeColor: '#F5A623',
      textColor: '#333333',
      fontSize: 12
    },
    
    // UI交互状态
    showRelationshipModal: false,
    targetMemberId: '',
    relationshipType: '',
    relationshipTypes: [
      { value: '配偶', label: '配偶' },
      { value: '父亲', label: '父亲' },
      { value: '母亲', label: '母亲' },
      { value: '子女', label: '子女' },
      { value: '兄弟姐妹', label: '兄弟姐妹' },
      { value: '祖父母', label: '祖父母' },
      { value: '孙子女', label: '孙子女' },
      { value: '亲戚', label: '亲戚' },
      { value: '其他', label: '其他' }
    ],
    showTips: false,
    tipText: ''
  },

  /**
   * 组件生命周期
   */
  ready() {
    this.initCanvas();
    this.processRelationshipData();
  },

  /**
   * 数据监听器
   */
  observers: {
    'relationshipData': function(newData) {
      if (newData) {
        this.processRelationshipData();
        this.drawRelationshipMap();
      }
    },
    
    'selectedMemberId': function(memberId) {
      this.setSelectedMember(memberId);
    },
    
    'scale': function(scale) {
      const scalePercentage = Math.round(scale * 100);
      this.setData({ scalePercentage });
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 初始化Canvas
     */
    initCanvas() {
      const query = this.createSelectorQuery();
      query.select(`#${this.data.canvasId}`)
        .fields({ node: true, size: true })
        .exec((res) => {
          if (res[0]) {
            const { width, height } = res[0];
            this.setData({
              canvasWidth: width,
              canvasHeight: height
            });
            this.canvas = res[0].node;
            this.ctx = this.canvas.getContext('2d');
            
            // 设置Canvas尺寸
            const dpr = wx.getSystemInfoSync().pixelRatio;
            this.canvas.width = width * dpr;
            this.canvas.height = height * dpr;
            this.ctx.scale(dpr, dpr);
            
            this.drawRelationshipMap();
          }
        });
    },

    /**
     * 处理关系数据
     */
    processRelationshipData() {
      const { relationshipData } = this.data;
      if (!relationshipData) return;

      // 处理节点数据
      const nodes = (relationshipData.nodes || []).map((node, index) => ({
        ...node,
        x: node.x || 0,
        y: node.y || 0,
        radius: this.data.layoutConfig.nodeRadius,
        index
      }));

      // 处理连线数据
      const edges = (relationshipData.edges || []).map(edge => ({
        ...edge,
        sourceNode: nodes.find(n => n.id === edge.source),
        targetNode: nodes.find(n => n.id === edge.target)
      })).filter(edge => edge.sourceNode && edge.targetNode);

      // 如果没有预设位置，自动计算布局
      if (nodes.length > 0 && nodes.every(n => n.x === 0 && n.y === 0)) {
        this.calculateLayout(nodes, edges);
      }

      this.setData({ nodes, edges });
    },

    /**
     * 计算自动布局
     */
    calculateLayout(nodes, edges) {
      const { canvasWidth, canvasHeight, layoutConfig } = this.data;
      const { nodeRadius, levelHeight, centerX } = layoutConfig;

      if (nodes.length === 1) {
        // 单个节点居中显示
        nodes[0].x = centerX;
        nodes[0].y = canvasHeight / 2;
        return;
      }

      // 尝试按年龄分层布局
      const levels = this.groupNodesByGeneration(nodes);
      const levelKeys = Object.keys(levels).sort();
      
      levelKeys.forEach((levelKey, levelIndex) => {
        const levelNodes = levels[levelKey];
        const y = (levelIndex + 1) * levelHeight;
        const spacing = Math.min(100, (canvasWidth - 60) / Math.max(1, levelNodes.length - 1));
        const startX = centerX - (spacing * (levelNodes.length - 1)) / 2;

        levelNodes.forEach((node, nodeIndex) => {
          node.x = levelNodes.length === 1 ? centerX : startX + nodeIndex * spacing;
          node.y = y;
        });
      });
    },

    /**
     * 按代际分组节点
     */
    groupNodesByGeneration(nodes) {
      const levels = {};
      
      nodes.forEach(node => {
        let level;
        if (node.age >= 60) {
          level = 'elder'; // 长辈
        } else if (node.age >= 25) {
          level = 'adult'; // 成年人
        } else {
          level = 'young'; // 年轻人/儿童
        }
        
        if (!levels[level]) {
          levels[level] = [];
        }
        levels[level].push(node);
      });

      return levels;
    },

    /**
     * 绘制关系图谱
     */
    drawRelationshipMap() {
      if (!this.ctx) return;

      const { canvasWidth, canvasHeight, nodes, edges, styleConfig, scale, offsetX, offsetY } = this.data;

      // 清空画布
      this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // 应用变换
      this.ctx.save();
      this.ctx.scale(scale, scale);
      this.ctx.translate(offsetX, offsetY);

      // 绘制连线
      this.drawEdges(edges);

      // 绘制节点
      this.drawNodes(nodes);

      this.ctx.restore();
    },

    /**
     * 绘制连线
     */
    drawEdges(edges) {
      const { styleConfig, selectedEdge } = this.data;

      edges.forEach(edge => {
        if (!edge.sourceNode || !edge.targetNode) return;

        const isSelected = selectedEdge && selectedEdge.source === edge.source && selectedEdge.target === edge.target;
        
        this.ctx.strokeStyle = isSelected ? styleConfig.selectedEdgeColor : styleConfig.edgeColor;
        this.ctx.lineWidth = isSelected ? 3 : 2;

        // 计算连线起止点（避开节点）
        const sourcePos = this.getNodeEdgePosition(edge.sourceNode, edge.targetNode);
        const targetPos = this.getNodeEdgePosition(edge.targetNode, edge.sourceNode);

        // 绘制连线
        this.ctx.beginPath();
        this.ctx.moveTo(sourcePos.x, sourcePos.y);
        
        // 使用贝塞尔曲线绘制优雅的连线
        const midX = (sourcePos.x + targetPos.x) / 2;
        const midY = (sourcePos.y + targetPos.y) / 2;
        const controlOffset = Math.abs(sourcePos.x - targetPos.x) * 0.2;
        
        this.ctx.quadraticCurveTo(midX, midY - controlOffset, targetPos.x, targetPos.y);
        this.ctx.stroke();

        // 绘制关系标签
        this.drawRelationshipLabel(edge, midX, midY - controlOffset);
      });
    },

    /**
     * 计算节点边缘位置
     */
    getNodeEdgePosition(fromNode, toNode) {
      const dx = toNode.x - fromNode.x;
      const dy = toNode.y - fromNode.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance === 0) return { x: fromNode.x, y: fromNode.y };

      const ratio = fromNode.radius / distance;
      
      return {
        x: fromNode.x + dx * ratio,
        y: fromNode.y + dy * ratio
      };
    },

    /**
     * 绘制关系标签
     */
    drawRelationshipLabel(edge, x, y) {
      const { styleConfig } = this.data;
      
      if (edge.relationship) {
        this.ctx.font = `${styleConfig.fontSize}px sans-serif`;
        this.ctx.fillStyle = styleConfig.textColor;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // 绘制背景
        const textWidth = this.ctx.measureText(edge.relationship).width;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillRect(x - textWidth/2 - 4, y - 8, textWidth + 8, 16);
        
        // 绘制文字
        this.ctx.fillStyle = styleConfig.textColor;
        this.ctx.fillText(edge.relationship, x, y);
      }
    },

    /**
     * 绘制节点
     */
    drawNodes(nodes) {
      const { styleConfig, selectedNode } = this.data;

      nodes.forEach(node => {
        const isSelected = selectedNode && selectedNode.id === node.id;
        
        // 绘制节点圆圈
        this.ctx.fillStyle = isSelected ? styleConfig.selectedNodeColor : styleConfig.nodeColor;
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        this.ctx.fill();

        // 绘制边框
        this.ctx.strokeStyle = isSelected ? styleConfig.selectedNodeColor : '#DDDDDD';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // 绘制头像（如果有）
        if (node.avatar) {
          this.drawNodeAvatar(node);
        } else {
          // 绘制性别图标
          this.drawGenderIcon(node);
        }

        // 绘制姓名
        this.drawNodeName(node);

        // 绘制年龄
        this.drawNodeAge(node);
      });
    },

    /**
     * 绘制节点头像
     */
    drawNodeAvatar(node) {
      // 这里可以实现头像绘制逻辑
      // 由于Canvas限制，简化为绘制性别图标
      this.drawGenderIcon(node);
    },

    /**
     * 绘制性别图标
     */
    drawGenderIcon(node) {
      const { styleConfig } = this.data;
      const iconSize = 16;
      
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = `${iconSize}px sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      
      const icon = node.gender === 'male' ? '♂' : '♀';
      this.ctx.fillText(icon, node.x, node.y);
    },

    /**
     * 绘制节点姓名
     */
    drawNodeName(node) {
      const { styleConfig } = this.data;
      
      this.ctx.font = `${styleConfig.fontSize}px sans-serif`;
      this.ctx.fillStyle = styleConfig.textColor;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      
      const name = node.name || '未知';
      this.ctx.fillText(name, node.x, node.y + node.radius + 5);
    },

    /**
     * 绘制节点年龄
     */
    drawNodeAge(node) {
      const { styleConfig } = this.data;
      
      this.ctx.font = `${styleConfig.fontSize - 2}px sans-serif`;
      this.ctx.fillStyle = '#999999';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      
      const age = node.age ? `${node.age}岁` : '';
      this.ctx.fillText(age, node.x, node.y + node.radius + 20);
    },

    /**
     * 设置选中成员
     */
    setSelectedMember(memberId) {
      const { nodes } = this.data;
      const selectedNode = nodes.find(node => node.id === memberId);
      
      this.setData({ selectedNode });
      this.drawRelationshipMap();
    },

    /**
     * Canvas触摸开始
     */
    onCanvasTouchStart(event) {
      const { touches } = event;
      if (touches.length === 1) {
        const touch = touches[0];
        const x = touch.x;
        const y = touch.y;

        // 检查是否点击了节点
        const clickedNode = this.getNodeAtPosition(x, y);
        if (clickedNode) {
          this.setData({ selectedNode: clickedNode });
          this.triggerEvent('nodeSelect', { node: clickedNode });
          this.drawRelationshipMap();
        }
      }
    },

    /**
     * Canvas触摸移动
     */
    onCanvasTouchMove(event) {
      // 处理触摸移动事件（如拖拽节点）
      if (this.data.mode === 'edit') {
        // 在编辑模式下可以实现节点拖拽
      }
    },

    /**
     * Canvas触摸结束
     */
    onCanvasTouchEnd(event) {
      // 处理触摸结束事件
    },

    /**
     * Canvas点击事件
     */
    onCanvasTap(event) {
      // 处理单击事件
    },

    /**
     * Canvas长按事件
     */
    onCanvasLongPress(event) {
      if (this.data.mode === 'edit') {
        // 在编辑模式下长按可以弹出菜单
        const { x, y } = event.detail;
        const clickedNode = this.getNodeAtPosition(x, y);
        
        if (clickedNode) {
          this.showNodeMenu(clickedNode, x, y);
        }
      }
    },

    /**
     * 显示节点菜单
     */
    showNodeMenu(node, x, y) {
      wx.showActionSheet({
        itemList: ['编辑成员', '建立关系', '删除成员'],
        success: (res) => {
          switch (res.tapIndex) {
            case 0:
              this.triggerEvent('editMember', { member: node });
              break;
            case 1:
              this.setData({ 
                selectedNode: node,
                showRelationshipModal: true 
              });
              break;
            case 2:
              this.confirmDeleteMember(node);
              break;
          }
        }
      });
    },

    /**
     * 确认删除成员
     */
    confirmDeleteMember(node) {
      wx.showModal({
        title: '确认删除',
        content: `是否确认删除成员“${node.name}”？`,
        confirmText: '删除',
        confirmColor: '#ff4d4f',
        success: (res) => {
          if (res.confirm) {
            this.deleteMember(node);
          }
        }
      });
    },

    /**
     * 删除成员
     */
    deleteMember(node) {
      const { nodes, edges } = this.data;
      
      // 删除节点
      const newNodes = nodes.filter(n => n.id !== node.id);
      
      // 删除相关连线
      const newEdges = edges.filter(edge => 
        edge.source !== node.id && edge.target !== node.id
      );
      
      this.setData({ 
        nodes: newNodes, 
        edges: newEdges,
        selectedNode: null
      });
      
      this.drawRelationshipMap();
      this.triggerEvent('memberDelete', { member: node });
    },

    /**
     * 缩放放大
     */
    zoomIn() {
      const newScale = Math.min(this.data.scale * 1.2, 3);
      this.setData({ scale: newScale });
      this.drawRelationshipMap();
    },

    /**
     * 缩放缩小
     */
    zoomOut() {
      const newScale = Math.max(this.data.scale / 1.2, 0.5);
      this.setData({ scale: newScale });
      this.drawRelationshipMap();
    },

    /**
     * 关闭节点信息
     */
    closeNodeInfo() {
      this.setData({ selectedNode: null });
    },

    /**
     * 编辑成员
     */
    editMember(event) {
      const { member } = event.currentTarget.dataset;
      this.triggerEvent('editMember', { member });
    },

    /**
     * 建立关系
     */
    addRelationship(event) {
      const { member } = event.currentTarget.dataset;
      this.setData({ 
        selectedNode: member,
        showRelationshipModal: true,
        targetMemberId: '',
        relationshipType: ''
      });
    },

    /**
     * 查看详情
     */
    viewDetails(event) {
      const { member } = event.currentTarget.dataset;
      this.triggerEvent('viewDetails', { member });
    },

    /**
     * 选择目标成员
     */
    selectTargetMember(event) {
      const { memberId } = event.currentTarget.dataset;
      this.setData({ targetMemberId: memberId });
    },

    /**
     * 选择关系类型
     */
    selectRelationshipType(event) {
      const { type } = event.currentTarget.dataset;
      this.setData({ relationshipType: type });
    },

    /**
     * 隐藏关系弹窗
     */
    hideRelationshipModal() {
      this.setData({ 
        showRelationshipModal: false,
        targetMemberId: '',
        relationshipType: ''
      });
    },

    /**
     * 确认建立关系
     */
    confirmRelationship() {
      const { selectedNode, targetMemberId, relationshipType } = this.data;
      
      if (!targetMemberId || !relationshipType) {
        wx.showToast({
          title: '请选择成员和关系类型',
          icon: 'none'
        });
        return;
      }
      
      // 建立关系
      this.addRelationship(selectedNode.id, targetMemberId, relationshipType);
      
      // 隐藏弹窗
      this.hideRelationshipModal();
    },

    /**
     * 添加第一个成员
     */
    addFirstMember() {
      this.triggerEvent('addMember');
    },

    /**
     * 编辑模式
     */
    editMode() {
      this.triggerEvent('editMode');
    },

    /**
     * 导出图谱
     */
    exportMap() {
      const mapData = this.exportMapData();
      this.triggerEvent('exportMap', { data: mapData });
    },

    /**
     * 获取指定位置的节点
     */
    getNodeAtPosition(x, y) {
      const { nodes, scale, offsetX, offsetY } = this.data;
      
      // 转换坐标
      const transformedX = (x - offsetX) / scale;
      const transformedY = (y - offsetY) / scale;

      return nodes.find(node => {
        const distance = Math.sqrt(
          Math.pow(transformedX - node.x, 2) + 
          Math.pow(transformedY - node.y, 2)
        );
        return distance <= node.radius;
      });
    },

    /**
     * 获取组件边界矩形
     */
    getBoundingClientRect() {
      return new Promise((resolve) => {
        const query = this.createSelectorQuery();
        query.select(`#${this.data.canvasId}`)
          .boundingClientRect()
          .exec((res) => {
            resolve(res[0]);
          });
      });
    },

    /**
     * 添加新关系
     */
    addRelationship(sourceNodeId, targetNodeId, relationship) {
      const { nodes, edges } = this.data;
      
      // 检查关系是否已存在
      const existingEdge = edges.find(edge => 
        (edge.source === sourceNodeId && edge.target === targetNodeId) ||
        (edge.source === targetNodeId && edge.target === sourceNodeId)
      );
      
      if (existingEdge) {
        wx.showToast({
          title: '关系已存在',
          icon: 'none'
        });
        return;
      }

      const sourceNode = nodes.find(n => n.id === sourceNodeId);
      const targetNode = nodes.find(n => n.id === targetNodeId);
      
      if (!sourceNode || !targetNode) {
        return;
      }

      const newEdge = {
        source: sourceNodeId,
        target: targetNodeId,
        relationship,
        sourceNode,
        targetNode
      };

      const newEdges = [...edges, newEdge];
      this.setData({ edges: newEdges });
      
      this.drawRelationshipMap();
      this.triggerEvent('relationshipAdd', { edge: newEdge });
    },

    /**
     * 删除关系
     */
    removeRelationship(sourceNodeId, targetNodeId) {
      const { edges } = this.data;
      
      const newEdges = edges.filter(edge => 
        !((edge.source === sourceNodeId && edge.target === targetNodeId) ||
          (edge.source === targetNodeId && edge.target === sourceNodeId))
      );
      
      this.setData({ edges: newEdges });
      this.drawRelationshipMap();
      this.triggerEvent('relationshipRemove', { sourceNodeId, targetNodeId });
    },

    /**
     * 更新节点位置
     */
    updateNodePosition(nodeId, x, y) {
      const { nodes } = this.data;
      const nodeIndex = nodes.findIndex(n => n.id === nodeId);
      
      if (nodeIndex !== -1) {
        const updatedNodes = [...nodes];
        updatedNodes[nodeIndex] = { ...updatedNodes[nodeIndex], x, y };
        
        this.setData({ nodes: updatedNodes });
        this.drawRelationshipMap();
      }
    },

    /**
     * 重置布局
     */
    resetLayout() {
      const { nodes, edges } = this.data;
      this.calculateLayout(nodes, edges);
      this.setData({ 
        nodes,
        scale: 1,
        offsetX: 0,
        offsetY: 0
      });
      this.drawRelationshipMap();
    },

    /**
     * 导出图谱数据
     */
    exportMapData() {
      const { nodes, edges } = this.data;
      return {
        nodes: nodes.map(node => ({
          id: node.id,
          name: node.name,
          age: node.age,
          gender: node.gender,
          x: node.x,
          y: node.y
        })),
        edges: edges.map(edge => ({
          source: edge.source,
          target: edge.target,
          relationship: edge.relationship
        }))
      };
    }
  }
});