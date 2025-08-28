import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Tag,
  Typography,
  Button,
  Space,
  Statistic,
  Progress,
  message,
  Tabs
} from 'antd';
import {
  CrownOutlined,
  StarOutlined,
  UserOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { adminAPI } from '../utils/api';

const { Title } = Typography;
const { TabPane } = Tabs;

const SubscriptionManagement = () => {
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [plansStats, setPlansStats] = useState(null);
  const [subsStats, setSubsStats] = useState(null);

  // 获取套餐列表
  const fetchPlans = async () => {
    try {
      const response = await adminAPI.getSubscriptionPlans();
      if (response.data.success) {
        setPlans(response.data.data.plans);
        setPlansStats(response.data.data.statistics);
      }
    } catch (error) {
      console.error('获取套餐列表失败:', error);
      message.error('获取套餐列表失败');
    }
  };

  // 获取用户订阅列表
  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getSubscriptionUsers();
      if (response.data.success) {
        setSubscriptions(response.data.data.subscriptions);
        setSubsStats(response.data.data.statistics);
      }
    } catch (error) {
      console.error('获取订阅列表失败:', error);
      message.error('获取订阅列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchSubscriptions();
  }, []);

  // 套餐表格列配置
  const planColumns = [
    {
      title: '套餐信息',
      key: 'planInfo',
      render: (_, record) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '16px' }}>{record.icon}</span>
            <span style={{ fontWeight: 'bold' }}>{record.name}</span>
            {record.isPopular && <Tag color="red">热门</Tag>}
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
            {record.description}
          </div>
        </div>
      ),
    },
    {
      title: '价格',
      key: 'price',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
            ¥{record.price}
          </div>
          {record.originalPrice > record.price && (
            <div style={{ fontSize: '12px', color: '#666', textDecoration: 'line-through' }}>
              原价: ¥{record.originalPrice}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '配额',
      key: 'quota',
      render: (_, record) => (
        <div>
          <div>{record.serviceQuota === -1 ? '无限' : `${record.serviceQuota}次`}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.durationDays}天有效期
          </div>
        </div>
      ),
    },
    {
      title: '订阅统计',
      key: 'stats',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.subscriptionCount}人</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            收入: ¥{record.revenue}
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => (
        <Tag color={record.isActive ? 'success' : 'default'}>
          {record.isActive ? '启用' : '禁用'}
        </Tag>
      ),
    }
  ];

  // 订阅表格列配置
  const subscriptionColumns = [
    {
      title: '用户',
      key: 'user',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.user.nickname}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.user.phone}
          </div>
        </div>
      ),
    },
    {
      title: '套餐',
      key: 'plan',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.plan.name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            ¥{record.plan.price}
          </div>
        </div>
      ),
    },
    {
      title: '配额使用',
      key: 'quota',
      render: (_, record) => {
        const percentage = record.remainingQuota === -1 ? 0 : 
          (record.usedQuota / (record.usedQuota + record.remainingQuota)) * 100;
        
        return (
          <div>
            <Progress 
              percent={percentage} 
              size="small" 
              format={() => `${record.usedQuota}/${record.usedQuota + record.remainingQuota}`}
            />
            <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
              剩余: {record.remainingQuota === -1 ? '无限' : `${record.remainingQuota}次`}
            </div>
          </div>
        );
      },
    },
    {
      title: '到期时间',
      key: 'expiry',
      render: (_, record) => (
        <div>
          <div>{record.endDate}</div>
          <div style={{ 
            fontSize: '12px', 
            color: record.daysRemaining <= 7 ? '#f50' : '#666' 
          }}>
            {record.daysRemaining}天后到期
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'statusName',
      key: 'status',
      render: (text, record) => (
        <Tag color={
          record.status === 'active' ? 'success' :
          record.status === 'expired' ? 'error' : 'warning'
        }>
          {text}
        </Tag>
      ),
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>套餐管理</Title>
      
      <Tabs defaultActiveKey="plans">
        <TabPane tab="套餐列表" key="plans">
          {/* 套餐统计 */}
          {plansStats && (
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总套餐数"
                    value={plansStats.totalPlans}
                    prefix={<CrownOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="活跃套餐"
                    value={plansStats.activePlans}
                    prefix={<StarOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总订阅数"
                    value={plansStats.totalSubscriptions}
                    prefix={<UserOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总收入"
                    value={plansStats.totalRevenue}
                    precision={2}
                    prefix={<DollarOutlined />}
                    suffix="元"
                  />
                </Card>
              </Col>
            </Row>
          )}

          {/* 套餐表格 */}
          <Card title="套餐列表" extra={
            <Button type="primary">添加套餐</Button>
          }>
            <Table
              columns={planColumns}
              dataSource={plans}
              rowKey="id"
              pagination={false}
            />
          </Card>
        </TabPane>

        <TabPane tab="用户订阅" key="subscriptions">
          {/* 订阅统计 */}
          {subsStats && (
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="活跃订阅"
                    value={subsStats.activeCount}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="即将到期"
                    value={subsStats.expiringCount}
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="已过期"
                    value={subsStats.expiredCount}
                    valueStyle={{ color: '#666' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总收入"
                    value={subsStats.totalRevenue}
                    precision={2}
                    prefix="¥"
                  />
                </Card>
              </Col>
            </Row>
          )}

          {/* 订阅表格 */}
          <Card title="用户订阅列表">
            <Table
              columns={subscriptionColumns}
              dataSource={subscriptions}
              rowKey="id"
              loading={loading}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`
              }}
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default SubscriptionManagement;