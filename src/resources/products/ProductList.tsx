import * as React from 'react';
import { useState } from 'react';
import {
    List,
    Datagrid,
    TextField,
    NumberField,
    SearchInput,
    TopToolbar,
    ExportButton,
    useRecordContext,
    useNotify,
    useRefresh,
    useGetList,
    SelectInput,
} from 'react-admin';
import {
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Avatar,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { ProductCreateDialog } from './ProductCreateDialog';
import { ProductEditDialog } from './ProductEditDialog';

const GQL_URL = '/graphql';

const DELETE_PRODUCT_MUTATION = `
    mutation DeleteProduct($id: ID!) {
        deleteProduct(id: $id)
    }
`;

// ─── Category filter input (loads categories dynamically) ─────────────────────

const CategoryFilterInput = (props: any) => {
    const { data: categories = [] } = useGetList('categories', {
        pagination: { page: 1, perPage: 200 },
        sort: { field: 'name', order: 'ASC' },
    });

    const choices = categories.map((c: any) => ({ id: c.id, name: c.name }));

    return (
        <SelectInput
            {...props}
            choices={choices}
            emptyText="All Categories"
            emptyValue=""
            label="Category"
            sx={{ minWidth: 200 }}
        />
    );
};

const productFilters = [
    <SearchInput source="q" alwaysOn key="q" />,
    <CategoryFilterInput source="categoryId" alwaysOn key="categoryId" />,
];

// ─── Confirm Delete Dialog ────────────────────────────────────────────────────

interface ConfirmDeleteDialogProps {
    open: boolean;
    productName: string;
    loading: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmDeleteDialog = ({
    open,
    productName,
    loading,
    onConfirm,
    onCancel,
}: ConfirmDeleteDialogProps) => (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningAmberIcon color="warning" />
            Delete Product
        </DialogTitle>
        <DialogContent>
            <Typography>
                Are you sure you want to delete <strong>{productName}</strong>? This action cannot be undone.
            </Typography>
        </DialogContent>
        <DialogActions>
            <Button onClick={onCancel} disabled={loading}>Cancel</Button>
            <Button onClick={onConfirm} disabled={loading} variant="contained" color="error">
                {loading ? 'Deleting…' : 'Delete'}
            </Button>
        </DialogActions>
    </Dialog>
);

// ─── Delete Button (per row) ──────────────────────────────────────────────────

const DeleteProductButton = () => {
    const record = useRecordContext();
    const notify = useNotify();
    const refresh = useRefresh();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    if (!record) return null;

    const handleDelete = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(GQL_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    query: DELETE_PRODUCT_MUTATION,
                    variables: { id: record.id },
                }),
            });
            const json = await response.json();
            if (json.errors?.length) throw new Error(json.errors[0].message);
            notify('Product deleted', { type: 'success' });
            refresh();
        } catch (err: any) {
            notify(err?.message ?? 'Failed to delete product', { type: 'error' });
        } finally {
            setLoading(false);
            setOpen(false);
        }
    };

    return (
        <>
            <Tooltip title="Delete product">
                <IconButton
                    size="small"
                    color="error"
                    onClick={e => { e.stopPropagation(); setOpen(true); }}
                >
                    <DeleteIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            <ConfirmDeleteDialog
                open={open}
                productName={record.name}
                loading={loading}
                onConfirm={handleDelete}
                onCancel={() => setOpen(false)}
            />
        </>
    );
};

// ─── Row actions ──────────────────────────────────────────────────────────────

interface RowActionsProps { label?: string; }
const RowActions = (_props: RowActionsProps) => {
    const record = useRecordContext();
    if (!record) return null;
    return (
        <Box display="flex" justifyContent="flex-end" alignItems="center" gap={1}>
            <ProductEditDialog productId={String(record.id)} />
            <DeleteProductButton />
        </Box>
    );
};

// ─── Product image ────────────────────────────────────────────────────────────

interface ProductImageFieldProps { label?: string; sortable?: boolean; }
const ProductImageField = (_props: ProductImageFieldProps) => {
    const record = useRecordContext();
    const src = Array.isArray(record?.images) ? record.images[0] : record?.images;
    return (
        <Avatar
            src={src ?? undefined}
            alt={record?.name ?? ''}
            variant="rounded"
            sx={{ width: 48, height: 48, borderRadius: '8px' }}
        />
    );
};

// ─── Toolbar ─────────────────────────────────────────────────────────────────

const ListActions = () => (
    <TopToolbar>
        <ProductCreateDialog />
        <ExportButton />
    </TopToolbar>
);

// ─── List ─────────────────────────────────────────────────────────────────────

export const ProductList = () => (
    <List
        resource="products"
        filters={productFilters}
        actions={<ListActions />}
        perPage={25}
    >
        <Datagrid
            rowClick={false}
            bulkActionButtons={false}
            sx={{
                '& .RaDatagrid-row': { height: '68px' },
                '& .RaDatagrid-rowCell': { verticalAlign: 'middle', padding: '8px 16px' },
                '& .RaDatagrid-headerCell': { padding: '12px 16px', fontWeight: 600 },
            }}
        >
            <ProductImageField label="Image" sortable={false} />
            <TextField source="name" />
            <TextField source="sku" label="SKU" />
            <NumberField source="stock" />
            <NumberField source="price" options={{ style: 'currency', currency: 'USD' }} />
            <RowActions label="" />
        </Datagrid>
    </List>
);