import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

import { ApiProvider, getStoredToken, storeToken } from '@/api';
import { Provider } from '@/components/setup/provider';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const initialToken = getStoredToken();
const handleUnauthorized = () => {
  storeToken(null);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <ApiProvider baseUrl={apiBaseUrl} initialToken={initialToken} onUnauthorized={handleUnauthorized}>
    <Provider>
      <App />
    </Provider>
  </ApiProvider>,
);
