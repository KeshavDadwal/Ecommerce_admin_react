import * as React from 'react';
import { useEffect, useState } from 'react';
import {
    useDataProvider,
    useNotify,
    useRefresh,
} from 'react-admin';
import { clearCategoriesCache } from '../../dataProvider';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

const GQL_URL = '/graphql';

const CREATE_CATEGORY_WITH_IMAGE = `
    mutation CreateCategory($input: CreateCategoryInput!) {
        createCategory(input: $input) {
            id
            name
            slug
            description
            parentId
        }
    }
`;

export const CategoryCreateDialog = () => {
    const dataProvider = useDataProvider();
    const notify = useNotify();
    const refresh = useRefresh();

    const [open, setOpen] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: '',
        slug: '',
        description: '',
        parentId: '',
        sortOrder: 0,
        isActive: true,
    });

    const loadCategories = async () => {
        try {
            const { data } = await dataProvider.getList('categories', {
                pagination: { page: 1, perPage: 200 },
                sort: { field: 'name', order: 'ASC' },
                filter: {},
            });
            setCategories(data);
        } catch (error) {
            console.error(error);
            notify('Unable to load categories', { type: 'warning' });
        }
    };

    useEffect(() => {
        if (open) {
            loadCategories();
        }
    }, [open]);

    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = field === 'isActive'
            ? (event.target as HTMLInputElement).checked
            : event.target.value;
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleParentChange = (event: SelectChangeEvent<string>) => {
        setForm(prev => ({ ...prev, parentId: event.target.value }));
    };

    const handleSubmit = async () => {
        if (!form.name.trim() || !form.slug.trim()) {
            notify('Name and slug are required', { type: 'warning' });
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const inputPayload: any = {
                name: form.name,
                slug: form.slug,
                parentId: form.parentId || undefined,
                SortOrder: form.sortOrder,
                IsActive: form.isActive,
                ...(form.description ? { description: form.description } : {}),
                ...(imageFile ? { image: null } : {}),
            };

            const operations = JSON.stringify({
                query: CREATE_CATEGORY_WITH_IMAGE,
                variables: { input: inputPayload },
            });

            const map = imageFile ? JSON.stringify({ '0': ['variables.input.image'] }) : null;

            let body: FormData | string;
            const headers: Record<string, string> = {
                'ngrok-skip-browser-warning': 'true',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            };

            if (imageFile && map) {
                const formData = new FormData();
                formData.append('operations', operations);
                formData.append('map', map);
                formData.append('0', imageFile);
                body = formData;
            } else {
                body = operations;
                headers['Content-Type'] = 'application/json';
            }

            const response = await fetch(GQL_URL, {
                method: 'POST',
                headers,
                body,
            });

            const json = await response.json();
            if (json.errors?.length) {
                throw new Error(json.errors[0].message);
            }

            clearCategoriesCache();
            notify('Category created successfully', { type: 'success' });
            refresh();
            setForm({ name: '', slug: '', description: '', parentId: '', sortOrder: 0, isActive: true });
            setImageFile(null);
            handleClose();
        } catch (error: any) {
            console.error(error);
            notify(error?.message ?? 'Failed to create category', { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Button color="inherit" startIcon={<AddIcon />} onClick={handleOpen}>
                Create Category
            </Button>
            <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
                <DialogTitle>Create Category</DialogTitle>
                <DialogContent>
                    <Box display="grid" gap={2} mt={1}>
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
                            helperText="URL-friendly identifier e.g. my-category"
                            fullWidth
                        />
                        <TextField
                            label="Description"
                            value={form.description}
                            onChange={handleChange('description')}
                            multiline
                            rows={3}
                            fullWidth
                        />
                        <Box>
                            <Typography variant="body2" gutterBottom>
                                Image (optional)
                            </Typography>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={event => setImageFile(event.target.files?.[0] ?? null)}
                            />
                            {imageFile && (
                                <Typography variant="caption" display="block" mt={1}>
                                    Selected: {imageFile.name}
                                </Typography>
                            )}
                        </Box>
                        <FormControl fullWidth>
                            <InputLabel id="parent-category-label">Parent Category</InputLabel>
                            <Select
                                labelId="parent-category-label"
                                value={form.parentId}
                                label="Parent Category"
                                onChange={handleParentChange}
                            >
                                <MenuItem value="">
                                    <em>None</em>
                                </MenuItem>
                                {categories.map(category => (
                                    <MenuItem key={category.id} value={category.id}>
                                        {category.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Sort Order"
                            type="number"
                            value={form.sortOrder}
                            onChange={event => setForm(prev => ({ ...prev, sortOrder: Number(event.target.value) }))}
                            fullWidth
                        />
                        <Box display="flex" alignItems="center">
                            <Switch
                                checked={form.isActive}
                                onChange={event => setForm(prev => ({ ...prev, isActive: event.target.checked }))}
                            />
                            <Typography>Active</Typography>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading} variant="contained">
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
