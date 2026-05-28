import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const GET_CATEGORIES = gql`
    query GetCategories {
        categories(pagination: { first: 200 }) {
            edges { node { id name } }
        }
    }
`;

const GET_PRODUCT = gql`
    query GetProduct($id: ID!) {
        product(id: $id) {
            id
            name
            description
            category { id name }
            variants { id }
            createdAt
            updatedAt
        }
    }
`;

const UPDATE_PRODUCT = gql`
    mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {
        updateProduct(id: $id, input: $input) { id name }
    }
`;

const DELETE_VARIANT = gql`
    mutation DeleteVariant($id: ID!) {
        deleteProductVariant(id: $id)
    }
`;

interface Variant {
    id?: string;
    sku: string;
    name: string;
    price: string;
    compareAtPrice: string;
    costPrice: string;
    weightGrams: string;
    options: string;
    isActive: boolean;
    isNew?: boolean;
}

const emptyVariant = (): Variant => ({
    sku: '', name: '', price: '', compareAtPrice: '',
    costPrice: '', weightGrams: '0', options: '', isActive: true, isNew: true,
});

export const ProductEditPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: '', slug: '', description: '', shortDescription: '',
        brand: '', tags: '', status: 'active', categoryId: '', attributes: '',
    });
    const [variants, setVariants] = useState<Variant[]>([]);
    const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([]);

    const { data: productData, loading: productLoading, error: productError } = useQuery(GET_PRODUCT, {
        variables: { id }, skip: !id,
    });
    const { data: categoriesData } = useQuery(GET_CATEGORIES);
    const categories = (categoriesData as any)?.categories?.edges?.map((e: any) => e.node) ?? [];

    const [updateProduct, { loading: saving, error: saveError }] = useMutation(UPDATE_PRODUCT);
    const [deleteVariant] = useMutation(DELETE_VARIANT);

    // Populate form when product loads
    useEffect(() => {
        const p = (productData as any)?.product;
        if (!p) return;
        setForm({
            name: p.name ?? '',
            slug: p.slug ?? '',
            description: p.description ?? '',
            shortDescription: p.shortDescription ?? '',
            brand: p.brand ?? '',
            tags: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags ?? ''),
            status: p.status ?? 'active',
            categoryId: p.category?.id ?? '',
            attributes: p.attributes ?? '',
        });
        setVariants((p.variants ?? []).map((v: any) => ({
            id: v.id,
            sku: v.sku ?? '',
            name: v.name ?? '',
            price: String(v.price ?? ''),
            compareAtPrice: String(v.compareAtPrice ?? ''),
            costPrice: String(v.costPrice ?? ''),
            weightGrams: String(v.weightGrams ?? '0'),
            options: v.options ?? '',
            isActive: v.isActive ?? true,
            isNew: false,
        })));
    }, [productData]);

    const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm(prev => ({ ...prev, [field]: e.target.value }));
    };

    const handleVariantChange = (index: number, field: keyof Variant) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setVariants(prev => prev.map((v, i) =>
            i === index ? { ...v, [field]: field === 'isActive' ? e.target.checked : e.target.value } : v
        ));
    };

    const removeVariant = (index: number) => {
        const v = variants[index];
        if (v.id) setDeletedVariantIds(prev => [...prev, v.id!]);
        setVariants(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.slug || !form.categoryId) return;
        try {
            // Delete removed variants first
            await Promise.all(deletedVariantIds.map(vid => deleteVariant({ variables: { id: vid } })));

            await updateProduct({
                variables: {
                    id,
                    input: {
                        name: form.name.trim(),
                        slug: form.slug.trim(),
                        description: form.description.trim() || '',
                        shortDescription: form.shortDescription.trim() || '',
                        categoryId: form.categoryId,
                        status: form.status,
                        ...(form.brand.trim() ? { brand: form.brand.trim() } : {}),
                        ...(form.attributes.trim() ? { attributes: form.attributes.trim() } : {}),
                        ...(form.tags.trim() ? { tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) } : {}),
                        variants: variants.filter(v => v.sku && v.name && v.price).map(v => ({
                            ...(v.id && !v.isNew ? { id: v.id } : {}),
                            sku: v.sku.trim(),
                            name: v.name.trim(),
                            price: parseFloat(v.price) || 0,
                            isActive: v.isActive,
                            weightGrams: parseInt(v.weightGrams) || 0,
                            ...(v.compareAtPrice ? { compareAtPrice: parseFloat(v.compareAtPrice) } : {}),
                            ...(v.costPrice ? { costPrice: parseFloat(v.costPrice) } : {}),
                            ...(v.options.trim() ? { options: v.options.trim() } : {}),
                        })),
                    },
                },
            });
            navigate('/products');
        } catch (err) { console.error(err); }
    };

    if (productLoading) return (
        <div className="p-8 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
    );

    if (productError) return (
        <div className="p-8 text-red-500">Failed to load product</div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top bar */}
            <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/products')} className="gap-2 text-gray-600 -ml-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Products
                </Button>
                <div className="h-4 w-px bg-gray-200" />
                <h1 className="text-lg font-semibold text-gray-900">Edit Product</h1>
                <div className="ml-auto flex gap-3">
                    <Button type="button" variant="outline" onClick={() => navigate('/products')}>Cancel</Button>
                    <Button form="edit-form" type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        {saving ? 'Saving…' : 'Save Changes'}
                    </Button>
                </div>
            </div>

            <form id="edit-form" onSubmit={handleSubmit}>
                <div className="px-8 py-6 grid grid-cols-3 gap-6">

                    {/* Left — main content */}
                    <div className="col-span-2 space-y-6">

                        {/* Basic Info */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                            <h2 className="font-semibold text-gray-800">Basic Information</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
                                    <Input value={form.name} onChange={handleChange('name')} placeholder="Product name" required />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">Slug <span className="text-red-500">*</span></label>
                                    <Input value={form.slug} onChange={handleChange('slug')} placeholder="product-slug" required />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">Short Description</label>
                                <Input value={form.shortDescription} onChange={handleChange('shortDescription')} placeholder="Brief one-line summary" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                    value={form.description} onChange={handleChange('description')} rows={4}
                                    placeholder="Full product description"
                                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                />
                            </div>
                        </div>

                        {/* Variants */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="font-semibold text-gray-800">Variants</h2>
                                    <p className="text-xs text-gray-500 mt-0.5">{variants.length} variant{variants.length !== 1 ? 's' : ''}</p>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={() => setVariants(p => [...p, emptyVariant()])} className="gap-1.5">
                                    <Plus className="w-3.5 h-3.5" /> Add Variant
                                </Button>
                            </div>

                            {variants.length === 0 && (
                                <div className="text-center py-8 text-gray-400 border border-dashed border-gray-200 rounded-lg">
                                    No variants yet. Add one above.
                                </div>
                            )}

                            {variants.map((variant, index) => (
                                <div key={variant.id ?? index} className={`border rounded-lg p-4 space-y-3 ${variant.isNew ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-100 bg-gray-50/50'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs bg-white">
                                                {variant.isNew ? 'New' : `Variant ${index + 1}`}
                                            </Badge>
                                            {!variant.isActive && (
                                                <Badge variant="outline" className="text-xs bg-gray-100 text-gray-500">Inactive</Badge>
                                            )}
                                        </div>
                                        <button type="button" onClick={() => removeVariant(index)} className="text-red-400 hover:text-red-600">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-gray-600">SKU <span className="text-red-500">*</span></label>
                                            <Input value={variant.sku} onChange={handleVariantChange(index, 'sku')} placeholder="SKU-001" className="bg-white" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-gray-600">Variant Name <span className="text-red-500">*</span></label>
                                            <Input value={variant.name} onChange={handleVariantChange(index, 'name')} placeholder="Default / XL / Red" className="bg-white" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-gray-600">Options</label>
                                            <Input value={variant.options} onChange={handleVariantChange(index, 'options')} placeholder='{"size":"XL"}' className="bg-white" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-gray-600">Price <span className="text-red-500">*</span></label>
                                            <Input type="number" value={variant.price} onChange={handleVariantChange(index, 'price')} placeholder="0.00" min="0" step="0.01" className="bg-white" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-gray-600">Compare At Price</label>
                                            <Input type="number" value={variant.compareAtPrice} onChange={handleVariantChange(index, 'compareAtPrice')} placeholder="0.00" min="0" step="0.01" className="bg-white" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-gray-600">Cost Price</label>
                                            <Input type="number" value={variant.costPrice} onChange={handleVariantChange(index, 'costPrice')} placeholder="0.00" min="0" step="0.01" className="bg-white" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-gray-600">Weight (grams) <span className="text-red-500">*</span></label>
                                            <Input type="number" value={variant.weightGrams} onChange={handleVariantChange(index, 'weightGrams')} placeholder="0" min="0" className="bg-white" />
                                        </div>
                                    </div>
                                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                        <input type="checkbox" checked={variant.isActive} onChange={handleVariantChange(index, 'isActive')} className="rounded" />
                                        Active
                                    </label>
                                </div>
                            ))}
                        </div>

                        {saveError && (
                            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                                {saveError.message}
                            </div>
                        )}
                    </div>

                    {/* Right — meta */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                            <h2 className="font-semibold text-gray-800">Product Details</h2>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">Category <span className="text-red-500">*</span></label>
                                <select value={form.categoryId} onChange={handleChange('categoryId')} required
                                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option value="">Select a category</option>
                                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">Status</label>
                                <select value={form.status} onChange={handleChange('status')}
                                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option value="active">Active</option>
                                    <option value="draft">Draft</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">Brand</label>
                                <Input value={form.brand} onChange={handleChange('brand')} placeholder="Brand name" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">Tags</label>
                                <Input value={form.tags} onChange={handleChange('tags')} placeholder="sale, new (comma separated)" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">Attributes</label>
                                <Input value={form.attributes} onChange={handleChange('attributes')} placeholder='{"color":"midnight"}' />
                            </div>
                        </div>
                    </div>

                </div>
            </form>
        </div>
    );
};