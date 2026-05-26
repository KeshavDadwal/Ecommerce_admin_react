import * as React from 'react';
import { useEffect, useState } from 'react';
import { useNotify, useRefresh, useDataProvider } from 'react-admin';
import { clearProductsCache } from '../../dataProvider';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    SelectChangeEvent,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

const GQL_URL = '/graphql';

const CREATE_PRODUCT_MUTATION = `
    mutation CreateProduct($input: CreateProductInput!) {
        createProduct(input: $input) {
            id
            name
            description
            sku
            images
            createdAt
            updatedAt
        }
    }
`;

const getFriendlyCreateError = (msg: string): string => {
    if (msg.includes('variants_sku_key') || (msg.includes('duplicate key') && msg.includes('sku'))) {
        return 'A product with this name or slug already exists. Please use a different name and slug.';
    }
    if (msg.includes('duplicate key') || msg.includes('23505')) {
        return 'A product with these details already exists. Please use a unique name and slug.';
    }
    if (msg.includes('slug')) {
        return 'A product with this slug already exists. Please use a different slug.';
    }
    return msg || 'Failed to create product';
};

const emptyForm = () => ({
    name: '',
    slug: '',
    description: '',
    shortDescription: '',
    brand: '',
    tags: '',
    status: 'active',
    categoryId: '',
});

export const ProductCreateDialog = () => {
    const notify = useNotify();
    const refresh = useRefresh();
    const dataProvider = useDataProvider();

    const [open, setOpen] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [form, setForm] = useState(emptyForm());

    const loadCategories = async () => {
        try {
            const { data } = await dataProvider.getList('categories', {
                pagination: { page: 1, perPage: 200 },
                sort: { field: 'name', order: 'ASC' },
                filter: {},
            });
            setCategories(data);
        } catch (err) {
            console.error('[ProductCreate] Failed to load categories', err);
            notify('Unable to load categories', { type: 'warning' });
        }
    };

    useEffect(() => {
        if (open) loadCategories();
    }, [open]);

    const handleOpen = () => setOpen(true);
    const handleClose = () => {
        setOpen(false);
        setForm(emptyForm());
        setImageFile(null);
    };

    const toSlug = (str: string) =>
        str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const handleChange =
        (field: string) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const value = e.target.value;
            setForm(prev => ({
                ...prev,
                [field]: value,
                ...(field === 'name' && prev.slug === toSlug(prev.name)
                    ? { slug: toSlug(value) }
                    : {}),
            }));
        };

    const handleCategoryChange = (e: SelectChangeEvent<string>) =>
        setForm(prev => ({ ...prev, categoryId: e.target.value }));

    const handleSubmit = async () => {
        if (!form.name.trim() || !form.slug.trim()) {
            notify('Name and slug are required', { type: 'warning' });
            return;
        }
        if (!form.categoryId) {
            notify('Please select a category', { type: 'warning' });
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');

            const inputPayload: Record<string, any> = {
                name: form.name.trim(),
                slug: form.slug.trim(),
                description: form.description.trim() || ' ',
                sku: `${form.slug.trim()}-${Date.now()}`,
                price: 0,
                stock: 0,
                categoryId: form.categoryId,
                status: form.status || 'active',
                ...(form.shortDescription.trim() ? { shortDescription: form.shortDescription.trim() } : {}),
                ...(form.brand.trim() ? { brand: form.brand.trim() } : {}),
                ...(form.tags.trim()
                    ? { tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) }
                    : {}),
                ...(imageFile ? { image: null } : {}),
            };

            const operations = JSON.stringify({
                query: CREATE_PRODUCT_MUTATION,
                variables: { input: inputPayload },
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
            notify(
                `Product created! Use the search bar to find "${form.name.trim()}" or navigate to the last page.`,
                { type: 'success', autoHideDuration: 6000 }
            );
            refresh();
            handleClose();
        } catch (error: any) {
            console.error('[ProductCreate] Error:', error);
            notify(getFriendlyCreateError(error?.message ?? ''), { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const selectedCategory = categories.find(c => c.id === form.categoryId);

    return (
        <>
            <Button color="inherit" startIcon={<AddIcon />} onClick={handleOpen}>
                Create Product
            </Button>

            <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
                <DialogTitle>Create Product</DialogTitle>
                <DialogContent>
                    <Box display="grid" gap={2} mt={1}>

                        <Alert severity="info">
                            SKU is auto-generated by the server. Price and stock are managed
                            separately via product variants after creation.
                        </Alert>

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
                            helperText="Auto-filled from name. URL-friendly e.g. my-product"
                            fullWidth
                        />

                        {/* Category dropdown */}
                        <FormControl fullWidth required>
                            <InputLabel id="product-category-label">Category</InputLabel>
                            <Select
                                labelId="product-category-label"
                                value={form.categoryId}
                                label="Category"
                                onChange={handleCategoryChange}
                            >
                                <MenuItem value="" disabled>
                                    <em>Select a category</em>
                                </MenuItem>
                                {categories.map(cat => (
                                    <MenuItem key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </MenuItem>
                                ))}
                            </Select>
                            {selectedCategory && (
                                <Typography variant="caption" color="text.secondary" mt={0.5} ml={0.5}>
                                    ID: {selectedCategory.id}
                                </Typography>
                            )}
                        </FormControl>

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
                                Image (optional)
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
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading} variant="contained">
                        {loading ? 'Saving…' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};