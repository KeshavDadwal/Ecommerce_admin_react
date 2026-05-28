import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { Search, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const GET_USERS = gql`
  query GetUsers($first: Int, $after: String) {
    users(pagination: { first: $first, after: $after }) {
      edges {
        node {
          id
          email
          firstName
          lastName
          username
          phone
          role
          status
          createdAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const UsersPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);

  const { data, loading, error } = useQuery(GET_USERS, {
    variables: { first: 25, after: cursor },
  });

  const users = (data as any)?.users?.edges?.map((e: any) => e.node) ?? [];
  const pageInfo = (data as any)?.users?.pageInfo;

  const filtered = users.filter(
    (u: any) =>
      search === "" ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      u.username?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your platform users
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-6 py-3 font-semibold text-gray-600">
                Name
              </th>
              <th className="text-left px-6 py-3 font-semibold text-gray-600">
                Email
              </th>
              <th className="text-left px-6 py-3 font-semibold text-gray-600">
                Username
              </th>
              <th className="text-left px-6 py-3 font-semibold text-gray-600">
                Role
              </th>
              <th className="text-left px-6 py-3 font-semibold text-gray-600">
                Status
              </th>
              <th className="text-left px-6 py-3 font-semibold text-gray-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                  ))}
                </tr>
              ))}

            {error && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-red-500">
                  Failed to load users
                </td>
              </tr>
            )}

            {!loading && filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-gray-400"
                >
                  No users found
                </td>
              </tr>
            )}

            {filtered.map((user: any) => (
              <tr
                key={user.id}
                className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 font-medium text-gray-900">
                  {[user.firstName, user.lastName].filter(Boolean).join(" ") ||
                    "—"}
                </td>
                <td className="px-6 py-4 text-gray-600">{user.email}</td>
                <td className="px-6 py-4 text-gray-600">
                  {user.username || "—"}
                </td>
                <td className="px-6 py-4">
                  <Badge variant="outline" className="capitalize">
                    {user.role ?? "—"}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <Badge
                    className={
                      user.status?.toLowerCase() === "active"
                        ? "bg-green-100 text-green-700 border-green-200"
                        : "bg-gray-100 text-gray-600 border-gray-200"
                    }
                    variant="outline"
                  >
                    {user.status ?? "—"}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/users/${user.id}`)}
                    className="gap-1.5 text-gray-600 hover:text-indigo-600"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {pageInfo?.hasNextPage && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCursor(pageInfo.endCursor)}
            >
              Load more
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
