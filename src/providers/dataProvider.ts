import type { DataProvider } from '@refinedev/core';
import { apolloClient } from '../graphql/client';
import { gql } from '@apollo/client';

export const dataProvider: DataProvider = {
    getList: async ({ resource, pagination, filters }) => {
        const perPage = pagination?.pageSize ?? 25;
        const categoryId = ((filters ?? []) as any[]).find((f) => f.field === 'categoryId')?.value ?? '';

        if (resource === 'users') {
            const { data } = await apolloClient.query({
                query: gql`
                    query GetUsers($first: Int) {
                        users(pagination: { first: $first }) {
                            edges { node {
                                id email firstName lastName username phone role status createdAt updatedAt
                            }}
                            pageInfo { hasNextPage endCursor }
                        }
                    }
                `,
                variables: { first: perPage },
            });
            const edges = (data as any).users.edges ?? [];
            return { data: edges.map((e: any) => e.node), total: edges.length };
        }

        if (resource === 'products') {
            const { data } = await apolloClient.query({
                query: gql`
                    query GetProducts($first: Int, $categoryId: ID) {
                        products(categoryId: $categoryId, pagination: { first: $first }) {
                            edges { node {
                                id name description createdAt updatedAt
                            }}
                            pageInfo { hasNextPage endCursor }
                        }
                    }
                `,
                variables: { first: perPage, categoryId: categoryId || undefined },
            });
            const edges = (data as any).products.edges ?? [];
            return { data: edges.map((e: any) => e.node), total: edges.length };
        }

        if (resource === 'categories') {
            const { data } = await apolloClient.query({
                query: gql`
                    query GetCategories {
                        categories(pagination: { first: 200 }) {
                            edges { node {
                                id name slug description parentId imageUrl
                            }}
                        }
                    }
                `,
            });
            const edges = (data as any).categories.edges ?? [];
            return { data: edges.map((e: any) => e.node), total: edges.length };
        }

        return { data: [], total: 0 };
    },

    getOne: async ({ resource, id }) => {
        if (resource === 'users') {
            const { data } = await apolloClient.query({
                query: gql`
                    query GetUser($id: ID!) {
                        user(id: $id) {
                            id email firstName lastName username phone role status createdAt updatedAt
                        }
                    }
                `,
                variables: { id },
            });
            return { data: (data as any).user };
        }

        if (resource === 'products') {
            const { data } = await apolloClient.query({
                query: gql`
                    query GetProduct($id: ID!) {
                        product(id: $id) {
                            id name description price sku stock images createdAt updatedAt
                        }
                    }
                `,
                variables: { id },
            });
            return { data: (data as any).product };
        }

        return { data: { id } as any };
    },

    create: async () => { throw new Error('Use custom mutations for create'); },
    update: async () => { throw new Error('Use custom mutations for update'); },
    deleteOne: async () => { throw new Error('Use custom mutations for delete'); },
    getApiUrl: () => '/graphql',
};