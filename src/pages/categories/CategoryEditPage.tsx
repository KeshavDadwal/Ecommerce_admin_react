import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const NULL_UUID = '00000000-0000-0000-0000-000000000000';

const GET_CATEGORY = gql`
    query GetCategory($id: ID!) {
        category(id: $id) {
            id
            name
            slug
            description
            parentId
            sortOrder
            isActive
            imageUrl
        }
    }
`;

const GET_CATEGORIES = gql`
    query GetCategoriesForParent {
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

const UPDATE_CATEGORY = gql`
    mutation UpdateCategory($id: ID!, $input: UpdateCategoryInput!) {
        updateCategory(id: $id, input: $input) {
            id
            name
            slug
        }
    }
`;

export const CategoryEditPage = () => {
    const { id } = useParams<{ id: string }>();
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
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const { data: categoryData, loading: categoryLoading } = useQuery(GET_CATEGORY, {
        variables: { id },
        skip: !id,
    });

    const { data: categoriesData } = useQuery(GET_CATEGORIES);
    const allCategories = (categoriesData as any)?.categories?.edges?.map((e: any) => e.node) ?? [];
    const parentOptions = allCategories.filter((c: any) => c.id !== id);

    const [updateCategory, { loading: updating }] = useMutation(UPDATE_CATEGORY);

    useEffect(() => {
        const cat = (categoryData as any)?.category;
        if (!cat) return;
        setForm({
            name: cat.name ?? '',
            slug: cat.slug ?? '',
            description: cat.description ?? '',
            parentId: (cat.parentId && cat.parentId !== NULL_UUID) ? cat.parentId : '',
            sortOrder: String(cat.sortOrder ?? 0),
            isActive: cat.isActive ?? true,
        });
        if (cat.imageUrl) setImagePreview(cat.imageUrl);
    }, [categoryData]);

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

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setImageFile(file);
        if (file) {
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.slug || !id) return;
        setSubmitError(null);

        try {
            const token = localStorage.getItem('access_token');

            const inputPayload: any = {
                name: form.name.trim(),
                slug: form.slug.trim(),
                sortOrder: parseInt(form.sortOrder) || 0,
                isActive: form.isActive,
                ...(form.description.trim() ? { description: form.description.trim() } : {}),
                ...(form.parentId && form.parentId !== NULL_UUID ? { parentId: form.parentId } : {}),
                ...(imageFile ? { image: null } : {}),
            };

            if (imageFile) {
                const operations = JSON.stringify({
                    query: `mutation UpdateCategory($id: ID!, $input: UpdateCategoryInput!) {
                        updateCategory(id: $id, input: $input) { id name slug }
                    }`,
                    variables: { id, input: inputPayload },
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
                await updateCategory({ variables: { id, input: inputPayload } });
            }

            navigate('/categories');
        } catch (err: any) {
            setSubmitError(err?.message ?? 'Failed to update category');
        }
    };

    if (categoryLoading) {
        return (
            <div className="p-8 max-w-2xl">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 w-48 bg-gray-200 rounded" />
                    <div className="h-64 bg-gray-200 rounded-xl" />
                </div>
            </div>
        );
    }

    const existingImageUrl = (categoryData as any)?.category?.imageUrl;

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

            <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Category</h1>

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
                            {parentOptions.map((c: any) => (
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

                    {/* Image section */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Image</label>

                        {imagePreview ? (
                            <div className="flex items-center gap-3">
                                <img
                                    src={imagePreview}
                                    alt="Category"
                                    className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                                />
                                <div className="text-xs text-gray-500">
                                    {imageFile ? (
                                        <span className="text-indigo-600 font-medium">New: {imageFile.name}</span>
                                    ) : (
                                        <span>Current image</span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            !existingImageUrl && (
                                <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center border border-dashed border-gray-300">
                                    <ImageIcon className="w-5 h-5 text-gray-400" />
                                </div>
                            )
                        )}

                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        />
                        <p className="text-xs text-gray-400">Upload a new image to replace the current one.</p>
                    </div>
                </div>

                {submitError && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                        {submitError}
                    </div>
                )}

                <div className="flex gap-3">
                    <Button
                        type="submit"
                        disabled={updating}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {updating ? 'Saving…' : 'Save Changes'}
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