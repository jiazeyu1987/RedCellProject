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
  Progress,
  Typography,
  Descriptions,
  List
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
  EyeOutlined,
  EditOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  MedicineBoxOutlined,
  UserOutlined
} from '@ant-design/icons';
import { adminAPI } from '../utils/api';

const { Option } = Select;
const { Title, Text } = Typography;

const ServiceProviders = () => {
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [filters, setFilters] = useState({
    keyword: '',
    status: '',
    profession: ''
  });
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentProvider, setCurrentProvider] = useState(null);

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

  // 获取服务提供者数据
  const fetchProviders = async (params = {}) => {
    try {
      setLoading(true);
      const response = await adminAPI.getServiceProviders({
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...filters,
        ...params
      });

      if (response.data.success) {
        const { providers, pagination: paginationData } = response.data.data;
        setProviders(providers);
        setPagination(prev => ({
          ...prev,
          total: paginationData.total,
          current: paginationData.page
        }));
      }
    } catch (error) {
      console.error('获取服务提供者数据失败:', error);
      message.error('获取服务提供者数据失败');
      
      // 使用模拟数据
      setProviders([
        {
          id: 'provider_001',
          name: '李护士',
          profession: 'nurse',
          license_number: 'N2024001',
          phone: '13800001001',
          email: 'li.nurse@example.com',
          service_center_lat: 39.9204,
          service_center_lng: 116.4490,
          service_radius: 5000,
          max_users: 20,
          current_users: 15,
          specialties: ['blood_pressure', 'diabetes_care', 'wound_care'],
          work_schedule: [
            { day: 'monday', startTime: '08:00', endTime: '17:00' },
            { day: 'tuesday', startTime: '08:00', endTime: '17:00' },
            { day: 'wednesday', startTime: '08:00', endTime: '17:00' },
            { day: 'thursday', startTime: '08:00', endTime: '17:00' },
            { day: 'friday', startTime: '08:00', endTime: '17:00' }
          ],
          status: 'active',
          rating: 4.8,
          total_reviews: 127,
          created_at: '2024-01-10 09:00:00'
        },
        {
          id: 'provider_002',
          name: '王医生',
          profession: 'doctor',
          license_number: 'D2024001',
          phone: '13800001002',
          email: 'wang.doctor@example.com',
          service_center_lat: 39.9593,
          service_center_lng: 116.2979,
          service_radius: 8000,
          max_users: 15,
          current_users: 10,
          specialties: ['general_medicine', 'elderly_care', 'chronic_disease'],
          work_schedule: [
            { day: 'monday', startTime: '09:00', endTime: '18:00' },
            { day: 'wednesday', startTime: '09:00', endTime: '18:00' },
            { day: 'friday', startTime: '09:00', endTime: '18:00' },
            { day: 'saturday', startTime: '09:00', endTime: '15:00' }
          ],
          status: 'active',
          rating: 4.9,
          total_reviews: 89,
          created_at: '2024-01-08 10:30:00'
        },
        {
          id: 'provider_003',
          name: '张康复师',
          profession: 'therapist',
          license_number: 'T2024001',
          phone: '13800001003',
          email: 'zhang.therapist@example.com',
          service_center_lat: 39.9142,
          service_center_lng: 116.3660,
          service_radius: 6000,
          max_users: 12,
          current_users: 8,
          specialties: ['physical_therapy', 'rehabilitation', 'mobility_assistance'],
          work_schedule: [
            { day: 'tuesday', startTime: '08:00', endTime: '16:00' },
            { day: 'thursday', startTime: '08:00', endTime: '16:00' },
            { day: 'saturday', startTime: '10:00', endTime: '16:00' },
            { day: 'sunday', startTime: '10:00', endTime: '14:00' }
          ],
          status: 'active',
          rating: 4.7,
          total_reviews: 56,
          created_at: '2024-01-12 14:00:00'
        }
      ]);
      
      setPagination(prev => ({
        ...prev,
        total: 3
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  // 专业翻译
  const professionMap = {
    'doctor': '医生',
    'nurse': '护士',
    'therapist': '康复师',
    'caregiver': '护理员'
  };

  // 专业特长翻译
  const specialtyMap = {
    'blood_pressure': '血压监测',
    'diabetes_care': '糖尿病护理',
    'wound_care': '伤口护理',
    'general_medicine': '全科医疗',
    'elderly_care': '老年护理',
    'chronic_disease': '慢性病管理',
    'physical_therapy': '物理治疗',
    'rehabilitation': '康复训练',
    'mobility_assistance': '行动辅助',
    'cardiac_care': '心脏护理'
  };

  // 工作日翻译
  const dayMap = {
    'monday': '周一',
    'tuesday': '周二',
    'wednesday': '周三',
    'thursday': '周四',
    'friday': '周五',
    'saturday': '周六',
    'sunday': '周日'
  };

  // 表格列定义
  const columns = [
    {
      title: '服务提供者信息',
      key: 'providerInfo',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.name}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {professionMap[record.profession]} | {record.license_number}
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.phone} | {record.email}
          </Text>
        </Space>
      ),
    },
    {
      title: '服务区域',
      key: 'serviceArea',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontSize: '12px' }}>
            <EnvironmentOutlined /> 半径: {safeToFixed(safeGetNumber(record.service_radius) / 1000, 1)}公里
          </Text>
          {record.service_center_lat && record.service_center_lng && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {safeToFixed(record.service_center_lat, 4)}, {safeToFixed(record.service_center_lng, 4)}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '用户负载',
      key: 'userLoad',
      render: (_, record) => {
        const loadRate = record.max_users > 0 ? (record.current_users / record.max_users) * 100 : 0;
        const status = loadRate >= 90 ? 'exception' : loadRate >= 70 ? 'active' : 'success';
        
        return (
          <Space direction="vertical" size={4}>
            <Text style={{ fontSize: '12px' }}>
              {record.current_users}/{record.max_users} 人
            </Text>
            <Progress 
              percent={Math.round(loadRate)} 
              size="small" 
              status={status}
              showInfo={false}
            />
          </Space>
        );
      },
    },
    {
      title: '专业特长',
      dataIndex: 'specialties',
      key: 'specialties',
      render: (specialties) => (
        <div>
          {specialties && specialties.slice(0, 2).map(specialty => (
            <Tag key={specialty} size="small" style={{ marginBottom: 2 }}>
              {specialtyMap[specialty] || specialty}
            </Tag>
          ))}
          {specialties && specialties.length > 2 && (
            <Tag size="small" color="default">+{specialties.length - 2}</Tag>
          )}
        </div>
      ),
    },
    {
      title: '评分',
      key: 'rating',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ color: '#fa8c16' }}>
            ⭐ {record.rating}
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.total_reviews} 评价
          </Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusConfig = {
          'active': { color: 'success', text: '在线' },
          'inactive': { color: 'default', text: '离线' },
          'suspended': { color: 'error', text: '暂停' }
        };
        const config = statusConfig[status] || statusConfig['active'];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
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
              onClick={() => handleViewProvider(record)}
            />
          </Tooltip>
          
          <Tooltip title="编辑信息">
            <Button 
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditProvider(record)}
            />
          </Tooltip>
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
    fetchProviders({ 
      page: paginationConfig.current, 
      pageSize: paginationConfig.pageSize 
    });
  };

  // 处理筛选
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchProviders({ page: 1 });
  };

  // 重置筛选
  const handleReset = () => {
    setFilters({
      keyword: '',
      status: '',
      profession: ''
    });
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchProviders({ 
      page: 1,
      keyword: '',
      status: '',
      profession: ''
    });
  };

  // 查看服务提供者详情
  const handleViewProvider = (provider) => {
    setCurrentProvider(provider);
    setDetailModalVisible(true);
  };

  // 编辑服务提供者
  const handleEditProvider = (provider) => {
    message.info('编辑功能开发中');
  };

  // 获取统计数据
  const getStatistics = () => {
    const totalProviders = providers.length;
    const activeProviders = providers.filter(p => p.status === 'active').length;
    const totalCurrentUsers = providers.reduce((sum, p) => sum + p.current_users, 0);
    const totalMaxUsers = providers.reduce((sum, p) => sum + p.max_users, 0);
    const avgLoadRate = totalMaxUsers > 0 ? (totalCurrentUsers / totalMaxUsers) * 100 : 0;

    return {
      totalProviders,
      activeProviders,
      totalCurrentUsers,
      avgLoadRate: Math.round(avgLoadRate)
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
              title="服务提供者总数"
              value={stats.totalProviders}
              prefix={<MedicineBoxOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="在线服务者"
              value={stats.activeProviders}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="服务用户总数"
              value={stats.totalCurrentUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均负载率"
              value={stats.avgLoadRate}
              suffix="%"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
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
                placeholder="搜索服务提供者姓名、手机号或邮箱"
                prefix={<SearchOutlined />}
                value={filters.keyword}
                onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                onPressEnter={handleSearch}
                style={{ width: 300 }}
              />
              
              <Select
                placeholder="职业类型"
                value={filters.profession}
                onChange={(value) => setFilters(prev => ({ ...prev, profession: value }))}
                style={{ width: 120 }}
                allowClear
              >
                <Option value="doctor">医生</Option>
                <Option value="nurse">护士</Option>
                <Option value="therapist">康复师</Option>
                <Option value="caregiver">护理员</Option>
              </Select>

              <Select
                placeholder="状态"
                value={filters.status}
                onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                style={{ width: 100 }}
                allowClear
              >
                <Option value="active">在线</Option>
                <Option value="inactive">离线</Option>
                <Option value="suspended">暂停</Option>
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
                icon={<ReloadOutlined />}
                onClick={() => fetchProviders()}
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

        {/* 服务提供者列表表格 */}
        <Table
          columns={columns}
          dataSource={providers}
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

      {/* 服务提供者详情弹窗 */}
      <Modal
        title={`服务提供者详情 - ${currentProvider?.name}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {currentProvider && (
          <div>
            <Descriptions title="基本信息" bordered size="small">
              <Descriptions.Item label="姓名">{currentProvider.name}</Descriptions.Item>
              <Descriptions.Item label="职业">{professionMap[currentProvider.profession]}</Descriptions.Item>
              <Descriptions.Item label="执业证号">{currentProvider.license_number}</Descriptions.Item>
              <Descriptions.Item label="手机号">{currentProvider.phone}</Descriptions.Item>
              <Descriptions.Item label="邮箱">{currentProvider.email}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={currentProvider.status === 'active' ? 'success' : 'default'}>
                  {currentProvider.status === 'active' ? '在线' : '离线'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="服务评分">
                ⭐ {currentProvider.rating} ({currentProvider.total_reviews} 评价)
              </Descriptions.Item>
              <Descriptions.Item label="注册时间">{currentProvider.created_at}</Descriptions.Item>
            </Descriptions>

            <Descriptions title="服务配置" bordered size="small" style={{ marginTop: 16 }}>
              <Descriptions.Item label="服务半径">
                {safeToFixed(safeGetNumber(currentProvider.service_radius) / 1000, 1)} 公里
              </Descriptions.Item>
              <Descriptions.Item label="最大用户数">{safeGetNumber(currentProvider.max_users)} 人</Descriptions.Item>
              <Descriptions.Item label="当前用户数">
                {safeGetNumber(currentProvider.current_users)} 人 
                <Progress 
                  percent={Math.round((safeGetNumber(currentProvider.current_users) / safeGetNumber(currentProvider.max_users, 1)) * 100)} 
                  size="small" 
                  style={{ marginLeft: 8, width: 100 }}
                />
              </Descriptions.Item>
              <Descriptions.Item label="服务中心" span={2}>
                {currentProvider.service_center_lat && currentProvider.service_center_lng ? 
                  `${safeToFixed(currentProvider.service_center_lat, 6)}, ${safeToFixed(currentProvider.service_center_lng, 6)}` : 
                  '未设置'
                }
              </Descriptions.Item>
            </Descriptions>

            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={12}>
                <Title level={5}>专业特长</Title>
                <div>
                  {currentProvider.specialties?.map(specialty => (
                    <Tag key={specialty} style={{ marginBottom: 4 }}>
                      {specialtyMap[specialty] || specialty}
                    </Tag>
                  ))}
                </div>
              </Col>

              <Col span={12}>
                <Title level={5}>工作时间安排</Title>
                <List
                  size="small"
                  dataSource={currentProvider.work_schedule || []}
                  renderItem={item => (
                    <List.Item>
                      <Text>{dayMap[item.day]}: {item.startTime} - {item.endTime}</Text>
                    </List.Item>
                  )}
                />
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ServiceProviders;