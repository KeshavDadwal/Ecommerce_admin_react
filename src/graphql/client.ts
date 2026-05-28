import { ApolloClient, InMemoryCache, createHttpLink, from, ApolloLink } from '@apollo/client';

const httpLink = createHttpLink({
    uri: `${import.meta.env.VITE_API_URL}/graphql`,
});

const authLink = new ApolloLink((operation, forward) => {
    const token = localStorage.getItem('access_token');
    operation.setContext(({ headers = {} }: { headers: Record<string, string> }) => ({
        headers: {
            ...headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    }));
    return forward(operation);
});

export const apolloClient = new ApolloClient({
    link: from([authLink, httpLink]),
    cache: new InMemoryCache(),
    defaultOptions: {
        watchQuery: { fetchPolicy: 'network-only' },
        query: { fetchPolicy: 'network-only' },
    },
});