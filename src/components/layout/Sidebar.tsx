import { useNavigate, useLocation } from 'react-router-dom';
import { useLogout, useGetIdentity } from '@refinedev/core';
import {
    Users,
    Package,
    Tag,
    LogOut,
    LayoutDashboard,
    ChevronRight,
    Boxes,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Users', icon: Users, path: '/users' },
    { label: 'Products', icon: Package, path: '/products' },
    { label: 'Categories', icon: Tag, path: '/categories' },
    { label: 'Inventory', icon: Boxes, path: '/inventory' },
];

export const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { mutate: logout } = useLogout();
    const { data: identity } = useGetIdentity<{ name: string; email: string }>();

    return (
        <aside className="flex flex-col w-64 min-h-screen bg-white border-r border-gray-200 shadow-sm">
            {/* Logo */}
            <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                    <Package className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-gray-900 text-lg">EcomAdmin</span>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map(({ label, icon: Icon, path }) => {
                    const active = location.pathname === path ||
                        (path !== '/' && location.pathname.startsWith(path));
                    return (
                        <button
                            key={path}
                            onClick={() => navigate(path)}
                            className={cn(
                                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                                active
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            )}
                        >
                            <Icon className={cn('w-4 h-4', active ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600')} />
                            {label}
                            {active && <ChevronRight className="w-3 h-3 ml-auto text-indigo-400" />}
                        </button>
                    );
                })}
            </nav>

            <Separator />

            {/* User + Logout */}
            <div className="px-3 py-4 space-y-2">
                <div className="flex items-center gap-3 px-3 py-2">
                    <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-semibold">
                            {identity?.name?.charAt(0).toUpperCase() ?? 'A'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{identity?.name ?? 'Admin'}</p>
                        <p className="text-xs text-gray-500 truncate">{identity?.email ?? ''}</p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => logout()}
                    className="w-full justify-start gap-3 text-gray-600 hover:text-red-600 hover:bg-red-50"
                >
                    <LogOut className="w-4 h-4" />
                    Logout
                </Button>
            </div>
        </aside>
    );
};