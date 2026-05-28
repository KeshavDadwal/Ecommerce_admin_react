import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, User, Shield, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const GET_USER = gql`
    query GetUser($id: ID!) {
        user(id: $id) {
            id
            email
            firstName
            lastName
            username
            phone
            role
            status
            createdAt
            updatedAt
        }
    }
`;

const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) => (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-gray-500" />
        </div>
        <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-sm text-gray-900 mt-0.5">{value || '—'}</p>
        </div>
    </div>
);

export const UserShowPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const { data, loading, error } = useQuery(GET_USER, {
        variables: { id },
        skip: !id,
    });

    const user = (data as any)?.user;

    return (
        <div className="p-8 max-w-2xl">
            {/* Back */}
            <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/users')}
                className="mb-6 gap-2 text-gray-600 hover:text-gray-900 -ml-2"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Users
            </Button>

            {loading && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-600">
                    Failed to load user details
                </div>
            )}

            {user && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {/* User header */}
                    <div className="px-6 py-6 border-b border-gray-100 flex items-center gap-4">
                        <Avatar className="w-16 h-16">
                            <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xl font-semibold">
                                {user.firstName?.charAt(0).toUpperCase() ?? user.email?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">
                                {[user.firstName, user.lastName].filter(Boolean).join(' ') || 'No name'}
                            </h1>
                            <p className="text-sm text-gray-500">{user.email}</p>
                            <div className="flex gap-2 mt-2">
                                <Badge
                                    variant="outline"
                                    className={
                                        user.status?.toLowerCase() === 'active'
                                            ? 'bg-green-100 text-green-700 border-green-200'
                                            : 'bg-gray-100 text-gray-600 border-gray-200'
                                    }
                                >
                                    {user.status}
                                </Badge>
                                <Badge variant="outline" className="capitalize">
                                    {user.role}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="px-6 py-2">
                        <InfoRow icon={Mail} label="Email" value={user.email} />
                        <InfoRow icon={User} label="Username" value={user.username} />
                        <InfoRow icon={Phone} label="Phone" value={user.phone} />
                        <InfoRow icon={Shield} label="Role" value={user.role} />
                        <InfoRow icon={Calendar} label="Created At" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString() : null} />
                        <InfoRow icon={Calendar} label="Updated At" value={user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : null} />
                    </div>
                </div>
            )}
        </div>
    );
};