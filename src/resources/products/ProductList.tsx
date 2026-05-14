import * as React from 'react';
import {
    List,
    Datagrid,
    TextField,
    NumberField,
    SearchInput,
    TopToolbar,
    ExportButton,
    FilterButton,
} from 'react-admin';

const productFilters = [
    <SearchInput source="q" alwaysOn key="q" />,
];

const ListActions = () => (
    <TopToolbar>
        <FilterButton />
        <ExportButton />
    </TopToolbar>
);

export const ProductList = () => (
    <List
        resource="products"
        filters={productFilters}
        actions={<ListActions />}
        perPage={25}
    >
        <Datagrid rowClick={false} bulkActionButtons={false}>
            <TextField source="name" />
            <TextField source="sku" label="SKU" />
            <NumberField source="stock" />
            <NumberField
                source="price"
                options={{ style: 'currency', currency: 'USD' }}
            />
        </Datagrid>
    </List>
);