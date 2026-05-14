import * as React from "react";
import { useState, useContext, createContext, useMemo } from "react";
import {
    List,
    Datagrid,
    TextField,
    TopToolbar,
    ExportButton,
    useRecordContext,
    useNotify,
    useRefresh,
    useListContext,
    ListContextProvider,
    RecordContextProvider,
} from "react-admin";
import { CategoryCreateDialog } from "./CategoryCreateDialog";
import { clearCategoriesCache } from "../../dataProvider";
import {
    IconButton,
    Tooltip,
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField as MuiTextField,
    Switch,
    Typography,
    Avatar,
    Chip,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AddIcon from "@mui/icons-material/Add";

const GQL_URL = "/graphql";

const UPDATE_CATEGORY_MUTATION = `
    mutation UpdateCategory($id: ID!, $input: UpdateCategoryInput!) {
        updateCategory(id: $id, input: $input) {
            id
            name
            slug
            description
        }
    }
`;

const DELETE_CATEGORY_MUTATION = `
    mutation DeleteCategory($id: ID!) {
        deleteCategory(id: $id)
    }
`;

const CREATE_CATEGORY_MUTATION = `
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

// ─── Context to share the full (unfiltered) category list ─────────────────────
// Needed because the Datagrid renders inside a ListContextProvider that only
// contains top-level rows. SubcategoryPanel and the count chip still need all.
const AllCategoriesContext = createContext<any[]>([]);

// ─── Error helper ─────────────────────────────────────────────────────────────

const getFriendlyDeleteError = (msg: string): string => {
    if (
        msg.includes("foreign key") ||
        msg.includes("23503") ||
        msg.includes("parent_id") ||
        msg.includes("categories_parent_id_fkey")
    ) {
        return "Cannot delete this category — it has subcategories. Delete or move them first.";
    }
    return msg || "Failed to delete category";
};

// ─── Edit Dialog ──────────────────────────────────────────────────────────────
interface EditDialogProps {
    open: boolean;
    record: any;
    onClose: () => void;
}

const CategoryEditDialog = ({ open, record, onClose }: EditDialogProps) => {
    const notify = useNotify();
    const refresh = useRefresh();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: record?.name ?? "",
        slug: record?.slug ?? "",
        description: record?.description ?? "",
        sortOrder: record?.sortOrder ?? 0,
        isActive: record?.isActive ?? true,
    });

    React.useEffect(() => {
        if (record) {
            setForm({
                name: record.name ?? "",
                slug: record.slug ?? "",
                description: record.description ?? "",
                sortOrder: record.sortOrder ?? 0,
                isActive: record.isActive ?? true,
            });
        }
    }, [record?.id]);

    const handleChange =
        (field: string) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setForm(prev => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async () => {
        if (!form.name.trim() || !form.slug.trim()) {
            notify("Name and slug are required", { type: "warning" });
            return;
        }
        setLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(GQL_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "ngrok-skip-browser-warning": "true",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    query: UPDATE_CATEGORY_MUTATION,
                    variables: {
                        id: record.id,
                        input: {
                            name: form.name,
                            slug: form.slug,
                            sortOrder: Number(form.sortOrder),
                            isActive: form.isActive,
                            ...(form.description ? { description: form.description } : {}),
                        },
                    },
                }),
            });
            const json = await response.json();
            if (json.errors?.length) throw new Error(json.errors[0].message);
            clearCategoriesCache();
            notify("Category updated successfully", { type: "success" });
            refresh();
            onClose();
        } catch (err: any) {
            notify(err?.message ?? "Failed to update category", { type: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Edit Category</DialogTitle>
            <DialogContent>
                <Box display="grid" gap={2} mt={1}>
                    <MuiTextField label="Name" value={form.name} onChange={handleChange("name")} required fullWidth />
                    <MuiTextField
                        label="Slug"
                        value={form.slug}
                        onChange={handleChange("slug")}
                        required
                        helperText="URL-friendly identifier e.g. my-category"
                        fullWidth
                    />
                    <MuiTextField
                        label="Description"
                        value={form.description}
                        onChange={handleChange("description")}
                        multiline
                        rows={3}
                        fullWidth
                    />
                    {record?.imageUrl && (
                        <Box>
                            <Typography variant="body2" gutterBottom>Current Image</Typography>
                            <Avatar src={record.imageUrl} variant="rounded" sx={{ width: 64, height: 64, borderRadius: "8px" }} />
                        </Box>
                    )}
                    <MuiTextField
                        label="Sort Order"
                        type="number"
                        value={form.sortOrder}
                        onChange={e => setForm(prev => ({ ...prev, sortOrder: Number(e.target.value) }))}
                        fullWidth
                    />
                    <Box display="flex" alignItems="center" gap={1}>
                        <Switch checked={form.isActive} onChange={e => setForm(prev => ({ ...prev, isActive: e.target.checked }))} />
                        <Typography>Active</Typography>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} disabled={loading} variant="outlined">Cancel</Button>
                <Button onClick={handleSubmit} disabled={loading} variant="contained">
                    {loading ? "Saving…" : "Save"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────
interface ConfirmDeleteProps {
    open: boolean;
    recordName: string;
    loading: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmDeleteDialog = ({ open, recordName, loading, onConfirm, onCancel }: ConfirmDeleteProps) => (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 1 }}>
            <WarningAmberIcon color="error" />
            Delete Category
        </DialogTitle>
        <DialogContent>
            <Typography variant="body2" color="text.secondary">
                Are you sure you want to delete <strong>"{recordName}"</strong>? This action cannot be undone.
            </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onCancel} disabled={loading} variant="outlined">Cancel</Button>
            <Button onClick={onConfirm} disabled={loading} variant="contained" color="error">
                {loading ? "Deleting…" : "Delete"}
            </Button>
        </DialogActions>
    </Dialog>
);

// ─── Add Subcategory Dialog ───────────────────────────────────────────────────
interface AddSubcategoryDialogProps {
    open: boolean;
    parentId: string;
    parentName: string;
    onClose: () => void;
}

const AddSubcategoryDialog = ({ open, parentId, parentName, onClose }: AddSubcategoryDialogProps) => {
    const notify = useNotify();
    const refresh = useRefresh();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ name: "", slug: "", description: "", sortOrder: 0, isActive: true });

    const handleChange =
        (field: string) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setForm(prev => ({ ...prev, [field]: e.target.value }));

    const handleClose = () => {
        setForm({ name: "", slug: "", description: "", sortOrder: 0, isActive: true });
        onClose();
    };

    const handleSubmit = async () => {
        if (!form.name.trim() || !form.slug.trim()) {
            notify("Name and slug are required", { type: "warning" });
            return;
        }
        setLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(GQL_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "ngrok-skip-browser-warning": "true",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    query: CREATE_CATEGORY_MUTATION,
                    variables: {
                        input: {
                            name: form.name,
                            slug: form.slug,
                            parentId,
                            SortOrder: form.sortOrder,
                            IsActive: form.isActive,
                            ...(form.description ? { description: form.description } : {}),
                        },
                    },
                }),
            });
            const json = await response.json();
            if (json.errors?.length) throw new Error(json.errors[0].message);
            clearCategoriesCache();
            notify("Subcategory created successfully", { type: "success" });
            refresh();
            handleClose();
        } catch (err: any) {
            notify(err?.message ?? "Failed to create subcategory", { type: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
            <DialogTitle>
                Add Subcategory
                <Typography variant="body2" color="text.secondary" mt={0.5}>
                    Under: <strong>{parentName}</strong>
                </Typography>
            </DialogTitle>
            <DialogContent>
                <Box display="grid" gap={2} mt={1}>
                    <MuiTextField label="Name" value={form.name} onChange={handleChange("name")} required fullWidth />
                    <MuiTextField
                        label="Slug"
                        value={form.slug}
                        onChange={handleChange("slug")}
                        required
                        helperText="URL-friendly identifier e.g. my-subcategory"
                        fullWidth
                    />
                    <MuiTextField
                        label="Description"
                        value={form.description}
                        onChange={handleChange("description")}
                        multiline
                        rows={2}
                        fullWidth
                    />
                    <MuiTextField
                        label="Sort Order"
                        type="number"
                        value={form.sortOrder}
                        onChange={e => setForm(prev => ({ ...prev, sortOrder: Number(e.target.value) }))}
                        fullWidth
                    />
                    <Box display="flex" alignItems="center" gap={1}>
                        <Switch checked={form.isActive} onChange={e => setForm(prev => ({ ...prev, isActive: e.target.checked }))} />
                        <Typography>Active</Typography>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={handleClose} disabled={loading} variant="outlined">Cancel</Button>
                <Button onClick={handleSubmit} disabled={loading} variant="contained">
                    {loading ? "Creating…" : "Create"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// ─── Shared delete hook ───────────────────────────────────────────────────────
const useDeleteCategory = () => {
    const notify = useNotify();
    const refresh = useRefresh();

    const deleteCategory = async (id: string, onSuccess?: () => void) => {
        const token = localStorage.getItem("access_token");
        const response = await fetch(GQL_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ query: DELETE_CATEGORY_MUTATION, variables: { id } }),
        });
        const json = await response.json();
        if (json.errors?.length) throw new Error(json.errors[0].message);
        clearCategoriesCache();
        notify("Category deleted", { type: "success" });
        refresh();
        onSuccess?.();
    };

    return { deleteCategory, notify };
};

// ─── Edit button ──────────────────────────────────────────────────────────────
const EditCategoryButton = ({ record: propRecord }: { record?: any }) => {
    const ctxRecord = useRecordContext();
    const record = propRecord ?? ctxRecord;
    const [open, setOpen] = useState(false);
    if (!record) return null;
    return (
        <>
            <Tooltip title="Edit">
                <IconButton size="small" color="primary" onClick={e => { e.stopPropagation(); setOpen(true); }}>
                    <EditIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            <CategoryEditDialog open={open} record={record} onClose={() => setOpen(false)} />
        </>
    );
};

// ─── Delete button ────────────────────────────────────────────────────────────
const DeleteCategoryButton = ({ record: propRecord }: { record?: any }) => {
    const ctxRecord = useRecordContext();
    const record = propRecord ?? ctxRecord;
    const { deleteCategory, notify } = useDeleteCategory();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    if (!record) return null;

    const handleDelete = async () => {
        setLoading(true);
        try {
            await deleteCategory(record.id, () => setOpen(false));
        } catch (err: any) {
            notify(getFriendlyDeleteError(err?.message ?? ""), { type: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Tooltip title="Delete">
                <IconButton size="small" color="error" onClick={e => { e.stopPropagation(); setOpen(true); }}>
                    <DeleteIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            <ConfirmDeleteDialog
                open={open}
                recordName={record.name}
                loading={loading}
                onConfirm={handleDelete}
                onCancel={() => setOpen(false)}
            />
        </>
    );
};

// ─── Add Subcategory button ───────────────────────────────────────────────────
const AddSubcategoryButton = () => {
    const record = useRecordContext();
    const [open, setOpen] = useState(false);
    if (!record) return null;
    return (
        <>
            <Tooltip title="Add Subcategory">
                <IconButton size="small" onClick={e => { e.stopPropagation(); setOpen(true); }}>
                    <AddIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            <AddSubcategoryDialog
                open={open}
                parentId={record.id}
                parentName={record.name}
                onClose={() => setOpen(false)}
            />
        </>
    );
};

// ─── Row actions ──────────────────────────────────────────────────────────────
interface RowActionsProps { label?: string; }
const RowActions = (_props: RowActionsProps) => (
    <Box display="flex" gap={0.5} justifyContent="flex-end">
        <AddSubcategoryButton />
        <EditCategoryButton />
        <DeleteCategoryButton />
    </Box>
);

// ─── Image cell ───────────────────────────────────────────────────────────────
interface CategoryImageFieldProps { label?: string; sortable?: boolean; }
const CategoryImageField = (_props: CategoryImageFieldProps) => {
    const record = useRecordContext();
    return (
        <Avatar
            src={record?.imageUrl ?? undefined}
            alt={record?.name ?? ""}
            variant="rounded"
            sx={{ width: 48, height: 48, borderRadius: "8px" }}
        />
    );
};

// ─── Subcategory count chip (reads from AllCategoriesContext) ─────────────────
interface SubcategoryCountFieldProps { label?: string; sortable?: boolean; }
const SubcategoryCountField = (_props: SubcategoryCountFieldProps) => {
    const record = useRecordContext();
    const allCategories = useContext(AllCategoriesContext);
    const count = allCategories.filter((c: any) => c.parentId === record?.id).length;
    if (!count) return null;
    return (
        <Chip
            label={`${count} sub${count === 1 ? "" : "s"}`}
            size="small"
            variant="outlined"
            color="primary"
        />
    );
};

// ─── Subcategory expand panel (reads from AllCategoriesContext) ───────────────
const SubcategoryPanel = () => {
    const record = useRecordContext();
    const allCategories = useContext(AllCategoriesContext);
    const subcategories = allCategories.filter((c: any) => c.parentId === record?.id);

    return (
        <Box
            sx={{
                pl: 7,
                pr: 3,
                py: 2,
                bgcolor: "action.hover",
                borderTop: "1px solid",
                borderColor: "divider",
            }}
        >
            <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
                Subcategories ({subcategories.length})
            </Typography>

            {subcategories.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    No subcategories yet.
                </Typography>
            ) : (
                <Table
                    size="small"
                    sx={{
                        bgcolor: "background.paper",
                        borderRadius: 1,
                        overflow: "hidden",
                        "& td, & th": { borderColor: "divider" },
                    }}
                >
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600, width: 60 }}>Image</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Slug</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {subcategories.map((sub: any) => (
                            <TableRow key={sub.id} sx={{ "&:last-child td": { border: 0 } }}>
                                <TableCell>
                                    <Avatar
                                        src={sub.imageUrl ?? undefined}
                                        alt={sub.name ?? ""}
                                        variant="rounded"
                                        sx={{ width: 36, height: 36, borderRadius: "6px" }}
                                    />
                                </TableCell>
                                <TableCell>{sub.name}</TableCell>
                                <TableCell>{sub.slug}</TableCell>
                                <TableCell>{sub.description}</TableCell>
                                <TableCell align="right">
                                    <RecordContextProvider value={sub}>
                                        <Box display="flex" gap={0.5} justifyContent="flex-end">
                                            <EditCategoryButton record={sub} />
                                            <DeleteCategoryButton record={sub} />
                                        </Box>
                                    </RecordContextProvider>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </Box>
    );
};

// ─── Datagrid wrapper ─────────────────────────────────────────────────────────
// Splits full list into top-level vs children.
// Top-level rows go into the Datagrid via a new ListContextProvider.
// All rows are shared via AllCategoriesContext so panels/chips still work.
const CategoryDatagrid = () => {
    const listContext = useListContext<any>();
    const allCategories: any[] = listContext.data ?? [];

    // A category is a child if its parentId matches another category's id in the list
    const allIds = useMemo(() => new Set(allCategories.map((c: any) => c.id)), [allCategories]);
    const topLevel = useMemo(
        () => allCategories.filter((c: any) => !c.parentId || !allIds.has(c.parentId)),
        [allCategories, allIds]
    );

    const topLevelContext = useMemo(
        () => ({ ...listContext, data: topLevel, total: topLevel.length }),
        [listContext, topLevel]
    );

    return (
        <AllCategoriesContext.Provider value={allCategories}>
            <ListContextProvider value={topLevelContext}>
                <Datagrid
                    rowClick={false}
                    bulkActionButtons={false}
                    isRowExpandable={(record: any) =>
                        allCategories.some((c: any) => c.parentId === record.id)
                    }
                    expand={<SubcategoryPanel />}
                    expandSingle
                    sx={{
                        "& .RaDatagrid-row": { height: "68px" },
                        "& .RaDatagrid-rowCell": { verticalAlign: "middle", padding: "8px 16px" },
                        "& .RaDatagrid-headerCell": { padding: "12px 16px", fontWeight: 600 },
                        "& .RaDatagrid-expandedPanel > td": { padding: 0 },
                    }}
                >
                    <CategoryImageField label="Image" sortable={false} />
                    <TextField source="name" />
                    <TextField source="slug" />
                    <TextField source="description" />
                    <SubcategoryCountField label="Subcategories" sortable={false} />
                    <RowActions label="" />
                </Datagrid>
            </ListContextProvider>
        </AllCategoriesContext.Provider>
    );
};

// ─── Toolbar ──────────────────────────────────────────────────────────────────
const ListActions = () => (
    <TopToolbar>
        <CategoryCreateDialog />
        <ExportButton />
    </TopToolbar>
);

// ─── List ─────────────────────────────────────────────────────────────────────
export const CategoryList = () => (
    <List perPage={200} title="Categories" actions={<ListActions />}>
        <CategoryDatagrid />
    </List>
);