import { useState } from 'react';
import { useLogin } from '@refinedev/core';
import { Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const LoginPage = () => {
    const { mutate: login, isPending: isLoading } = useLogin();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        login(
            { email, password },
            {
                onError: (err: any) => {
                    setError(err?.message ?? 'Login failed');
                },
            }
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mb-3">
                            <Package className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">EcomAdmin</h1>
                        <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Email</label>
                            <Input
                                type="email"
                                placeholder="admin@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                                className="w-full"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Password</label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                className="w-full"
                            />
                        </div>

                        {error && (
                            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {isLoading ? 'Signing in…' : 'Sign in'}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};