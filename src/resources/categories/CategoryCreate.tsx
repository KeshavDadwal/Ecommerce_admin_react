import * as React from 'react';
import {
    Create,
    SimpleForm,
    TextInput,
    BooleanInput,
    NumberInput,
    required,
    useNotify,
    useRedirect,
} from 'react-admin';
import { useState } from 'react';
import { Button, Box, Typography } from '@mui/material';

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

export const CategoryCreate = () => {
    const notify = useNotify();
    const redirect = useRedirect();
    const [imageFile, setImageFile] = useState<File | null>(null);

    const handleSave = async (data: any) => {
        const token = localStorage.getItem('access_token');

        const operations = JSON.stringify({
            query: CREATE_CATEGORY_WITH_IMAGE,
            variables: {
                input: {
                    name: data.name,
                    slug: data.slug,
                    parentId: data.parentId || 'd4a9078e-814a-4a8e-a716-1bb29aa40e6c',
                    SortOrder: data.sortOrder ?? 0,
                    IsActive: data.isActive ?? true,
                    ...(data.description ? { description: data.description } : {}),
                    ...(imageFile ? { image: null } : {}),
                },
            },
        });

        const map = imageFile ? JSON.stringify({ '0': ['variables.input.image'] }) : null;

        let body: FormData | string;
        let headers: Record<string, string> = {
            'ngrok-skip-browser-warning': 'true',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        if (imageFile && map) {
            const form = new FormData();
            form.append('operations', operations);
            form.append('map', map);
            form.append('0', imageFile);
            body = form;
        } else {
            body = operations;
            headers['Content-Type'] = 'application/json';
        }

        try {
            const res = await fetch(GQL_URL, { method: 'POST', headers, body });
            const json = await res.json();
            if (json.errors?.length) throw new Error(json.errors[0].message);
            notify('Category created successfully', { type: 'success' });
            redirect('/categories/create');
        } catch (err: any) {
            notify(err.message ?? 'Failed to create category', { type: 'error' });
        }
    };

    return (
        <Create>
            <SimpleForm onSubmit={handleSave}>
                <TextInput source="name" validate={required()} />
                <TextInput source="slug" validate={required()} helperText="URL-friendly identifier e.g. my-category" />
                <TextInput source="description" multiline rows={3} />
                <TextInput source="parentId" label="Parent Category ID" />
                <NumberInput source="sortOrder" label="Sort Order" defaultValue={0} validate={required()} />
                <BooleanInput source="isActive" label="Active" defaultValue={true} />
                <Box mt={1}>
                    <Typography variant="caption" color="textSecondary">Image (optional)</Typography>
                    <br />
                    <input
                        type="file"
                        accept="image/*"
                        onChange={e => setImageFile(e.target.files?.[0] ?? null)}
                    />
                    {imageFile && (
                        <Typography variant="caption" display="block" mt={0.5}>
                            Selected: {imageFile.name}
                        </Typography>
                    )}
                </Box>
            </SimpleForm>
        </Create>
    );
};