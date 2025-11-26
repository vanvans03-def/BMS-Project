// frontend/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App as AntdApp } from 'antd'
import { AuthProvider } from './contexts/AuthContext'
import MainApp from './App.tsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider 
        theme={{ 
          token: { 
            colorPrimary: '#1890ff',
            fontFamily: "'Kanit', sans-serif",
            fontSize: 14
          } 
        }}
      >
        <AntdApp>
          <AuthProvider>
            <MainApp />
          </AuthProvider>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)