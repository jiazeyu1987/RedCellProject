import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Space,
  Button,
  Input,
  Select,
  Tag,
  DatePicker,
  message,
  Row,
  Col,
  Statistic,
  Typography,
  Tooltip,
  Modal,
  Progress
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
  EyeOutlined,
  SettingOutlined,
  CalendarOutlined,
  UserOutlined,
  TeamOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const Assignments = () => {
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [filters, setFilters] = useState({
    keyword: '',
    status: '',
    assignmentType: '',
    dateRange: null
  });

  // 安全数据处理函数
  const safeGetNumber = (value, defaultValue = 0) => {
    if (value === null || value === undefined || value === '') return defaultValue;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? defaultValue : num;
  };

  const safeToFixed = (value, digits = 2, defaultText = '未设置') => {
    const num = safeGetNumber(value);
    return num === 0 ? defaultText : num.toFixed(digits);
  };

  // 获取分配记录数据
  const fetchAssignments = async (params = {}) => {
    try {
      setLoading(true);
      
      // 这里应该调用真实的API
      // const response = await adminAPI.getAssignments({
      //   page: pagination.current,
      //   pageSize: pagination.pageSize,
      //   ...filters,
      //   ...params
      // });

      // 使用模拟数据
      const mockAssignments = [
        {
          id: 'assign_001',
          user: {
            id: 1,
            nickname: '张大爷',
            real_name: '张明华',
            phone: '138****5678',
            age: 75
          },
          provider: {
            id: 'provider_001',
            name: '李护士',
            profession: 'nurse'
          },
          assignment_type: 'automatic',
          assigned_by: 'admin',
          assignment_reason: '智能分配 - 距离优先',
          distance_meters: 1200,
          match_score: 95,
          status: 'active',
          assigned_at: '2024-01-20 14:30:00',
          cancelled_at: null,
          completed_at: null
        },
        {
          id: 'assign_002',
          user: {
            id: 2,
            nickname: '王奶奶',
            real_name: '王丽华',
            phone: '139****6789',
            age: 68
          },
          provider: {
            id: 'provider_002',
            name: '王医生',
            profession: 'doctor'
          },
          assignment_type: 'manual',
          assigned_by: 'admin',
          assignment_reason: '用户有高血压，需要医生专业护理',
          distance_meters: 2800,
          match_score: 88,
          status: 'active',
          assigned_at: '2024-01-20 13:15:00',
          cancelled_at: null,
          completed_at: null
        },
        {
          id: 'assign_003',
          user: {
            id: 3,
            nickname: '李大妈',
            real_name: '李秀英',
            phone: '137****4567',
            age: 72
          },
          provider: {
            id: 'provider_003',
            name: '张康复师',
            profession: 'therapist'
          },
          assignment_type: 'automatic',
          assigned_by: 'admin',
          assignment_reason: '智能分配 - 专业匹配',
          distance_meters: 900,
          match_score: 92,
          status: 'completed',
          assigned_at: '2024-01-19 11:45:00',
          cancelled_at: null,
          completed_at: '2024-01-20 09:30:00'
        },
        {
          id: 'assign_004',
          user: {
            id: 4,
            nickname: '赵爷爷',
            real_name: '赵建国',
            phone: '136****3456',
            age: 80
          },
          provider: {
            id: 'provider_001',
            name: '李护士',
            profession: 'nurse'
          },
          assignment_type: 'manual',
          assigned_by: 'admin',
          assignment_reason: '用户指定护士',
          distance_meters: 1500,
          match_score: 85,
          status: 'cancelled',
          assigned_at: '2024-01-18 16:20:00',
          cancelled_at: '2024-01-19 10:15:00',
          completed_at: null
        }
      ];

      setAssignments(mockAssignments);
      setPagination(prev => ({
        ...prev,
        total: mockAssignments.length
      }));

    } catch (error) {
      console.error('获取分配记录失败:', error);
      message.error('获取分配记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  // 职业翻译
  const professionMap = {
    'doctor': '医生',
    'nurse': '护士',
    'therapist': '康复师',
    'caregiver': '护理员'
  };

  // 表格列定义
  const columns = [
    {
      title: '用户信息',
      key: 'userInfo',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.user.nickname}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.user.real_name} | {record.user.age}岁
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.user.phone}
          </Text>
        </Space>
      ),
    },
    {
      title: '服务提供者',
      key: 'providerInfo',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.provider.name}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {professionMap[record.provider.profession]}
          </Text>
        </Space>
      ),
    },
    {
      title: '分配信息',
      key: 'assignmentInfo',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Tag color={record.assignment_type === 'automatic' ? 'blue' : 'green'}>
            {record.assignment_type === 'automatic' ? '智能分配' : '手动分配'}
          </Tag>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            距离: {safeToFixed(safeGetNumber(record.distance_meters) / 1000, 1, '未知')}公里
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            匹配度: {record.match_score}分
          </Text>
        </Space>
      ),
    },
    {
      title: '分配原因',
      dataIndex: 'assignment_reason',
      key: 'assignment_reason',
      render: (reason) => (
        <Tooltip title={reason}>
          <Text style={{ fontSize: '12px' }}>
            {reason.length > 20 ? `${reason.substring(0, 20)}...` : reason}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        const statusConfig = {
          'active': { color: 'processing', text: '进行中' },
          'completed': { color: 'success', text: '已完成' },
          'cancelled': { color: 'error', text: '已取消' }
        };
        const config = statusConfig[status] || statusConfig['active'];
        
        return (
          <Space direction="vertical" size={2}>
            <Tag color={config.color}>{config.text}</Tag>
            {status === 'completed' && record.completed_at && (
              <Text type="secondary" style={{ fontSize: '11px' }}>
                完成: {record.completed_at}
              </Text>
            )}
            {status === 'cancelled' && record.cancelled_at && (
              <Text type="secondary" style={{ fontSize: '11px' }}>
                取消: {record.cancelled_at}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: '分配时间',
      dataIndex: 'assigned_at',
      key: 'assigned_at',
      render: (time) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>{time}</Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Tooltip title="查看详情">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => handleViewAssignment(record)}
            />
          </Tooltip>
          
          {record.status === 'active' && (
            <>
              <Tooltip title="重新分配">
                <Button 
                  size="small"
                  icon={<SettingOutlined />}
                  onClick={() => handleReassign(record)}
                />
              </Tooltip>
              
              <Tooltip title="取消分配">
                <Button 
                  size="small"
                  danger
                  onClick={() => handleCancelAssignment(record)}
                >
                  取消
                </Button>
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  // 处理表格变化
  const handleTableChange = (paginationConfig, filters, sorter) => {
    const newPagination = {
      ...pagination,
      current: paginationConfig.current,
      pageSize: paginationConfig.pageSize
    };
    setPagination(newPagination);
    fetchAssignments({ 
      page: paginationConfig.current, 
      pageSize: paginationConfig.pageSize 
    });
  };

  // 处理筛选
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchAssignments({ page: 1 });
  };

  // 重置筛选
  const handleReset = () => {
    setFilters({
      keyword: '',
      status: '',
      assignmentType: '',
      dateRange: null
    });
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchAssignments({ 
      page: 1,
      keyword: '',
      status: '',
      assignmentType: '',
      dateRange: null
    });
  };

  // 查看分配详情
  const handleViewAssignment = (assignment) => {
    Modal.info({
      title: '分配详情',
      width: 700,
      content: (
        <div style={{ padding: '16px 0' }}>
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Title level={5}>用户信息</Title>
              <Text>昵称: {assignment.user.nickname}</Text><br />
              <Text>真实姓名: {assignment.user.real_name}</Text><br />
              <Text>手机号: {assignment.user.phone}</Text><br />
              <Text>年龄: {assignment.user.age}岁</Text>
            </Col>
            
            <Col span={24}>
              <Title level={5}>服务提供者信息</Title>
              <Text>姓名: {assignment.provider.name}</Text><br />
              <Text>职业: {professionMap[assignment.provider.profession]}</Text>
            </Col>
            
            <Col span={24}>
              <Title level={5}>分配信息</Title>
              <Text>分配方式: {assignment.assignment_type === 'automatic' ? '智能分配' : '手动分配'}</Text><br />
              <Text>分配原因: {assignment.assignment_reason}</Text><br />
              <Text>距离: {safeToFixed(safeGetNumber(assignment.distance_meters) / 1000, 1, '未知')}公里</Text><br />
              <Text>匹配度: {assignment.match_score}分</Text><br />
              <Text>分配时间: {assignment.assigned_at}</Text><br />
              <Text>状态: </Text>
              <Tag color={
                assignment.status === 'active' ? 'processing' : 
                assignment.status === 'completed' ? 'success' : 'error'
              }>
                {assignment.status === 'active' ? '进行中' : 
                 assignment.status === 'completed' ? '已完成' : '已取消'}
              </Tag>
            </Col>
          </Row>
        </div>
      ),
    });
  };

  // 重新分配
  const handleReassign = (assignment) => {
    message.info('重新分配功能开发中');
  };

  // 取消分配
  const handleCancelAssignment = (assignment) => {
    Modal.confirm({
      title: '确认取消分配',
      content: `确定要取消 ${assignment.user.nickname} 的分配吗？`,
      onOk: () => {
        message.success('分配已取消');
        fetchAssignments();
      }
    });
  };

  // 获取统计数据
  const getStatistics = () => {
    const totalAssignments = assignments.length;
    const activeAssignments = assignments.filter(a => a.status === 'active').length;
    const completedAssignments = assignments.filter(a => a.status === 'completed').length;
    const autoAssignments = assignments.filter(a => a.assignment_type === 'automatic').length;
    const autoAssignmentRate = totalAssignments > 0 ? Math.round((autoAssignments / totalAssignments) * 100) : 0;

    return {
      totalAssignments,
      activeAssignments,
      completedAssignments,
      autoAssignmentRate
    };
  };

  const stats = getStatistics();

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总分配数"
              value={stats.totalAssignments}
              prefix={<SettingOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="进行中"
              value={stats.activeAssignments}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已完成"
              value={stats.completedAssignments}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="智能分配率"
              value={stats.autoAssignmentRate}
              suffix="%"
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        {/* 筛选工具栏 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Space wrap>
              <Input
                placeholder="搜索用户或服务提供者"
                prefix={<SearchOutlined />}
                value={filters.keyword}
                onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                onPressEnter={handleSearch}
                style={{ width: 200 }}
              />
              
              <Select
                placeholder="分配状态"
                value={filters.status}
                onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                style={{ width: 120 }}
                allowClear
              >
                <Option value="active">进行中</Option>
                <Option value="completed">已完成</Option>
                <Option value="cancelled">已取消</Option>
              </Select>

              <Select
                placeholder="分配方式"
                value={filters.assignmentType}
                onChange={(value) => setFilters(prev => ({ ...prev, assignmentType: value }))}
                style={{ width: 120 }}
                allowClear
              >
                <Option value="automatic">智能分配</Option>
                <Option value="manual">手动分配</Option>
              </Select>

              <RangePicker
                value={filters.dateRange}
                onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates }))}
                placeholder={['开始日期', '结束日期']}
                style={{ width: 240 }}
              />

              <Button type="primary" onClick={handleSearch}>
                搜索
              </Button>
              
              <Button onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Col>

          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => fetchAssignments()}
              >
                刷新
              </Button>
              
              <Button
                icon={<ExportOutlined />}
                onClick={() => message.info('导出功能开发中')}
              >
                导出
              </Button>
            </Space>
          </Col>
        </Row>

        {/* 分配记录表格 */}
        <Table
          columns={columns}
          dataSource={assignments}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          onChange={handleTableChange}
        />
      </Card>
    </div>
  );
};

export default Assignments;