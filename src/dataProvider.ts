import { DataProvider } from 'react-admin';

const GQL_URL = '/graphql';

const PRODUCTS_CATEGORY_ID = 'd4a9078e-814a-4a8e-a716-1bb29aa40e6c';

const getHeaders = () => {
    const token = localStorage.getItem('access_token');
    return {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

const gqlFetch = async (query: string, variables?: Record<string, unknown>) => {
    const res = await fetch(GQL_URL, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ query, variables }),
    });

    const json = await res.json();

    if (json.errors?.length) {
        console.error('[dataProvider] GraphQL errors:', json.errors);
        throw new Error(json.errors[0].message ?? 'GraphQL error');
    }

    return json.data;
};

// ─── Queries ────────────────────────────────────────────────────────────────

const USERS_QUERY = `
    query GetUsers($first: Int, $after: String) {
        users(pagination: { first: $first, after: $after }) {
            edges {
                node {
                    id
                    email
                    firstName
                    lastName
                    username
                    phone
                    role
                    status
                    createdAt
                    updatedAt
                }
            }
            pageInfo {
                hasNextPage
                hasPreviousPage
                startCursor
                endCursor
            }
        }
    }
`;

const USER_QUERY = `
    query GetUser($id: ID!) {
        user(id: $id) {
            id
            email
            firstName
            lastName
            username
            phone
            role
            status
            createdAt
            updatedAt
        }
    }
`;

const PRODUCTS_QUERY = `
    query GetProducts($first: Int, $after: String) {
        products(categoryId: "${PRODUCTS_CATEGORY_ID}", pagination: { first: $first, after: $after }) {
            edges {
                node {
                    id
                    name
                    description
                    price
                    sku
                    stock
                    images
                    createdAt
                    updatedAt
                }
            }
            pageInfo {
                hasNextPage
                endCursor
            }
        }
    }
`;

const PRODUCT_QUERY = `
    query GetProduct($id: ID!) {
        product(id: $id) {
            id
            name
            description
            price
            sku
            stock
            images
            createdAt
            updatedAt
        }
    }
`;

const CATEGORIES_QUERY = `
    query GetCategories {
        categories(pagination: { first: 200 }) {
            edges {
                node {
                    id
                    name
                    slug
                    description
                    parentId
                    imageUrl
                }
            }
        }
    }
`;

// ─── Mutations ───────────────────────────────────────────────────────────────

const CREATE_USER_MUTATION = `
    mutation CreateUser($input: CreateUserInput!) {
        createUser(input: $input) {
            id
            email
            firstName
            lastName
            username
            phone
            role
            status
            createdAt
            updatedAt
        }
    }
`;

const UPDATE_USER_MUTATION = `
    mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
        updateUser(id: $id, input: $input) {
            id
            email
            firstName
            lastName
            username
            phone
            role
            status
            createdAt
            updatedAt
        }
    }
`;

const DELETE_USER_MUTATION = `
    mutation DeleteUser($id: ID!) {
        deleteUser(id: $id) {
            id
        }
    }
`;

const CREATE_CATEGORY_MUTATION = `
    mutation CreateCategory($input: CreateCategoryInput!) {
        createCategory(input: $input) {
            id
            name
            slug
            description
            parentId
        }
    }
`;

// ─── Cursor pagination helper ─────────────────────────────────────────────────

const cursorCache: Record<string, string[]> = {};
let categoriesCache: any[] = [];
let categoriesFetched = false;

const fetchCategories = async (): Promise<any[]> => {
    if (!categoriesFetched) {
        const res = await gqlFetch(CATEGORIES_QUERY);
        categoriesCache = (res.categories?.edges ?? []).map((edge: any) => edge.node);
        categoriesFetched = true;
    }
    return categoriesCache;
};

export const clearCategoriesCache = () => {
    categoriesFetched = false;
};

const getCursorForPage = (resource: string, page: number): string | undefined => {
    if (page <= 1) return undefined;
    return cursorCache[resource]?.[page - 2];
};

