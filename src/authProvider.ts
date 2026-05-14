import { AuthProvider } from 'react-admin';

const GQL_URL = '/graphql';

const gqlFetch = (query: string, variables?: Record<string, unknown>, token?: string) =>
    fetch(GQL_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query, variables }),
    }).then(r => r.json());

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

const authProvider: AuthProvider = {
    login: async ({ username, password }) => {
        const data = await gqlFetch(SIGNIN_MUTATION, {
            email: username,
            password,
        });

        if (data.errors?.length) {
            throw new Error(data.errors[0].message ?? 'Login failed');
        }

        const result = data?.data?.adminLogin;
        if (!result?.accessToken) {
            throw new Error('Login failed: no access token returned');
        }

        localStorage.setItem('username', username);
        localStorage.setItem('auth', JSON.stringify(result));
        localStorage.setItem('access_token', result.accessToken);
    },

    logout: () => {
        localStorage.removeItem('username');
        localStorage.removeItem('auth');
        localStorage.removeItem('access_token');
        return Promise.resolve();
    },

    checkError: error => {
        const status = error?.status;
        if (status === 401 || status === 403) {
            localStorage.removeItem('username');
            localStorage.removeItem('auth');
            localStorage.removeItem('access_token');
            return Promise.reject();
        }
        return Promise.resolve();
    },

    checkAuth: () =>
        localStorage.getItem('access_token')
            ? Promise.resolve()
            : Promise.reject(),

    getPermissions: () => {
        const auth = localStorage.getItem('auth');
        if (!auth) return Promise.resolve(null);
        const parsed = JSON.parse(auth);
        return Promise.resolve(parsed?.user?.role ?? null);
    },

    getIdentity: () => {
        const auth = localStorage.getItem('auth');
        if (!auth) return Promise.reject();
        const parsed = JSON.parse(auth);
        const user = parsed?.user;
        return Promise.resolve({
            id: user?.id ?? 'user',
            fullName: user?.email ?? 'Admin',
        });
    },
};

export default authProvider;