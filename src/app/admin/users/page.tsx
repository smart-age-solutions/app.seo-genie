"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { UserRole, UserStatus } from "@/types/database";
import { backendApi } from "@/lib/backend-api";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<{
    status?: UserStatus;
    role?: UserRole;
    search?: string;
  }>({});
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const isAdmin = session?.user.role === UserRole.ADMIN;

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const usersList = await backendApi.users.getAll(
        filter.status,
        filter.role
      );
      
      // Filter by search term if provided
      let filteredUsers = usersList;
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        filteredUsers = usersList.filter(
          (user: any) =>
            user.name?.toLowerCase().includes(searchLower) ||
            user.email?.toLowerCase().includes(searchLower)
        );
      }
      
      setUsers(filteredUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUpdateUser = async (userId: string, updates: { status?: UserStatus; role?: UserRole }) => {
    try {
      let updatedUser;
      
      if (updates.status) {
        updatedUser = await backendApi.users.updateStatus(userId, updates.status);
      }
      
      if (updates.role) {
        updatedUser = await backendApi.users.updateRole(userId, updates.role);
      }

      if (updatedUser) {
        setUsers(users.map((u) => (u.id === userId ? { ...u, ...updatedUser } : u)));
        setEditingUser(null);
      }
    } catch (error) {
      console.error("Error updating user:", error);
      alert(error instanceof Error ? error.message : "Error updating user");
    }
  };

  const getStatusBadge = (status: UserStatus) => {
    const styles = {
      [UserStatus.ACTIVE]: "bg-green-500",
      [UserStatus.INACTIVE]: "bg-red-500",
    };
    return styles[status] || "bg-gray-500";
  };

  const getRoleBadge = (role: UserRole) => {
    const styles = {
      [UserRole.ADMIN]: "bg-red-500",
      [UserRole.USER]: "bg-blue-500",
    };
    return styles[role] || "bg-gray-500";
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-2">
          Manage Users
        </h1>
        <p className="text-white/70">
          View and manage all system users.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-6 border border-white/10">
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search by name or email..."
            className="flex-1 min-w-[200px] px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-accent-teal"
            value={filter.search || ""}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          />
          <select
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-teal"
            value={filter.status || ""}
            onChange={(e) => setFilter({ ...filter, status: e.target.value as UserStatus || undefined })}
          >
            <option value="">All statuses</option>
            <option value={UserStatus.ACTIVE}>Active</option>
            <option value={UserStatus.INACTIVE}>Inactive</option>
          </select>
          <select
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-teal"
            value={filter.role || ""}
            onChange={(e) => setFilter({ ...filter, role: e.target.value as UserRole || undefined })}
          >
            <option value="">All roles</option>
            <option value={UserRole.ADMIN}>Admin</option>
            <option value={UserRole.USER}>User</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="text-center py-12">
          <span className="star-spinner text-white">★</span>
          <p className="text-white/70 mt-4">Loading users...</p>
        </div>
      ) : (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-4 text-white/70 font-medium">User</th>
                <th className="text-left px-6 py-4 text-white/70 font-medium">Role</th>
                <th className="text-left px-6 py-4 text-white/70 font-medium">Status</th>
                <th className="text-right px-6 py-4 text-white/70 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.image ? (
                        <Image
                          src={user.image}
                          alt={user.name || "User"}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-accent-purple flex items-center justify-center text-white font-bold">
                          {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium">{user.name || "No name"}</p>
                        <p className="text-white/50 text-sm">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-bold text-white rounded ${getRoleBadge(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-bold text-white rounded ${getStatusBadge(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {user.id !== session?.user.id && (
                      <button
                        onClick={() => setEditingUser(user)}
                        className="px-3 py-1 text-sm text-accent-teal hover:bg-accent-teal/20 rounded transition-colors"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="text-center py-12">
              <p className="text-white/70">No users found.</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-primary-dark rounded-xl p-6 w-full max-w-md border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">
              Edit User
            </h3>

            <div className="flex items-center gap-3 mb-6">
              {editingUser.image ? (
                <Image
                  src={editingUser.image}
                  alt={editingUser.name || "User"}
                  width={48}
                  height={48}
                  className="rounded-full"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-accent-purple flex items-center justify-center text-white font-bold">
                  {editingUser.name?.charAt(0) || editingUser.email?.charAt(0) || "U"}
                </div>
              )}
              <div>
                <p className="text-white font-medium">{editingUser.name}</p>
                <p className="text-white/50 text-sm">{editingUser.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Status */}
              <div>
                <label className="block text-white/70 text-sm mb-2">Status</label>
                <select
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  value={editingUser.status}
                  onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as UserStatus })}
                >
                  <option value={UserStatus.ACTIVE}>Active</option>
                  <option value={UserStatus.INACTIVE}>Inactive</option>
                </select>
              </div>

              {/* Role (Admin only) */}
              {isAdmin && (
                <div>
                  <label className="block text-white/70 text-sm mb-2">Role</label>
                  <select
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                  >
                    <option value={UserRole.USER}>User</option>
                    <option value={UserRole.ADMIN}>Admin</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateUser(editingUser.id, {
                  status: editingUser.status,
                  role: isAdmin ? editingUser.role : undefined,
                })}
                className="flex-1 px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
