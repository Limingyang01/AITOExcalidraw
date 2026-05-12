'use client';

import { ConfigProvider, App, ThemeConfig } from 'antd';

const theme: ThemeConfig = {
  token: {
    colorPrimary: '#1f1f1f',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBorder: '#d9d9d9',
    colorText: '#1f1f1f',
    colorTextSecondary: '#666666',
    borderRadius: 6,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Button: {
      primaryShadow: 'none',
      defaultShadow: 'none',
    },
    Card: {
      borderRadiusLG: 12,
    },
  },
};

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider theme={theme}>
      <App>{children}</App>
    </ConfigProvider>
  );
}