const storeCursor = (resource: string, page: number, endCursor: string) => {
    if (!cursorCache[resource]) cursorCache[resource] = [];
    cursorCache[resource][page - 1] = endCursor;
};

// ─── Normalisers ──────────────────────────────────────────────────────────────

const normaliseUser = (u: any) => ({
    ...u,
    first_name: u.firstName ?? u.first_name,
    last_name: u.lastName ?? u.last_name,
    created_at: u.createdAt ?? u.created_at,
    updated_at: u.updatedAt ?? u.updated_at,
    is_email_verified: u.isEmailVerified ?? u.is_email_verified ?? false,
    is_active: u.isActive ?? u.is_active ?? (u.status === 'active'),
});

const normaliseProduct = (p: any) => ({
    ...p,
    created_at: p.createdAt ?? p.created_at,
    updated_at: p.updatedAt ?? p.updated_at,
});

// ─── Client-side sort helper ──────────────────────────────────────────────────

const sortData = (data: any[], field: string, order: string): any[] => {
    if (!field) return data;
    return [...data].sort((a, b) => {
        const aVal = a[field] ?? '';
        const bVal = b[field] ?? '';
        const cmp = String(aVal).localeCompare(String(bVal), undefined, { sensitivity: 'base' });
        return order === 'DESC' ? -cmp : cmp;
    });
};

// ─── Resource config ──────────────────────────────────────────────────────────

type ResourceConfig = {
    getList: (vars: { first: number; after?: string; page?: number; filter?: any }) => Promise<{ data: any[]; total: number; endCursor?: string }>;
    getOne: (id: string | number) => Promise<{ data: any }>;
    create?: (data: any) => Promise<{ data: any }>;
    update?: (id: string | number, data: any) => Promise<{ data: any }>;
    delete?: (id: string | number) => Promise<{ data: any }>;
};

const resourceMap: Record<string, ResourceConfig> = {
    users: {
        getList: async ({ first, after, page }) => {
            const res = await gqlFetch(USERS_QUERY, { first, after });
            const edges = res.users.edges ?? [];
            const pageInfo = res.users.pageInfo ?? {};
            const data = edges.map((e: any) => normaliseUser(e.node));
            const currentOffset = ((page ?? 1) - 1) * first;
            const total = pageInfo.hasNextPage
                ? currentOffset + data.length + first
                : currentOffset + data.length;
            return { data, total, endCursor: pageInfo.endCursor };
        },
        getOne: async (id) => {
            const res = await gqlFetch(USER_QUERY, { id: String(id) });
            return { data: normaliseUser(res.user) };
        },
        create: async (input) => {
            const res = await gqlFetch(CREATE_USER_MUTATION, { input });
            return { data: normaliseUser(res.createUser) };
        },
        update: async (id, input) => {
            const res = await gqlFetch(UPDATE_USER_MUTATION, { id: String(id), input });
            return { data: normaliseUser(res.updateUser) };
        },
        delete: async (id) => {
            const res = await gqlFetch(DELETE_USER_MUTATION, { id: String(id) });
            return { data: res.deleteUser };
        },
    },

    products: {
        getList: async ({ first, after, page, filter }) => {
            const res = await gqlFetch(PRODUCTS_QUERY, { first, after });
            const edges = res.products.edges ?? [];
            const pageInfo = res.products.pageInfo ?? {};
            let data: any[] = edges.map((e: any) => normaliseProduct(e.node));

            const q = String(filter?.q ?? '').trim().toLowerCase();
            if (q) {
                data = data.filter((product: any) =>
                    String(product.name ?? '').toLowerCase().includes(q) ||
                    String(product.sku ?? '').toLowerCase().includes(q) ||
                    String(product.description ?? '').toLowerCase().includes(q)
                );
            }

            const currentOffset = ((page ?? 1) - 1) * first;
            const total = pageInfo.hasNextPage
                ? currentOffset + data.length + first
                : currentOffset + data.length;
            return { data, total, endCursor: pageInfo.endCursor };
        },
        getOne: async (id) => {
            const res = await gqlFetch(PRODUCT_QUERY, { id: String(id) });
            return { data: normaliseProduct(res.product) };
        },
    },

    categories: {
        getList: async () => {
            const data = await fetchCategories();
            return { data, total: data.length };
        },
        // Server doesn't implement GetCategory — resolve from cache instead
        getOne: async (id) => {
            const list = await fetchCategories();
            const found = list.find((c: any) => String(c.id) === String(id));
            if (!found) throw new Error(`Category ${id} not found`);
            return { data: found };
        },
        create: async (data) => {
            const input = {
                name: data.name,
                slug: data.slug,
                parentId: data.parentId || PRODUCTS_CATEGORY_ID,
                SortOrder: data.sortOrder ?? 0,
                IsActive: data.isActive ?? true,
                ...(data.description ? { description: data.description } : {}),
            };
            const res = await gqlFetch(CREATE_CATEGORY_MUTATION, { input });
            categoriesFetched = false; // bust cache after mutation
            return { data: res.createCategory };
        },
    },
};

