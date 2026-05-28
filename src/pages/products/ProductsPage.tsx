import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Search, Plus, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const GET_PRODUCTS = gql`
    query GetProducts($first: Int, $after: String, $categoryId: ID) {
        products(categoryId: $categoryId, pagination: { first: $first, after: $after }) {
            edges {
                node {
                    id
                    name
                    description
                    createdAt
                    updatedAt
                    variants {
                        id
                    }
                }
            }
            pageInfo {
                hasNextPage
                endCursor
            }
        }
    }
`;

export const ProductsPage = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [cursor, setCursor] = useState<string | null>(null);

    const { data, loading, error } = useQuery(GET_PRODUCTS, {
        variables: { first: 25, after: cursor },
    });

    const products = (data as any)?.products?.edges?.map((e: any) => e.node) ?? [];
    const pageInfo = (data as any)?.products?.pageInfo;

    const filtered = products.filter((p: any) =>
        search === '' || p.name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Products</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Manage your product catalog</p>
                </div>
                <Button
                    onClick={() => navigate('/products/create')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Create Product
                </Button>
            </div>

            {/* Search */}
            <div className="relative mb-6 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                    placeholder="Search products..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                            <th className="text-left px-6 py-3 font-semibold text-gray-600">Product</th>
                            <th className="text-left px-6 py-3 font-semibold text-gray-600">Description</th>
                            <th className="text-left px-6 py-3 font-semibold text-gray-600">Variants</th>
                            <th className="text-left px-6 py-3 font-semibold text-gray-600">Created</th>
                            <th className="text-left px-6 py-3 font-semibold text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && Array.from({ length: 6 }).map((_, i) => (
                            <tr key={i} className="border-b border-gray-50">
                                {Array.from({ length: 5 }).map((_, j) => (
                                    <td key={j} className="px-6 py-4">
                                        <Skeleton className="h-4 w-24" />
                                    </td>
                                ))}
                            </tr>
                        ))}

                        {error && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-red-500">
                                    Failed to load products
                                </td>
                            </tr>
                        )}

                        {!loading && filtered.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                        <Package className="w-8 h-8" />
                                        <p>No products found</p>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {filtered.map((product: any) => {
                            const variantCount = product.variants?.length ?? 0;
                            return (
                                <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {product.name}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 max-w-xs truncate">
                                        {product.description || '—'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge
                                            variant="outline"
                                            className={variantCount > 0
                                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                : 'bg-gray-50 text-gray-400 border-gray-200'
                                            }
                                        >
                                            {variantCount} {variantCount === 1 ? 'variant' : 'variants'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => navigate(`/products/${product.id}/edit`)}
                                            className="text-gray-600 hover:text-indigo-600 hover:border-indigo-300"
                                        >
                                            Edit
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {pageInfo?.hasNextPage && (
                    <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCursor(pageInfo.endCursor)}
                        >
                            Load more
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};