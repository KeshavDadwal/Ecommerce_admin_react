import type { AuthProvider } from '@refinedev/core';

const GQL_URL = '/graphql';

const SIGNIN_MUTATION = `
    mutation AdminLogin($email: String!, $password: String!) {
        adminLogin(input: { email: $email, password: $password }) {
            accessToken
            refreshToken
            expiresIn
            user {
                id
                email
            }
        }
    }
`;

const gqlFetch = (query: string, variables?: Record<string, unknown>) =>
    fetch(GQL_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ query, variables }),
    }).then(r => r.json());

export const authProvider: AuthProvider = {
    login: async ({ email, password }) => {
        const data = await gqlFetch(SIGNIN_MUTATION, { email, password });

        if (data.errors?.length) {
            return { success: false, error: { message: data.errors[0].message, name: 'Login Error' } };
        }

        const result = data?.data?.adminLogin;
        if (!result?.accessToken) {
            return { success: false, error: { message: 'No access token returned', name: 'Login Error' } };
        }

        localStorage.setItem('auth', JSON.stringify(result));
        localStorage.setItem('access_token', result.accessToken);

        return { success: true, redirectTo: '/' };
    },

    logout: async () => {
        localStorage.removeItem('auth');
        localStorage.removeItem('access_token');
        return { success: true, redirectTo: '/login' };
    },

    check: async () => {
        const token = localStorage.getItem('access_token');
        if (token) return { authenticated: true };
        return { authenticated: false, redirectTo: '/login' };
    },

    onError: async (error) => {
        if (error?.status === 401 || error?.status === 403) {
            localStorage.removeItem('auth');
            localStorage.removeItem('access_token');
            return { logout: true, redirectTo: '/login' };
        }
        return { error };
    },

    getPermissions: async () => {
        const auth = localStorage.getItem('auth');
        if (!auth) return null;
        const parsed = JSON.parse(auth);
        return parsed?.user?.role ?? null;
    },

    getIdentity: async () => {
        const auth = localStorage.getItem('auth');
        if (!auth) return null;
        const parsed = JSON.parse(auth);
        const user = parsed?.user;
        return { id: user?.id ?? 'user', name: user?.email ?? 'Admin', email: user?.email };
    },
};