// ─── DataProvider ─────────────────────────────────────────────────────────────

const dataProvider: DataProvider = {
    getList: async (resource, params) => {
        const config = resourceMap[resource];
        if (!config) throw new Error(`Resource "${resource}" not configured in dataProvider`);
        const { page = 1, perPage = 25 } = params.pagination ?? {};
        const after = getCursorForPage(resource, page);
        let { data, total, endCursor } = await config.getList({ first: perPage, after, page, filter: params.filter });
        if (endCursor) storeCursor(resource, page, endCursor);

        // Apply client-side sorting (essential for fully-fetched resources like categories;
        // also sorts the current page for paginated resources)
        const { field, order } = params.sort ?? {};
        if (field) {
            data = sortData(data, field, order ?? 'ASC');
        }

        return { data, total };
    },

    getOne: async (resource, params) => {
        const config = resourceMap[resource];
        if (!config) throw new Error(`Resource "${resource}" not configured in dataProvider`);
        return config.getOne(params.id);
    },

    getMany: async (resource, params) => {
        const config = resourceMap[resource];
        if (!config) throw new Error(`Resource "${resource}" not configured in dataProvider`);
        const results = await Promise.all(params.ids.map(id => config.getOne(id)));
        return { data: results.map(r => r.data) };
    },

    getManyReference: async (resource, params) => {
        const config = resourceMap[resource];
        if (!config) throw new Error(`Resource "${resource}" not configured in dataProvider`);
        const { page = 1, perPage = 25 } = params.pagination ?? {};
        const after = getCursorForPage(resource, page);
        const { data, total, endCursor } = await config.getList({ first: perPage, after, page, filter: params.filter });
        if (endCursor) storeCursor(resource, page, endCursor);
        return { data, total };
    },

    create: async (resource, params) => {
        const config = resourceMap[resource];
        if (!config?.create) throw new Error(`Create not supported for "${resource}"`);
        return config.create(params.data);
    },

    update: async (resource, params) => {
        const config = resourceMap[resource];
        if (!config?.update) throw new Error(`Update not supported for "${resource}"`);
        return config.update(params.id, params.data);
    },

    updateMany: async (resource, params) => {
        const config = resourceMap[resource];
        if (!config?.update) throw new Error(`UpdateMany not supported for "${resource}"`);
        await Promise.all(params.ids.map(id => config.update!(id, params.data)));
        return { data: params.ids };
    },

    delete: async (resource, params) => {
        const config = resourceMap[resource];
        if (!config?.delete) throw new Error(`Delete not supported for "${resource}"`);
        return config.delete(params.id);
    },

    deleteMany: async (resource, params) => {
        const config = resourceMap[resource];
        if (!config?.delete) throw new Error(`DeleteMany not supported for "${resource}"`);
        await Promise.all(params.ids.map(id => config.delete!(id)));
        return { data: params.ids };
    },
};

export default dataProvider;