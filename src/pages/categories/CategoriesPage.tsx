import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Trash2, FolderTree } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const GET_CATEGORIES = gql`
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

const DELETE_CATEGORY = gql`
    mutation DeleteCategory($id: ID!) {
        deleteCategory(id: $id)
    }
`;

export const CategoriesPage = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const { data, loading, error, refetch } = useQuery(GET_CATEGORIES);
    const [deleteCategory] = useMutation(DELETE_CATEGORY);

    const categories = (data as any)?.categories?.edges?.map((e: any) => e.node) ?? [];

    const filtered = categories.filter((c: any) =>
        search === '' ||
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.slug?.toLowerCase().includes(search.toLowerCase())
    );

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        setDeletingId(id);
        try {
            await deleteCategory({ variables: { id } });
            refetch();
        } catch (err: any) {
            alert(err?.message ?? 'Failed to delete category');
        } finally {
            setDeletingId(null);
        }
    };

    const getParentName = (parentId: string | null) => {
        if (!parentId) return null;
        return categories.find((c: any) => c.id === parentId)?.name ?? null;
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Manage your product categories</p>
                </div>
                <Button
                    onClick={() => navigate('/categories/create')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Create Category
                </Button>
            </div>

            {/* Search */}
            <div className="relative mb-6 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                    placeholder="Search categories..."
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
                            <th className="text-left px-6 py-3 font-semibold text-gray-600">Slug</th>
                            <th className="text-left px-6 py-3 font-semibold text-gray-600">Parent</th>
                            <th className="text-left px-6 py-3 font-semibold text-gray-600">Description</th>
                            <th className="text-left px-6 py-3 font-semibold text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && Array.from({ length: 5 }).map((_, i) => (
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
                                    Failed to load categories
                                </td>
                            </tr>
                        )}

                        {!loading && filtered.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                        <FolderTree className="w-8 h-8" />
                                        <p>No categories found</p>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {filtered.map((cat: any) => (
                            <tr key={cat.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900">
                                    <div className="flex items-center gap-2">
                                        {cat.imageUrl && (
                                            <img src={cat.imageUrl} alt={cat.name} className="w-8 h-8 rounded object-cover" />
                                        )}
                                        {cat.name}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-500 font-mono text-xs">{cat.slug}</td>
                                <td className="px-6 py-4">
                                    {getParentName(cat.parentId) ? (
                                        <Badge variant="outline" className="text-xs">
                                            {getParentName(cat.parentId)}
                                        </Badge>
                                    ) : (
                                        <span className="text-gray-400 text-xs">Root</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-gray-500 max-w-xs truncate">
                                    {cat.description || '—'}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => navigate(`/categories/${cat.id}/edit`)}
                                            className="text-gray-600 hover:text-indigo-600 hover:border-indigo-300"
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            disabled={deletingId === cat.id}
                                            onClick={() => handleDelete(cat.id, cat.name)}
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