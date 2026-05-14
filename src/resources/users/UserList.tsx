import * as React from 'react';
import {
    List,
    Datagrid,
    TextField,
    EmailField,
    SearchInput,
    TopToolbar,
    ExportButton,
    FilterButton,
    useRecordContext,
} from 'react-admin';
import { Chip } from '@mui/material';

// Status badge
const StatusBadge = (_props: { label?: string }) => {
    const record = useRecordContext();
    if (!record?.status) return null;
    const active = String(record.status).toLowerCase() === 'active';
    return <Chip label={record.status} color={active ? 'success' : 'default'} size="small" />;
};

const userFilters = [
    <SearchInput source="q" alwaysOn key="q" />,
];

const ListActions = () => (
    <TopToolbar>
        <FilterButton />
        <ExportButton />
    </TopToolbar>
);

export const UserList = () => (
    <List
        resource="users"
        filters={userFilters}
        actions={<ListActions />}
        perPage={25}
    >
        <Datagrid rowClick={false} bulkActionButtons={false}>
            <EmailField source="email" />
            <TextField source="firstName" label="First Name" />
            <TextField source="username" />
            <StatusBadge label="Status" />
        </Datagrid>
    </List>
);