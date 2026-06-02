import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import {
    Boxes,
    AlertTriangle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const GET_INVENTORY = gql`
    query GetInventory {
        inventories {
            edges {
                node {
                    variantId
                    quantityOnHand
                    quantityReserved
                    quantityAvailable
                    reorderPoint
                }
            }
        }
    }
`;

const StockBadge = ({ qty }: { qty: number }) => {
    if (qty <= 0) {
        return (
            <Badge
                variant="outline"
                className="bg-red-50 text-red-600 border-red-200 gap-1"
            >
                <AlertTriangle className="w-3 h-3" />
                Out of stock
            </Badge>
        );
    }

    if (qty <= 10) {
        return (
            <Badge
                variant="outline"
                className="bg-amber-50 text-amber-700 border-amber-200"
            >
                Low ({qty})
            </Badge>
        );
    }

    return (
        <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
        >
            {qty} in stock
        </Badge>
    );
};

export const InventoryPage = () => {
    const { data, loading, error } = useQuery(GET_INVENTORY);

    const items =
        (data as any)?.inventories?.edges?.map(
            (e: any) => e.node
        ) ?? [];

    console.log(data);
    console.log(error);

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Inventory
                    </h1>

                    <p className="text-sm text-gray-500 mt-0.5">
                        Track stock levels across all variants
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                            <th className="text-left px-6 py-3 font-semibold text-gray-600">
                                Variant ID
                            </th>

                            <th className="text-left px-6 py-3 font-semibold text-gray-600">
                                On Hand
                            </th>

                            <th className="text-left px-6 py-3 font-semibold text-gray-600">
                                Reserved
                            </th>

                            <th className="text-left px-6 py-3 font-semibold text-gray-600">
                                Available
                            </th>

                            <th className="text-left px-6 py-3 font-semibold text-gray-600">
                                Reorder Point
                            </th>

                            <th className="text-left px-6 py-3 font-semibold text-gray-600">
                                Status
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading &&
                            Array.from({ length: 8 }).map((_, i) => (
                                <tr key={i}>
                                    {Array.from({ length: 6 }).map(
                                        (_, j) => (
                                            <td
                                                key={j}
                                                className="px-6 py-4"
                                            >
                                                <Skeleton className="h-4 w-20" />
                                            </td>
                                        )
                                    )}
                                </tr>
                            ))}

                        {error && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-6 py-12 text-center text-red-500"
                                >
                                    Failed to load inventory
                                </td>
                            </tr>
                        )}

                        {!loading && items.length === 0 && !error && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-6 py-12 text-center"
                                >
                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                        <Boxes className="w-8 h-8" />
                                        <p>No inventory records found</p>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {items.map((item: any) => (
                            <tr
                                key={item.variantId}
                                className="border-b border-gray-50 hover:bg-gray-50"
                            >
                                <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                    {item.variantId}
                                </td>

                                <td className="px-6 py-4">
                                    {item.quantityOnHand}
                                </td>

                                <td className="px-6 py-4">
                                    {item.quantityReserved}
                                </td>

                                <td className="px-6 py-4">
                                    {item.quantityAvailable}
                                </td>

                                <td className="px-6 py-4">
                                    {item.reorderPoint}
                                </td>

                                <td className="px-6 py-4">
                                    <StockBadge
                                        qty={item.quantityAvailable}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};