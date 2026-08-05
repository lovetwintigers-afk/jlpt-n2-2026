import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './App';

import './styles/tokens.css';
import './styles/base.css';
import './styles/japanese.css';
import './styles/components.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('找不到 #root 元素');
}

createRoot(container).render(
  <StrictMode>
    {/* HashRouter：網址形如 #/week/3，部署到 GitHub Pages 不需任何伺服器設定 */}
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
