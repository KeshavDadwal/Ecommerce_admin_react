import * as React from 'react';
import { useEffect, useState } from 'react';
import { useNotify, useRefresh, useDataProvider } from 'react-admin';
import { clearProductsCache } from '../../dataProvider';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
    TextField,
    Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

const GQL_URL = '/graphql';

const UPDATE_PRODUCT_MUTATION = `
    mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {
        updateProduct(id: $id, input: $input) {
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

const getFriendlyUpdateError = (msg: string): string => {
    if (msg.includes('variants_sku_key') || (msg.includes('duplicate key') && msg.includes('sku'))) {
        return 'A product with this name or slug already exists. Please use a different name and slug.';
    }
    if (msg.includes('duplicate key') || msg.includes('23505')) {
        return 'A product with these details already exists.';
    }
    return msg || 'Failed to update product';
};

interface ProductEditDialogProps {
    productId: string;
}

export const ProductEditDialog = ({ productId }: ProductEditDialogProps) => {
    const notify = useNotify();
    const refresh = useRefresh();
    const dataProvider = useDataProvider();

    const [open, setOpen] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [imageFile, setImageFile] = useState<File | null>(null);

    const [form, setForm] = useState({
        name: '',
        slug: '',
        description: '',
        shortDescription: '',
        brand: '',
        tags: '',
        status: 'active',
        categoryId: '',
        sku: '',
        price: '0',
        stock: '0',
    });

    const loadData = async () => {
        setFetching(true);
        try {
            // Load product and categories in parallel
            const [productRes, categoriesRes] = await Promise.all([
                dataProvider.getOne('products', { id: productId }),
                dataProvider.getList('categories', {
                    pagination: { page: 1, perPage: 200 },
                    sort: { field: 'name', order: 'ASC' },
                    filter: {},
                }),
            ]);

            const p = productRes.data;
            setForm({
                name: p.name ?? '',
                slug: p.sku ?? '',          // slug not returned by API, fall back to sku-derived
                description: p.description ?? '',
                shortDescription: p.shortDescription ?? '',
                brand: p.brand ?? '',
                tags: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags ?? ''),
                status: p.status ?? 'active',
                categoryId: p.categoryId ?? '',
                sku: p.sku ?? '',
                price: String(p.price ?? 0),
                stock: String(p.stock ?? 0),
            });
            setCategories(categoriesRes.data);
        } catch (err) {
            console.error('[ProductEdit] Failed to load data', err);
            notify('Failed to load product details', { type: 'error' });
        } finally {
            setFetching(false);
        }
    };

    const handleOpen = () => {
        setOpen(true);
        loadData();
    };

    const handleClose = () => {
        setOpen(false);
        setImageFile(null);
    };

    const handleChange =
        (field: string) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setForm(prev => ({ ...prev, [field]: e.target.value }));

    const handleCategoryChange = (e: SelectChangeEvent<string>) =>
        setForm(prev => ({ ...prev, categoryId: e.target.value }));

    const handleSubmit = async () => {
        if (!form.name.trim() || !form.slug.trim()) {
            notify('Name and slug are required', { type: 'warning' });
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');

            const inputPayload: Record<string, any> = {
                name: form.name.trim(),
                slug: form.slug.trim(),
                description: form.description.trim() || ' ',
                sku: form.sku.trim() || `${form.slug.trim()}-${Date.now()}`,
                price: parseFloat(form.price) || 0,
                stock: parseInt(form.stock, 10) || 0,
                status: form.status || 'active',
                ...(form.categoryId ? { categoryId: form.categoryId } : {}),
                ...(form.shortDescription.trim() ? { shortDescription: form.shortDescription.trim() } : {}),
                ...(form.brand.trim() ? { brand: form.brand.trim() } : {}),
                ...(form.tags.trim()
                    ? { tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) }
                    : {}),
                ...(imageFile ? { image: null } : {}),
            };

            const operations = JSON.stringify({
                query: UPDATE_PRODUCT_MUTATION,
                variables: { id: productId, input: inputPayload },
            });

            const headers: Record<string, string> = {
                'ngrok-skip-browser-warning': 'true',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            };

            let body: FormData | string;
            if (imageFile) {
                const map = JSON.stringify({ '0': ['variables.input.image'] });
                const formData = new FormData();
                formData.append('operations', operations);
                formData.append('map', map);
                formData.append('0', imageFile);
                body = formData;
            } else {
                headers['Content-Type'] = 'application/json';
                body = operations;
            }

            const response = await fetch(GQL_URL, { method: 'POST', headers, body });
            const json = await response.json();
            if (json.errors?.length) throw new Error(json.errors[0].message);

            clearProductsCache();
            notify('Product updated successfully', { type: 'success' });
            refresh();
            handleClose();
        } catch (error: any) {
            console.error('[ProductEdit] Error:', error);
            notify(getFriendlyUpdateError(error?.message ?? ''), { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Button
                size="small"
                color="primary"
                startIcon={<EditIcon fontSize="small" />}
                onClick={e => { e.stopPropagation(); handleOpen(); }}
                sx={{ minWidth: 0 }}
            >
                Edit
            </Button>

            <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
                <DialogTitle>Edit Product</DialogTitle>
                <DialogContent>
                    {fetching ? (
                        <Box display="flex" justifyContent="center" alignItems="center" py={6}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Box display="grid" gap={2} mt={1}>
                            {/* Required */}
                            <TextField
                                label="Name"
                                value={form.name}
                                onChange={handleChange('name')}
                                required
                                fullWidth
                            />
                            <TextField
                                label="Slug"
                                value={form.slug}
                                onChange={handleChange('slug')}
                                required
                                helperText="URL-friendly identifier e.g. my-product"
                                fullWidth
                            />
                            <TextField
                                label="SKU"
                                value={form.sku}
                                onChange={handleChange('sku')}
                                fullWidth
                                helperText="Auto-generated by server on create"
                            />

                            {/* Category */}
                            <FormControl fullWidth>
                                <InputLabel id="edit-category-label">Category</InputLabel>
                                <Select
                                    labelId="edit-category-label"
                                    value={form.categoryId}
                                    label="Category"
                                    onChange={handleCategoryChange}
                                >
                                    <MenuItem value="">
                                        <em>None</em>
                                    </MenuItem>
                                    {categories.map(cat => (
                                        <MenuItem key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            {/* Price & Stock */}
                            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                                <TextField
                                    label="Price"
                                    type="number"
                                    value={form.price}
                                    onChange={handleChange('price')}
                                    inputProps={{ min: 0, step: '0.01' }}
                                    fullWidth
                                />
                                <TextField
                                    label="Stock"
                                    type="number"
                                    value={form.stock}
                                    onChange={handleChange('stock')}
                                    inputProps={{ min: 0 }}
                                    fullWidth
                                />
                            </Box>

                            {/* Optional */}
                            <TextField
                                label="Description"
                                value={form.description}
                                onChange={handleChange('description')}
                                multiline
                                rows={3}
                                fullWidth
                            />
                            <TextField
                                label="Short Description"
                                value={form.shortDescription}
                                onChange={handleChange('shortDescription')}
                                fullWidth
                            />
                            <TextField
                                label="Brand"
                                value={form.brand}
                                onChange={handleChange('brand')}
                                fullWidth
                            />
                            <TextField
                                label="Tags"
                                value={form.tags}
                                onChange={handleChange('tags')}
                                helperText="Comma-separated e.g. electronics, sale"
                                fullWidth
                            />
                            <TextField
                                label="Status"
                                value={form.status}
                                onChange={handleChange('status')}
                                helperText="e.g. active, draft, inactive"
                                fullWidth
                            />

                            {/* Image upload */}
                            <Box>
                                <Typography variant="body2" gutterBottom>
                                    Replace Image (optional)
                                </Typography>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => setImageFile(e.target.files?.[0] ?? null)}
                                />
                                {imageFile && (
                                    <Typography variant="caption" display="block" mt={1}>
                                        Selected: {imageFile.name}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} disabled={loading || fetching}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || fetching}
                        variant="contained"
                    >
                        {loading ? 'Saving…' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};