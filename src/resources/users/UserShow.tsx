import * as React from 'react';
import {
    Show,
    SimpleShowLayout,
    TextField,
    EmailField,
    DateField,
    BooleanField,
    TopToolbar,
    EditButton,
} from 'react-admin';

const UserShowActions = () => (
    <TopToolbar>
        <EditButton />
    </TopToolbar>
);

export const UserShow = () => (
    <Show actions={<UserShowActions />}>
        <SimpleShowLayout>
            <TextField source="id" />
            <TextField source="first_name" label="First Name" />
            <TextField source="last_name" label="Last Name" />
            <EmailField source="email" />
            <TextField source="role" />
            <BooleanField source="is_active" label="Active" />
            <DateField source="created_at" label="Created At" showTime />
            <DateField source="updated_at" label="Updated At" showTime />
        </SimpleShowLayout>
    </Show>
);