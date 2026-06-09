import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const CREATE_BRAND = gql`
    mutation CreateBrand($input: CreateBrandInput!) {
        createBrand(input: $input) {
            id
            name
        }
    }
`;

export const BrandCreatePage = () => {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: '',
        description: '',
        isActive: true,
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const [createBrand, { loading }] = useMutation(CREATE_BRAND);

    const handleChange = (field: string) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => setForm(prev => ({ ...prev, [field]: e.target.value }));

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setImageFile(file);
        if (file) setImagePreview(URL.createObjectURL(file));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        setSubmitError(null);

        try {
            const token = localStorage.getItem('access_token');

            const inputPayload: any = {
                name: form.name.trim(),
                isActive: form.isActive,
                ...(form.description.trim() ? { description: form.description.trim() } : {}),
                ...(imageFile ? { image: null } : {}),
            };

            if (imageFile) {
                const operations = JSON.stringify({
                    query: `mutation CreateBrand($input: CreateBrandInput!) {
                        createBrand(input: $input) { id name }
                    }`,
                    variables: { input: inputPayload },
                });
                const map = JSON.stringify({ '0': ['variables.input.image'] });
                const formData = new FormData();
                formData.append('operations', operations);
                formData.append('map', map);
                formData.append('0', imageFile);

                const res = await fetch('/graphql', {
                    method: 'POST',
                    headers: {
                        'ngrok-skip-browser-warning': 'true',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: formData,
                });
                const json = await res.json();
                if (json.errors?.length) throw new Error(json.errors[0].message);
            } else {
                await createBrand({ variables: { input: inputPayload } });
            }

            navigate('/brands');
        } catch (err: any) {
            setSubmitError(err?.message ?? 'Failed to create brand');
        }
    };

    return (
        <div className="p-8 max-w-2xl">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/brands')}
                className="mb-6 gap-2 text-gray-600 -ml-2"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Brands
            </Button>

            <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Brand</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <h2 className="font-semibold text-gray-800">Brand Details</h2>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={form.name}
                            onChange={handleChange('name')}
                            placeholder="Brand name"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Description</label>
                        <textarea
                            value={form.description}
                            onChange={handleChange('description')}
                            rows={3}
                            placeholder="Brand description"
                            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Status</label>
                        <div className="flex items-center gap-2 h-10">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={form.isActive}
                                onChange={e => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                                className="rounded"
                            />
                            <label htmlFor="isActive" className="text-sm text-gray-600">Active</label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Image (optional)</label>

                        {imagePreview ? (
                            <div className="flex items-center gap-3">
                                <img
                                    src={imagePreview}
                                    alt="Brand preview"
                                    className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                                />
                                <span className="text-xs text-indigo-600 font-medium">{imageFile?.name}</span>
                            </div>
                        ) : (
                            <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center border border-dashed border-gray-300">
                                <ImageIcon className="w-5 h-5 text-gray-400" />
                            </div>
                        )}

                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        />
                    </div>
                </div>

                {submitError && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                        {submitError}
                    </div>
                )}

                <div className="flex gap-3">
                    <Button
                        type="submit"
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {loading ? 'Creating…' : 'Create Brand'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => navigate('/brands')}>
                        Cancel
                    </Button>
                </div>
            </form>
        </div>
    );
};