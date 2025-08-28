import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Typography,
  Statistic,
  Tag,
  Button,
  Space,
  message,
  Tabs
} from 'antd';
import {
  EnvironmentOutlined,
  TeamOutlined,
  HomeOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { adminAPI } from '../utils/api';

const { Title } = Typography;
const { TabPane } = Tabs;

const AddressAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [distribution, setDistribution] = useState(null);
  const [addresses, setAddresses] = useState([]);

  // 获取地址分布数据
  const fetchDistribution = async () => {
    try {
      const response = await adminAPI.getAddressDistribution();
      if (response.data.success) {
        setDistribution(response.data.data);
      }
    } catch (error) {
      console.error('获取地址分布失败:', error);
      message.error('获取地址分布失败');
    }
  };

  // 获取地址详细信息
  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAddressDetails();
      if (response.data.success) {
        setAddresses(response.data.data.addresses);
      }
    } catch (error) {
      console.error('获取地址详情失败:', error);
      message.error('获取地址详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistribution();
    fetchAddresses();
  }, []);

  // 城市分布表格列配置
  const cityColumns = [
    {
      title: '城市',
      key: 'city',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.city}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.province}
          </div>
        </div>
      ),
    },
    {
      title: '用户数',
      dataIndex: 'userCount',
      key: 'userCount',
      render: (count) => (
        <Tag color="blue">{count}人</Tag>
      ),
    },
    {
      title: '服务次数',
      dataIndex: 'serviceCount',
      key: 'serviceCount',
      render: (count) => (
        <Tag color="green">{count}次</Tag>
      ),
    },
    {
      title: '占比',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (percentage) => (
        <div style={{ fontWeight: 'bold' }}>{percentage}%</div>
      ),
    },
    {
      title: '平均服务频次',
      dataIndex: 'avgServicesPerAddress',
      key: 'avgServicesPerAddress',
      render: (avg) => (
        <div>{avg}次/地址</div>
      ),
    }
  ];

  // 地址详情表格列配置
  const addressColumns = [
    {
      title: '地址信息',
      key: 'addressInfo',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
            {record.address}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            联系人: {record.contactName} | {record.contactPhone}
          </div>
        </div>
      ),
    },
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
      title: '服务次数',
      dataIndex: 'visitCount',
      key: 'visitCount',
      render: (count) => (
        <Tag color={count >= 10 ? 'red' : count >= 5 ? 'orange' : 'blue'}>
          {count}次
        </Tag>
      ),
    },
    {
      title: '最后服务',
      dataIndex: 'lastVisit',
      key: 'lastVisit',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button size="small" type="link">查看详情</Button>
          <Button size="small" type="link">服务记录</Button>
        </Space>
      ),
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>地址分布分析</Title>
      
      <Tabs defaultActiveKey="overview">
        <TabPane tab="分布概览" key="overview">
          {/* 概览统计 */}
          {distribution?.overview && (
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总地址数"
                    value={distribution.overview.totalAddresses}
                    prefix={<HomeOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总用户数"
                    value={distribution.overview.totalUsers}
                    prefix={<TeamOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="覆盖城市"
                    value={distribution.overview.coverageCities}
                    prefix={<EnvironmentOutlined />}
                    suffix="个"
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总服务次数"
                    value={distribution.overview.totalServices}
                    prefix={<BarChartOutlined />}
                  />
                </Card>
              </Col>
            </Row>
          )}

          {/* 城市分布 */}
          <Card title="城市分布统计" style={{ marginBottom: 24 }}>
            {distribution?.cityDistribution && (
              <Table
                columns={cityColumns}
                dataSource={distribution.cityDistribution}
                rowKey="city"
                pagination={false}
                size="small"
              />
            )}
          </Card>

          {/* 热力图提示 */}
          <Card title="地理热力分布">
            <div style={{ 
              padding: '40px',
              textAlign: 'center',
              background: '#f5f5f5',
              borderRadius: '8px'
            }}>
              <EnvironmentOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
              <div style={{ marginTop: '16px', fontSize: '16px' }}>
                地理热力图
              </div>
              <div style={{ marginTop: '8px', color: '#666' }}>
                显示用户和服务的地理分布密度
              </div>
              <div style={{ marginTop: '16px' }}>
                <Button type="primary">查看完整地图</Button>
              </div>
            </div>
          </Card>
        </TabPane>

        <TabPane tab="地址详情" key="details">
          <Card title="地址详细信息" extra={
            <Space>
              <Button>导出数据</Button>
              <Button>筛选条件</Button>
            </Space>
          }>
            <Table
              columns={addressColumns}
              dataSource={addresses}
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

export default AddressAnalysis;