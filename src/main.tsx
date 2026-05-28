import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ApolloProvider } from '@apollo/client/react';
import './index.css';
import App from './App';
import { apolloClient } from './graphql/client';

const container = document.getElementById('root');
if (!container) throw new Error('No container found');

createRoot(container).render(
    <StrictMode>
        <ApolloProvider client={apolloClient}>
            <App />
        </ApolloProvider>
    </StrictMode>
);