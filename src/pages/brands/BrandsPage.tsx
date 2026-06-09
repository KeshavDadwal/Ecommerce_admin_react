import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Trash2, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ConfirmDialog';

const GET_BRANDS = gql`
    query GetBrands {
        brands(pagination: { first: 200 }) {
            edges {
                node {
                    id
                    name
                    description
                    imageUrl
                    isActive
                }
            }
        }
    }
`;

const DELETE_BRAND = gql`
    mutation DeleteBrand($id: ID!) {
        deleteBrand(id: $id)
    }
`;

export const BrandsPage = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [deleting, setDeleting] = useState(false);

    const { data, loading, error, refetch } = useQuery(GET_BRANDS);
    const [deleteBrand] = useMutation(DELETE_BRAND);

    const brands = (data as any)?.brands?.edges?.map((e: any) => e.node) ?? [];

    const filtered = brands.filter((b: any) =>
        search === '' || b.name?.toLowerCase().includes(search.toLowerCase())
    );

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await deleteBrand({ variables: { id: deleteTarget.id } });
            refetch();
            setDeleteTarget(null);
        } catch (err: any) {
            // keep dialog open and show nothing — error can be added if needed
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="p-8">
            <ConfirmDialog
                open={!!deleteTarget}
                title={`Delete "${deleteTarget?.name}"?`}
                description="This will permanently delete this brand. This action cannot be undone."
                confirmLabel="Delete"
                loading={deleting}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteTarget(null)}
            />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Brands</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Manage your product brands</p>
                </div>
                <Button
                    onClick={() => navigate('/brands/create')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Create Brand
                </Button>
            </div>

            {/* Search */}
            <div className="relative mb-6 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                    placeholder="Search brands..."
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
                            <th className="text-left px-6 py-3 font-semibold text-gray-600">Name</th>
                            <th className="text-left px-6 py-3 font-semibold text-gray-600">Description</th>
                            <th className="text-left px-6 py-3 font-semibold text-gray-600">Status</th>
                            <th className="text-left px-6 py-3 font-semibold text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i} className="border-b border-gray-50">
                                {Array.from({ length: 4 }).map((_, j) => (
                                    <td key={j} className="px-6 py-4">
                                        <Skeleton className="h-4 w-24" />
                                    </td>
                                ))}
                            </tr>
                        ))}

                        {error && (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-red-500">
                                    Failed to load brands
                                </td>
                            </tr>
                        )}

                        {!loading && filtered.length === 0 && !error && (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                        <Tag className="w-8 h-8" />
                                        <p>No brands found</p>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {filtered.map((brand: any) => (
                            <tr key={brand.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900">
                                    <div className="flex items-center gap-3">
                                        {brand.imageUrl ? (
                                            <img
                                                src={brand.imageUrl}
                                                alt={brand.name}
                                                className="w-8 h-8 rounded-lg object-cover border border-gray-100 flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                <Tag className="w-4 h-4 text-gray-400" />
                                            </div>
                                        )}
                                        {brand.name}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-500 max-w-xs truncate">
                                    {brand.description || '—'}
                                </td>
                                <td className="px-6 py-4">
                                    <Badge
                                        variant="outline"
                                        className={brand.isActive
                                            ? 'bg-green-50 text-green-700 border-green-200'
                                            : 'bg-gray-100 text-gray-500 border-gray-200'}
                                    >
                                        {brand.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => navigate(`/brands/${brand.id}/edit`)}
                                            className="text-gray-600 hover:text-indigo-600 hover:border-indigo-300"
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setDeleteTarget({ id: brand.id, name: brand.name })}
                                            className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};