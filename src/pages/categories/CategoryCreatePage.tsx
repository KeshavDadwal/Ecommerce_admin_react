import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const GET_CATEGORIES = gql`
    query GetCategories {
        categories(pagination: { first: 200 }) {
            edges {
                node {
                    id
                    name
                }
            }
        }
    }
`;

const CREATE_CATEGORY = gql`
    mutation CreateCategory($input: CreateCategoryInput!) {
        createCategory(input: $input) {
            id
            name
            slug
        }
    }
`;

export const CategoryCreatePage = () => {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: '',
        slug: '',
        description: '',
        parentId: '',
        sortOrder: '0',
        isActive: true,
    });

    const [imageFile, setImageFile] = useState<File | null>(null);

    const { data: categoriesData } = useQuery(GET_CATEGORIES);
    const categories = (categoriesData as any)?.categories?.edges?.map((e: any) => e.node) ?? [];

    const [createCategory, { loading, error }] = useMutation(CREATE_CATEGORY);

    const toSlug = (str: string) =>
        str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const handleChange = (field: string) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const value = e.target.value;
        setForm(prev => ({
            ...prev,
            [field]: value,
            ...(field === 'name' && prev.slug === toSlug(prev.name)
                ? { slug: toSlug(value) }
                : {}),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.slug) return;

        try {
            const token = localStorage.getItem('access_token');

            const inputPayload: any = {
                name: form.name.trim(),
                slug: form.slug.trim(),
                SortOrder: parseInt(form.sortOrder) || 0,
                IsActive: form.isActive,
                ...(form.description.trim() ? { description: form.description.trim() } : {}),
                ...(form.parentId ? { parentId: form.parentId } : {}),
                ...(imageFile ? { image: null } : {}),
            };

            if (imageFile) {
                // multipart upload
                const operations = JSON.stringify({
                    query: `mutation CreateCategory($input: CreateCategoryInput!) {
                        createCategory(input: $input) { id name slug }
                    }`,
                    variables: { input: inputPayload },
                });
                const map = JSON.stringify({ '0': ['variables.input.image'] });
                const formData = new FormData();
                formData.append('operations', operations);
                formData.append('map', map);
                formData.append('0', imageFile);

                const res = await fetch('/graphql', {
                    method: 'POST',
                    headers: {
                        'ngrok-skip-browser-warning': 'true',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: formData,
                });
                const json = await res.json();
                if (json.errors?.length) throw new Error(json.errors[0].message);
            } else {
                await createCategory({ variables: { input: inputPayload } });
            }

            navigate('/categories');
        } catch (err: any) {
            console.error(err);
        }
    };

    return (
        <div className="p-8 max-w-2xl">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/categories')}
                className="mb-6 gap-2 text-gray-600 -ml-2"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Categories
            </Button>

            <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Category</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <h2 className="font-semibold text-gray-800">Category Details</h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">
                                Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                value={form.name}
                                onChange={handleChange('name')}
                                placeholder="Category name"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">
                                Slug <span className="text-red-500">*</span>
                            </label>
                            <Input
                                value={form.slug}
                                onChange={handleChange('slug')}
                                placeholder="category-slug"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Description</label>
                        <textarea
                            value={form.description}
                            onChange={handleChange('description')}
                            rows={3}
                            placeholder="Category description"
                            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Parent Category</label>
                        <select
                            value={form.parentId}
                            onChange={handleChange('parentId')}
                            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">None (Root category)</option>
                            {categories.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Sort Order</label>
                            <Input
                                type="number"
                                value={form.sortOrder}
                                onChange={handleChange('sortOrder')}
                                placeholder="0"
                                min="0"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Status</label>
                            <div className="flex items-center gap-2 h-10">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={form.isActive}
                                    onChange={e => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                                    className="rounded"
                                />
                                <label htmlFor="isActive" className="text-sm text-gray-600">Active</label>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Image (optional)</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={e => setImageFile(e.target.files?.[0] ?? null)}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        />
                        {imageFile && (
                            <p className="text-xs text-gray-500">Selected: {imageFile.name}</p>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                        {error.message}
                    </div>
                )}

                <div className="flex gap-3">
                    <Button
                        type="submit"
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {loading ? 'Creating…' : 'Create Category'}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/categories')}
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </div>
    );
};