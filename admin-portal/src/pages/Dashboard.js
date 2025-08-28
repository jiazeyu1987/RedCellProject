import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Typography,
  Space,
  Progress,
  Tag,
  Spin,
  Alert
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  MedicineBoxOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import { adminAPI } from '../utils/api';

const { Title, Text } = Typography;

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState(null);
  const [geoData, setGeoData] = useState(null);
  const [error, setError] = useState(null);

  // 获取统计数据
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, geoResponse] = await Promise.all([
        adminAPI.getDashboardStats(),
        adminAPI.getGeoData()
      ]);

      if (statsResponse.data.success) {
        setStatsData(statsResponse.data.data);
      }

      if (geoResponse.data.success) {
        setGeoData(geoResponse.data.data);
      }

      setError(null);
    } catch (err) {
      console.error('获取仪表板数据失败:', err);
      setError('获取数据失败，请稍后重试');
      
      // 使用模拟数据作为后备
      setStatsData({
        users: {
          totalUsers: 156,
          activeUsers: 142,
          assignedUsers: 89,
          unassignedUsers: 67
        },
        providers: {
          totalProviders: 8,
          activeProviders: 6,
          totalAssignedUsers: 89,
          avgLoadRate: 65.5
        },
        assignments: {
          totalAssignments: 95,
          activeAssignments: 89,
          autoAssignments: 62,
          manualAssignments: 33
        }
      });
      
      setGeoData({
        users: [],
        providers: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // 统计卡片数据
  const getStatCards = () => {
    if (!statsData) return [];

    return [
      {
        title: '总用户数',
        value: statsData.users?.totalUsers || 0,
        icon: <UserOutlined style={{ color: '#1890ff' }} />,
        color: '#1890ff',
        suffix: '人'
      },
      {
        title: '活跃用户',
        value: statsData.users?.activeUsers || 0,
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
        color: '#52c41a',
        suffix: '人'
      },
      {
        title: '已分配用户',
        value: statsData.users?.assignedUsers || 0,
        icon: <TeamOutlined style={{ color: '#722ed1' }} />,
        color: '#722ed1',
        suffix: '人'
      },
      {
        title: '待分配用户',
        value: statsData.users?.unassignedUsers || 0,
        icon: <ClockCircleOutlined style={{ color: '#fa8c16' }} />,
        color: '#fa8c16',
        suffix: '人'
      },
      {
        title: '服务提供者',
        value: statsData.providers?.activeProviders || 0,
        icon: <MedicineBoxOutlined style={{ color: '#13c2c2' }} />,
        color: '#13c2c2',
        suffix: '人'
      },
      {
        title: '平均负载率',
        value: Math.round(statsData.providers?.avgLoadRate || 0),
        icon: <TrophyOutlined style={{ color: '#eb2f96' }} />,
        color: '#eb2f96',
        suffix: '%'
      }
    ];
  };

  // 最近分配记录的模拟数据
  const getRecentAssignments = () => {
    return [
      {
        key: '1',
        userName: '张大爷',
        providerName: '李护士',
        assignmentTime: '2024-01-20 14:30',
        distance: '1.2公里',
        type: 'automatic',
        status: 'active'
      },
      {
        key: '2',
        userName: '王奶奶',
        providerName: '王医生',
        assignmentTime: '2024-01-20 13:15',
        distance: '2.8公里',
        type: 'manual',
        status: 'active'
      },
      {
        key: '3',
        userName: '李大妈',
        providerName: '张康复师',
        assignmentTime: '2024-01-20 11:45',
        distance: '0.9公里',
        type: 'automatic',
        status: 'active'
      }
    ];
  };

  const assignmentColumns = [
    {
      title: '用户',
      dataIndex: 'userName',
      key: 'userName',
    },
    {
      title: '服务提供者',
      dataIndex: 'providerName',
      key: 'providerName',
    },
    {
      title: '分配时间',
      dataIndex: 'assignmentTime',
      key: 'assignmentTime',
    },
    {
      title: '距离',
      dataIndex: 'distance',
      key: 'distance',
    },
    {
      title: '分配方式',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'automatic' ? 'blue' : 'green'}>
          {type === 'automatic' ? '智能分配' : '手动分配'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status === 'active' ? '进行中' : '已完成'}
        </Tag>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px' 
      }}>
        <Spin size="large" tip="正在加载仪表板数据..." />
      </div>
    );
  }

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>
        系统概览
      </Title>

      {error && (
        <Alert
          message="数据加载异常"
          description={error}
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {getStatCards().map((card, index) => (
          <Col xs={24} sm={12} lg={8} xl={4} key={index}>
            <Card>
              <Statistic
                title={card.title}
                value={card.value}
                prefix={card.icon}
                suffix={card.suffix}
                valueStyle={{ color: card.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        {/* 分配效率统计 */}
        <Col xs={24} lg={12}>
          <Card 
            title="分配效率统计" 
            style={{ height: 400 }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>用户分配率</Text>
                  <Text strong>
                    {statsData?.users ? 
                      Math.round((statsData.users.assignedUsers / statsData.users.totalUsers) * 100) : 0
                    }%
                  </Text>
                </div>
                <Progress 
                  percent={statsData?.users ? 
                    Math.round((statsData.users.assignedUsers / statsData.users.totalUsers) * 100) : 0
                  }
                  strokeColor="#52c41a"
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>服务提供者平均负载</Text>
                  <Text strong>{Math.round(statsData?.providers?.avgLoadRate || 0)}%</Text>
                </div>
                <Progress 
                  percent={Math.round(statsData?.providers?.avgLoadRate || 0)}
                  strokeColor="#1890ff"
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>智能分配占比</Text>
                  <Text strong>
                    {statsData?.assignments ? 
                      Math.round((statsData.assignments.autoAssignments / statsData.assignments.totalAssignments) * 100) : 0
                    }%
                  </Text>
                </div>
                <Progress 
                  percent={statsData?.assignments ? 
                    Math.round((statsData.assignments.autoAssignments / statsData.assignments.totalAssignments) * 100) : 0
                  }
                  strokeColor="#722ed1"
                />
              </div>
            </Space>
          </Card>
        </Col>

        {/* 地理分布概览 */}
        <Col xs={24} lg={12}>
          <Card 
            title="地理分布概览" 
            style={{ height: 400 }}
          >
            <div className="map-container">
              <div style={{ 
                height: '300px', 
                background: '#f5f5f5', 
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                color: '#999'
              }}>
                <MedicineBoxOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                <Text type="secondary">地图组件</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  显示用户和服务提供者的地理分布
                </Text>
                {geoData && (
                  <div style={{ marginTop: 16, textAlign: 'center' }}>
                    <Text type="secondary">
                      用户: {geoData.users?.length || 0} 个位置
                    </Text>
                    <br />
                    <Text type="secondary">
                      服务提供者: {geoData.providers?.length || 0} 个位置
                    </Text>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 最近分配记录 */}
      <Card 
        title="最近分配记录" 
        style={{ marginTop: 16 }}
        extra={
          <Space>
            <Text type="secondary">最近7天</Text>
          </Space>
        }
      >
        <Table
          columns={assignmentColumns}
          dataSource={getRecentAssignments()}
          pagination={false}
          size="middle"
        />
      </Card>
    </div>
  );
};

export default Dashboard;