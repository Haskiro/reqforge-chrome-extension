import './index.css';
import './chrome-mock';

import { ConfigProvider } from 'antd';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';

import { App } from './app';
import { store } from './store';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <ConfigProvider theme={{ token: { colorBgLayout: '#fff' } }}>
        <App />
      </ConfigProvider>
    </Provider>
  </React.StrictMode>,
);
