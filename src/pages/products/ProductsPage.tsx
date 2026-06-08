import { useState, useCallback } from 'react';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Search, Plus, Package, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const PAGE_SIZE = 25;

const GET_PRODUCTS = gql`
    query GetProducts($first: Int, $after: String, $before: String, $last: Int) {
        products(pagination: { first: $first, after: $after, before: $before, last: $last }) {
            edges {
                node {
                    id
                    name
                    description
                    createdAt
                    variants { id }
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

const SEARCH_PRODUCTS = gql`
    query SearchProducts($query: String!, $first: Int) {
        searchProducts(query: $query, pagination: { first: $first }) {
            edges {
                node {
                    id
                    name
                    description
                    createdAt
                    variants { id }
                }
            }
        }
    }
`;

const DELETE_PRODUCT = gql`
    mutation DeleteProduct($id: ID!) {
        deleteProduct(id: $id)
    }
`;

export const ProductsPage = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [cursors, setCursors] = useState<string[]>([]);
    const [afterCursor, setAfterCursor] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [confirmDeleteName, setConfirmDeleteName] = useState<string>('');
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const { data, loading, error } = useQuery(GET_PRODUCTS, {
        variables: { first: PAGE_SIZE, after: afterCursor },
        skip: search.trim().length > 0,
    });

    const [runSearch, { data: searchData, loading: searchLoading }] = useLazyQuery(SEARCH_PRODUCTS);

    const [deleteProduct, { loading: deleteLoading }] = useMutation(DELETE_PRODUCT, {
        // Evict the deleted product from Apollo's cache immediately so the
        // list updates without needing a manual refetch or stale-closure issues.
        update(cache, _, { variables }) {
            cache.evict({ id: `Product:${variables?.id}` });
            cache.gc();
        },
        onCompleted: () => {
            setConfirmDeleteId(null);
            setConfirmDeleteName('');
            setDeleteError(null);
        },
        onError: (err) => {
            setDeleteError(err.message ?? 'Failed to delete product.');
        },
    });

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearch(val);
        if (val.trim().length > 1) {
            runSearch({ variables: { query: val.trim(), first: 50 } });
        }
    }, [runSearch]);

    const handleDeleteClick = (id: string, name: string) => {
        setDeleteError(null);
        setConfirmDeleteId(id);
        setConfirmDeleteName(name);
    };

    const handleDeleteConfirm = () => {
        if (!confirmDeleteId) return;
        deleteProduct({ variables: { id: confirmDeleteId } });
    };

    const isSearching = search.trim().length > 1;
    const products = isSearching
        ? (searchData as any)?.searchProducts?.edges?.map((e: any) => e.node) ?? []
        : (data as any)?.products?.edges?.map((e: any) => e.node) ?? [];
    const pageInfo = (data as any)?.products?.pageInfo;
    const isLoading = isSearching ? searchLoading : loading;

    const goNext = () => {
        if (!pageInfo?.endCursor) return;
        setCursors(prev => [...prev, pageInfo.startCursor]);
        setAfterCursor(pageInfo.endCursor);
    };

    const goPrev = () => {
        const prev = [...cursors];
        prev.pop();
        setCursors(prev);
        setAfterCursor(prev.length > 0 ? prev[prev.length - 1] : null);
    };

    const currentPage = cursors.length + 1;

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
                    onChange={handleSearchChange}
                    className="pl-9"
                />
                {isSearching && (
                    <button
                        onClick={() => setSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                    >
                        Clear
                    </button>
                )}
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
                        {isLoading && Array.from({ length: 6 }).map((_, i) => (
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

                        {!isLoading && products.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                        <Package className="w-8 h-8" />
                                        <p>{isSearching ? `No results for "${search}"` : 'No products found'}</p>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {products.map((product: any) => {
                            const variantCount = product.variants?.length ?? 0;
                            const isDeleting = deleteLoading && confirmDeleteId === product.id;
                            return (
                                <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
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
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => navigate(`/products/${product.id}/edit`)}
                                                className="text-gray-600 hover:text-indigo-600 hover:border-indigo-300"
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDeleteClick(product.id, product.name)}
                                                disabled={isDeleting}
                                                className="text-red-400 hover:text-red-600 hover:border-red-300"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Pagination */}
                {!isSearching && (pageInfo?.hasNextPage || pageInfo?.hasPreviousPage || currentPage > 1) && (
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-xs text-gray-500">Page {currentPage}</p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={goPrev}
                                disabled={currentPage === 1}
                                className="gap-1.5"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={goNext}
                                disabled={!pageInfo?.hasNextPage}
                                className="gap-1.5"
                            >
                                Next
                                <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirm Modal */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => { setConfirmDeleteId(null); setDeleteError(null); }}
                    />
                    <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                <Trash2 className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Delete Product</h3>
                                <p className="text-sm text-gray-500">This action cannot be undone.</p>
                            </div>
                        </div>

                        <p className="text-sm text-gray-700 mb-4">
                            Are you sure you want to delete{' '}
                            <span className="font-semibold">"{confirmDeleteName}"</span>?
                        </p>

                        {deleteError && (
                            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                                {deleteError}
                            </p>
                        )}

                        <div className="flex gap-3 justify-end">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setConfirmDeleteId(null); setDeleteError(null); }}
                                disabled={deleteLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleDeleteConfirm}
                                disabled={deleteLoading}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                {deleteLoading ? 'Deleting…' : 'Delete'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};