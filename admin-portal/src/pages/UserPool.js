import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Space,
  Button,
  Input,
  Select,
  Tag,
  Modal,
  Form,
  message,
  Row,
  Col,
  Statistic,
  Tooltip,
  Popconfirm,
  Typography
} from 'antd';
import {
  SearchOutlined,
  UserAddOutlined,
  SettingOutlined,
  ReloadOutlined,
  ExportOutlined,
  UserOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import { adminAPI } from '../utils/api';

const { Option } = Select;
const { Title, Text } = Typography;

const UserPool = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [statistics, setStatistics] = useState({});
  const [filters, setFilters] = useState({
    keyword: '',
    status: '',
    subscriptionStatus: '',
    sortBy: 'u.created_at',
    sortOrder: 'desc'
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [batchAssignModalVisible, setBatchAssignModalVisible] = useState(false);
  const [generateUsersModalVisible, setGenerateUsersModalVisible] = useState(false);
  const [generateUsersLoading, setGenerateUsersLoading] = useState(false);
  const [providers, setProviders] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [assignForm] = Form.useForm();
  const [batchAssignForm] = Form.useForm();
  const [generateUsersForm] = Form.useForm();

  // 获取用户池数据
  const fetchUserPool = async (params = {}) => {
    try {
      setLoading(true);
      
      // 使用增强用户列表API
      const response = await adminAPI.getEnhancedUsers({
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...filters,
        ...params
      });

      if (response.data.success) {
        const { users, pagination: paginationData, statistics } = response.data.data;
        setUsers(users);
        setPagination(prev => ({
          ...prev,
          total: paginationData.total,
          current: paginationData.current
        }));
        setStatistics({
          totalUsers: statistics.totalUsers,
          assignedUsers: statistics.activeSubscribers + statistics.expiredSubscribers,
          unassignedUsers: statistics.nonSubscribers,
          activeSubscribers: statistics.activeSubscribers,
          expiredSubscribers: statistics.expiredSubscribers,
          totalRevenue: statistics.totalRevenue,
          averagePayment: statistics.averagePayment
        });
        
        console.log('✅ 增强用户列表加载成功:', users.length, '条记录');
      }
    } catch (error) {
      console.error('获取增强用户列表失败:', error);
      message.error('获取用户数据失败，使用模拟数据');
      
      // 使用模拟数据
      setUsers([
        {
          id: 1,
          nickname: '张大爷',
          realName: '张明华',
          phone: '138****5678',
          age: 75,
          gender: '男',
          status: 'active',
          registerTime: '2024-01-15 10:30:00',
          subscription: {
            packageName: '健康守护型',
            level: 3,
            status: 'active',
            endDate: '2024-09-15',
            monthlyPrice: 298.00,
            servicesRemaining: 2
          },
          payment: {
            totalSpent: 1490.00,
            lastPaymentTime: '2024-08-15 14:20:00',
            paymentCount: 5
          },
          address: {
            default: {
              contactName: '张明华',
              contactPhone: '13812345678',
              address: '北京市朝阳区望京街道101号',
              lastServiceTime: '2024-08-20 09:00:00'
            }
          },
          health: {
            recordCount: 45,
            lastRecordTime: '2024-08-24 08:30:00',
            riskLevel: 'medium',
            mainConditions: ['高血压', '糖尿病']
          }
        },
        {
          id: 2,
          nickname: '王奶奶',
          realName: '王丽华',
          phone: '139****6789',
          age: 68,
          gender: '女',
          status: 'active',
          registerTime: '2024-01-16 14:20:00',
          subscription: null,
          payment: {
            totalSpent: 0,
            lastPaymentTime: null,
            paymentCount: 0
          },
          address: null,
          health: {
            recordCount: 12,
            lastRecordTime: '2024-08-22 15:10:00',
            riskLevel: 'low',
            mainConditions: []
          }
        },
        {
          id: 3,
          nickname: '李大妈',
          realName: '李秀英',
          phone: '137****4567',
          age: 72,
          gender: '女',
          status: 'active',
          registerTime: '2024-01-17 09:15:00',
          subscription: {
            packageName: '专业护理型',
            level: 4,
            status: 'expired',
            endDate: '2024-08-01',
            monthlyPrice: 498.00,
            servicesRemaining: 0
          },
          payment: {
            totalSpent: 996.00,
            lastPaymentTime: '2024-06-01 10:30:00',
            paymentCount: 2
          },
          address: {
            default: {
              contactName: '李秀英',
              contactPhone: '13712345678',
              address: '上海市浦东新区世纪大道1588号',
              lastServiceTime: '2024-07-25 14:00:00'
            }
          },
          health: {
            recordCount: 67,
            lastRecordTime: '2024-08-23 11:20:00',
            riskLevel: 'high',
            mainConditions: ['心脏病', '高血压', '关节炎']
          }
        }
      ]);
      
      setStatistics({
        totalUsers: 156,
        assignedUsers: 89,
        unassignedUsers: 67,
        activeSubscribers: 45,
        expiredSubscribers: 44,
        totalRevenue: 125600.00,
        averagePayment: 805.13
      });
      
      setPagination(prev => ({
        ...prev,
        total: 156
      }));
    } finally {
      setLoading(false);
    }
  };

  // 获取服务提供者列表
  const fetchProviders = async () => {
    try {
      const response = await adminAPI.getServiceProviders({ pageSize: 100 });
      if (response.data.success) {
        setProviders(response.data.data.providers);
      }
    } catch (error) {
      console.error('获取服务提供者失败:', error);
      // 使用模拟数据
      setProviders([
        {
          id: 'provider_001',
          name: '李护士',
          profession: 'nurse',
          current_users: 15,
          max_users: 20,
          status: 'active'
        },
        {
          id: 'provider_002',
          name: '王医生',
          profession: 'doctor',
          current_users: 10,
          max_users: 15,
          status: 'active'
        },
        {
          id: 'provider_003',
          name: '张康复师',
          profession: 'therapist',
          current_users: 8,
          max_users: 12,
          status: 'active'
        }
      ]);
    }
  };

  useEffect(() => {
    fetchUserPool();
    fetchProviders();
  }, []);

  // 表格列定义
  const columns = [
    {
      title: '用户信息',
      key: 'userInfo',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.nickname}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.realName || '未填写'} | {record.age}岁 | {record.gender}
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.phone}
          </Text>
        </Space>
      ),
    },
    {
      title: '订阅套餐',
      key: 'subscription',
      render: (_, record) => {
        if (!record.subscription) {
          return <Tag color="default">未订阅</Tag>;
        }
        
        const { subscription } = record;
        const statusColors = {
          active: 'green',
          expired: 'red', 
          paused: 'orange',
          cancelled: 'red'
        };
        
        const statusTexts = {
          active: '有效',
          expired: '已过期',
          paused: '已暂停',
          cancelled: '已取消'
        };
        
        return (
          <Space direction="vertical" size={2}>
            <div>
              <Text strong>{subscription.packageName}</Text>
              <Text type="secondary" style={{ fontSize: '12px', marginLeft: 4 }}>
                (Lv.{subscription.level})
              </Text>
            </div>
            <Tag color={statusColors[subscription.status]}>
              {statusTexts[subscription.status]}
            </Tag>
            <Text style={{ fontSize: '12px', color: '#666' }}>
              至 {subscription.endDate} | 剩余 {subscription.servicesRemaining} 次
            </Text>
          </Space>
        );
      }
    },
    {
      title: '付费信息',
      key: 'payment',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ color: '#1890ff' }}>¥{record.payment.totalSpent}</Text>
          <Text style={{ fontSize: '12px', color: '#666' }}>
            共 {record.payment.paymentCount} 次付费
          </Text>
          {record.payment.lastPaymentTime && (
            <Text style={{ fontSize: '12px', color: '#666' }}>
              最近: {new Date(record.payment.lastPaymentTime).toLocaleDateString()}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: '服务地址',
      key: 'address',
      render: (_, record) => {
        if (!record.address) {
          return <Text type="secondary">未设置</Text>;
        }
        
        const { address } = record;
        return (
          <Space direction="vertical" size={2}>
            <Text strong>{address.default.contactName}</Text>
            <Text style={{ fontSize: '12px', color: '#666' }}>
              {address.default.contactPhone}
            </Text>
            <Tooltip title={address.default.address}>
              <Text style={{ fontSize: '12px', color: '#666' }} ellipsis>
                {address.default.address.length > 20 
                  ? address.default.address.substring(0, 20) + '...' 
                  : address.default.address}
              </Text>
            </Tooltip>
            {address.default.lastServiceTime && (
              <Text style={{ fontSize: '12px', color: '#999' }}>
                上次服务: {new Date(address.default.lastServiceTime).toLocaleDateString()}
              </Text>
            )}
          </Space>
        );
      }
    },
    {
      title: '健康状况',
      key: 'health',
      render: (_, record) => {
        const riskColors = {
          low: 'green',
          medium: 'orange',
          high: 'red',
          unknown: 'default'
        };
        
        const riskTexts = {
          low: '低风险',
          medium: '中风险',
          high: '高风险',
          unknown: '未知'
        };
        
        return (
          <Space direction="vertical" size={2}>
            <Tag color={riskColors[record.health.riskLevel]}>
              {riskTexts[record.health.riskLevel]}
            </Tag>
            <Text style={{ fontSize: '12px', color: '#666' }}>
              {record.health.recordCount} 条记录
            </Text>
            {record.health.mainConditions && record.health.mainConditions.length > 0 && (
              <Text style={{ fontSize: '12px', color: '#666' }}>
                {record.health.mainConditions.slice(0, 2).join(', ')}
                {record.health.mainConditions.length > 2 && '...'}
              </Text>
            )}
          </Space>
        );
      }
    },
    {
      title: '分配状态',
      dataIndex: 'assignment_status',
      key: 'assignment_status',
      render: (status, record) => {
        const statusConfig = {
          'unassigned': { color: 'default', text: '待分配' },
          'assigned': { color: 'success', text: '已分配' },
          'in_service': { color: 'processing', text: '服务中' }
        };
        const config = statusConfig[status] || statusConfig['unassigned'];
        
        return (
          <Space direction="vertical" size={2}>
            <Tag color={config.color}>{config.text}</Tag>
            {record.provider_name && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                服务者: {record.provider_name}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: '用户状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusConfig = {
          'active': { color: 'success', text: '正常' },
          'inactive': { color: 'default', text: '未激活' },
          'disabled': { color: 'error', text: '已禁用' }
        };
        const config = statusConfig[status] || statusConfig['active'];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time) => (
        <Text type="secondary">{time}</Text>
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
              icon={<UserOutlined />}
              onClick={() => handleViewUser(record)}
            />
          </Tooltip>
          
          {record.assignment_status === 'unassigned' && (
            <Tooltip title="分配服务者">
              <Button 
                size="small" 
                type="primary"
                icon={<UserAddOutlined />}
                onClick={() => handleAssignUser(record)}
              />
            </Tooltip>
          )}
          
          {record.assignment_status === 'assigned' && (
            <Tooltip title="重新分配">
              <Button 
                size="small"
                icon={<SettingOutlined />}
                onClick={() => handleReassignUser(record)}
              />
            </Tooltip>
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
    fetchUserPool({ 
      page: paginationConfig.current, 
      pageSize: paginationConfig.pageSize 
    });
  };

  // 处理筛选
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchUserPool({ page: 1 });
  };

  // 重置筛选
  const handleReset = () => {
    setFilters({
      keyword: '',
      status: '',
      assignmentStatus: ''
    });
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchUserPool({ 
      page: 1,
      keyword: '',
      status: '',
      assignmentStatus: ''
    });
  };

  // 查看用户详情
  const handleViewUser = (user) => {
    Modal.info({
      title: '用户详情',
      width: 600,
      content: (
        <div style={{ padding: '16px 0' }}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Text strong>昵称：</Text>
              <Text>{user.nickname}</Text>
            </Col>
            <Col span={12}>
              <Text strong>真实姓名：</Text>
              <Text>{user.real_name || '未填写'}</Text>
            </Col>
            <Col span={12}>
              <Text strong>手机号：</Text>
              <Text>{user.phone}</Text>
            </Col>
            <Col span={12}>
              <Text strong>年龄：</Text>
              <Text>{user.age}岁</Text>
            </Col>
            <Col span={12}>
              <Text strong>性别：</Text>
              <Text>{user.gender}</Text>
            </Col>
            <Col span={12}>
              <Text strong>注册时间：</Text>
              <Text>{user.created_at}</Text>
            </Col>
            <Col span={24}>
              <Text strong>分配状态：</Text>
              <Text>{user.assignment_status === 'assigned' ? '已分配' : '待分配'}</Text>
              {user.provider_name && (
                <>
                  <br />
                  <Text strong>当前服务者：</Text>
                  <Text>{user.provider_name}</Text>
                </>
              )}
            </Col>
          </Row>
        </div>
      ),
    });
  };

  // 分配用户
  const handleAssignUser = (user) => {
    setCurrentUser(user);
    setAssignModalVisible(true);
    assignForm.resetFields();
  };

  // 重新分配用户
  const handleReassignUser = (user) => {
    setCurrentUser(user);
    setAssignModalVisible(true);
    assignForm.resetFields();
  };

  // 执行分配
  const handleAssignSubmit = async (values) => {
    try {
      const response = await adminAPI.assignUser(
        currentUser.id,
        values.providerId,
        values.notes
      );

      if (response.data.success) {
        message.success('用户分配成功');
        setAssignModalVisible(false);
        fetchUserPool();
      }
    } catch (error) {
      console.error('分配用户失败:', error);
      message.error('分配用户失败');
    }
  };

  // 批量分配
  const handleBatchAssign = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要分配的用户');
      return;
    }
    setBatchAssignModalVisible(true);
    batchAssignForm.resetFields();
  };

  // 执行批量分配
  const handleBatchAssignSubmit = async (values) => {
    try {
      const response = await adminAPI.batchAssignUsers(
        selectedRowKeys,
        values.algorithm,
        {
          maxDistance: values.maxDistance,
          considerSpecialty: values.considerSpecialty,
          considerSchedule: values.considerSchedule,
          balanceLoad: values.balanceLoad
        }
      );

      if (response.data.success) {
        const { assignments, failed, statistics } = response.data.data;
        
        if (failed.length > 0) {
          message.warning(`成功分配 ${assignments.length} 个用户，${failed.length} 个用户分配失败`);
        } else {
          message.success(`成功分配 ${assignments.length} 个用户`);
        }
        
        setBatchAssignModalVisible(false);
        setSelectedRowKeys([]);
        fetchUserPool();
      }
    } catch (error) {
      console.error('批量分配失败:', error);
      message.error('批量分配失败');
    }
  };

  // 生成随机用户
  const handleGenerateRandomUsers = () => {
    setGenerateUsersModalVisible(true);
    generateUsersForm.resetFields();
  };

  // 删除最新10个用户
  const handleDeleteLatestUsers = () => {
    Modal.confirm({
      title: '确认删除',
      content: '您确定要删除最新的10个用户吗？此操作不可撤销！',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          setLoading(true);
          const response = await adminAPI.deleteLatestUsers(10);
          
          if (response.data.success) {
            message.success(`成功删除 ${response.data.data.deletedCount} 个最新用户`);
            fetchUserPool(); // 刷新用户列表
          }
        } catch (error) {
          console.error('删除最新用户失败:', error);
          message.error('删除最新用户失败: ' + (error.response?.data?.message || error.message));
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // 执行生成随机用户
  const handleGenerateUsersSubmit = async (values) => {
    try {
      setGenerateUsersLoading(true);
      
      const response = await adminAPI.generateRandomUsers(values.count);

      if (response.data.success) {
        const { statistics, success, failed } = response.data.data;
        
        if (failed.length > 0) {
          message.warning(
            `成功生成 ${statistics.successCount} 个用户，${statistics.failedCount} 个用户生成失败`
          );
        } else {
          message.success(`成功生成 ${statistics.successCount} 个随机用户`);
        }
        
        // 显示详细结果
        if (success.length > 0) {
          Modal.info({
            title: '随机用户生成结果',
            width: 800,
            content: (
              <div style={{ padding: '16px 0' }}>
                <p><strong>成功生成 {statistics.successCount} 个用户：</strong></p>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {success.map((user, index) => (
                    <div key={index} style={{ marginBottom: '8px', padding: '8px', background: '#f0f2f5', borderRadius: '4px' }}>
                      <Text strong>{user.nickname}</Text>
                      <Text type="secondary" style={{ marginLeft: '8px' }}>({user.realName})</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }}>手机号：{user.phone}</Text>
                    </div>
                  ))}
                </div>
                {failed.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <p style={{ color: '#ff4d4f' }}><strong>失败 {statistics.failedCount} 个：</strong></p>
                    <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                      {failed.map((fail, index) => (
                        <div key={index} style={{ marginBottom: '4px', color: '#ff4d4f', fontSize: '12px' }}>
                          {fail.userData || `第${fail.index}个用户`}: {fail.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ),
          });
        }
        
        setGenerateUsersModalVisible(false);
        fetchUserPool(); // 刷新用户列表
      }
    } catch (error) {
      console.error('生成随机用户失败:', error);
      message.error('生成随机用户失败');
    } finally {
      setGenerateUsersLoading(false);
    }
  };

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={statistics.totalUsers || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已分配"
              value={statistics.assignedUsers || 0}
              prefix={<UserAddOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待分配"
              value={statistics.unassignedUsers || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="分配率"
              value={statistics.totalUsers > 0 ? 
                Math.round((statistics.assignedUsers / statistics.totalUsers) * 100) : 0
              }
              suffix="%"
              prefix={<SettingOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        {/* 筛选工具栏 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Space>
              <Input
                placeholder="搜索用户昵称、姓名或手机号"
                prefix={<SearchOutlined />}
                value={filters.keyword}
                onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                onPressEnter={handleSearch}
                style={{ width: 280 }}
              />
              
              <Select
                placeholder="分配状态"
                value={filters.assignmentStatus}
                onChange={(value) => setFilters(prev => ({ ...prev, assignmentStatus: value }))}
                style={{ width: 120 }}
                allowClear
              >
                <Option value="unassigned">待分配</Option>
                <Option value="assigned">已分配</Option>
                <Option value="in_service">服务中</Option>
              </Select>

              <Select
                placeholder="用户状态"
                value={filters.status}
                onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                style={{ width: 120 }}
                allowClear
              >
                <Option value="active">正常</Option>
                <Option value="inactive">未激活</Option>
                <Option value="disabled">已禁用</Option>
              </Select>

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
                type="primary"
                icon={<UserAddOutlined />}
                onClick={handleBatchAssign}
                disabled={selectedRowKeys.length === 0}
              >
                批量分配 ({selectedRowKeys.length})
              </Button>
              
              <Button
                type="primary"
                ghost
                icon={<UserAddOutlined />}
                onClick={handleGenerateRandomUsers}
                style={{ borderColor: '#52c41a', color: '#52c41a' }}
              >
                生成随机用户
              </Button>
              
              <Button
                danger
                icon={<UserOutlined />}
                onClick={handleDeleteLatestUsers}
                style={{ borderColor: '#ff4d4f', color: '#ff4d4f' }}
              >
                删除最新10个用户
              </Button>
              
              <Button
                icon={<ReloadOutlined />}
                onClick={() => fetchUserPool()}
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

        {/* 用户列表表格 */}
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            getCheckboxProps: (record) => ({
              disabled: record.assignment_status === 'assigned',
            }),
          }}
          onChange={handleTableChange}
        />
      </Card>

      {/* 分配用户弹窗 */}
      <Modal
        title={`分配用户 - ${currentUser?.nickname}`}
        open={assignModalVisible}
        onCancel={() => setAssignModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={assignForm}
          layout="vertical"
          onFinish={handleAssignSubmit}
        >
          <Form.Item
            name="providerId"
            label="选择服务提供者"
            rules={[{ required: true, message: '请选择服务提供者' }]}
          >
            <Select placeholder="请选择服务提供者">
              {providers.filter(p => p.current_users < p.max_users).map(provider => (
                <Option key={provider.id} value={provider.id}>
                  <Space direction="vertical" size={2}>
                    <Text>{provider.name} ({provider.profession})</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      负载: {provider.current_users}/{provider.max_users}
                    </Text>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="notes"
            label="分配备注"
          >
            <Input.TextArea 
              placeholder="请输入分配原因或备注信息"
              rows={3}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit">
                确认分配
              </Button>
              <Button onClick={() => setAssignModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量分配弹窗 */}
      <Modal
        title={`批量智能分配 - 已选择 ${selectedRowKeys.length} 个用户`}
        open={batchAssignModalVisible}
        onCancel={() => setBatchAssignModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={batchAssignForm}
          layout="vertical"
          initialValues={{
            algorithm: 'comprehensive',
            maxDistance: 5000,
            considerSpecialty: true,
            considerSchedule: true,
            balanceLoad: true
          }}
          onFinish={handleBatchAssignSubmit}
        >
          <Form.Item
            name="algorithm"
            label="分配算法"
            rules={[{ required: true, message: '请选择分配算法' }]}
          >
            <Select>
              <Option value="distance_priority">距离优先</Option>
              <Option value="load_balance">负载均衡</Option>
              <Option value="specialty_match">专业匹配</Option>
              <Option value="comprehensive">综合评分</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="maxDistance"
            label="最大服务距离（米）"
            rules={[{ required: true, message: '请输入最大服务距离' }]}
          >
            <Input type="number" addonAfter="米" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="considerSpecialty"
                valuePropName="checked"
                label=""
              >
                <Text>考虑专业匹配</Text>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="considerSchedule"
                valuePropName="checked"
                label=""
              >
                <Text>考虑时间安排</Text>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="balanceLoad"
                valuePropName="checked"
                label=""
              >
                <Text>负载均衡</Text>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit">
                开始批量分配
              </Button>
              <Button onClick={() => setBatchAssignModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 生成随机用户弹窗 */}
      <Modal
        title="生成随机用户"
        open={generateUsersModalVisible}
        onCancel={() => setGenerateUsersModalVisible(false)}
        footer={null}
        width={500}
      >
        <div style={{ marginBottom: '16px' }}>
          <Text type="secondary">
            将为系统生成随机用户，包括基础信息、地址、健康数据、订阅套餐和支付记录。
          </Text>
        </div>
        
        <Form
          form={generateUsersForm}
          layout="vertical"
          initialValues={{ count: 10 }}
          onFinish={handleGenerateUsersSubmit}
        >
          <Form.Item
            name="count"
            label="生成用户数量"
            rules={[
              { required: true, message: '请输入用户数量' },
              { type: 'number', min: 1, max: 50, message: '用户数量必须在1-50之间' }
            ]}
          >
            <Input 
              type="number" 
              placeholder="请输入1-50之间的数字"
              addonAfter="个用户"
              min={1}
              max={50}
            />
          </Form.Item>

          <div style={{ marginBottom: '16px', padding: '12px', background: '#f0f8ff', borderRadius: '6px', border: '1px solid #d6f3ff' }}>
            <Text strong style={{ color: '#1890ff' }}>生成的数据包括：</Text>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', color: '#666' }}>
              <li>基础信息：姓名、手机号、年龄、性别等</li>
              <li>地址信息：北京市各区随机地址</li>
              <li>健康数据：血压、血糖、心率、体重等</li>
              <li>订阅套餐：70%概率生成随机套餐</li>
              <li>支付记录：50%概率生成支付历史</li>
              <li>病情信息：高血压、糖尿病等常见病情</li>
            </ul>
          </div>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={generateUsersLoading}
                icon={<UserAddOutlined />}
              >
                {generateUsersLoading ? '生成中...' : '开始生成'}
              </Button>
              <Button onClick={() => setGenerateUsersModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserPool;