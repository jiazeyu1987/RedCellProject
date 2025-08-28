import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Typography,
  DatePicker,
  Select,
  Input,
  Button,
  Space,
  message
} from 'antd';
import {
  DollarOutlined,
  CreditCardOutlined,
  LineChartOutlined,
  SearchOutlined,
  ExportOutlined
} from '@ant-design/icons';
import { adminAPI } from '../utils/api';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const PaymentManagement = () => {
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });

  // 获取付费概览
  const fetchOverview = async () => {
    try {
      const response = await adminAPI.getPaymentOverview();
      if (response.data.success) {
        setOverview(response.data.data);
      }
    } catch (error) {
      console.error('获取付费概览失败:', error);
      message.error('获取付费概览失败');
    }
  };

  // 获取支付记录
  const fetchRecords = async (params = {}) => {
    try {
      setLoading(true);
      const response = await adminAPI.getPaymentRecords({
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...params
      });
      
      if (response.data.success) {
        setRecords(response.data.data.records);
        setPagination(prev => ({
          ...prev,
          total: response.data.data.pagination.total
        }));
      }
    } catch (error) {
      console.error('获取支付记录失败:', error);
      message.error('获取支付记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchRecords();
  }, []);

  // 支付记录表格列配置
  const columns = [
    {
      title: '订单信息',
      key: 'orderInfo',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.orderNo}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.description}
          </div>
        </div>
      ),
    },
    {
      title: '用户',
      key: 'user',
      render: (_, record) => (
        <div>
          <div>{record.user.nickname}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.user.phone}
          </div>
        </div>
      ),
    },
    {
      title: '金额',
      key: 'amount',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>¥{record.amount}</div>
          {record.discountAmount > 0 && (
            <div style={{ fontSize: '12px', color: '#f50' }}>
              优惠: ¥{record.discountAmount}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '支付方式',
      dataIndex: 'paymentMethodName',
      key: 'paymentMethod',
      render: (text, record) => (
        <Tag color={
          record.paymentMethod === 'wechat' ? 'green' :
          record.paymentMethod === 'alipay' ? 'blue' : 'orange'
        }>
          {text}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'statusName',
      key: 'status',
      render: (text, record) => (
        <Tag color={
          record.status === 'success' ? 'success' :
          record.status === 'pending' ? 'warning' : 'error'
        }>
          {text}
        </Tag>
      ),
    },
    {
      title: '支付时间',
      dataIndex: 'payTime',
      key: 'payTime',
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>付费信息管理</Title>
      
      {/* 概览统计 */}
      {overview && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总收入"
                value={overview.totalRevenue}
                precision={2}
                prefix={<DollarOutlined />}
                suffix="元"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="今日收入"
                value={overview.todayRevenue}
                precision={2}
                prefix={<DollarOutlined />}
                suffix="元"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="总交易数"
                value={overview.totalTransactions}
                prefix={<CreditCardOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="成功率"
                value={overview.successRate}
                precision={1}
                suffix="%"
                prefix={<LineChartOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 支付方式统计 */}
      {overview?.paymentMethodStats && (
        <Card title="支付方式分布" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            {overview.paymentMethodStats.map(stat => (
              <Col span={8} key={stat.method}>
                <Card size="small">
                  <Statistic
                    title={stat.name}
                    value={stat.percentage}
                    suffix="%"
                    valueStyle={{ fontSize: '20px' }}
                  />
                  <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                    {stat.count}笔 / ¥{stat.amount}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* 支付记录表格 */}
      <Card title="支付记录" extra={
        <Space>
          <Button icon={<ExportOutlined />}>导出</Button>
          <Button icon={<SearchOutlined />}>高级搜索</Button>
        </Space>
      }>
        <Table
          columns={columns}
          dataSource={records}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize
              }));
              fetchRecords({ page, pageSize });
            }
          }}
        />
      </Card>
    </div>
  );
};

export default PaymentManagement;