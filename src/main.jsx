import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

import { Provider } from '@/components/setup/provider';

ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider>
    <App />
  </Provider>
);
