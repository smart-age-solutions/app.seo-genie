"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { UserRole, UserStatus } from "@/types/database";

interface Stats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        const users = Array.isArray(data.users) ? data.users : [];

        setStats({
          totalUsers: users.length,
          activeUsers: users.filter((u: { status: UserStatus }) => u.status === UserStatus.APPROVED).length,
          blockedUsers: users.filter((u: { status: UserStatus }) => u.status === UserStatus.BLOCKED).length,
        });
      } else {
        console.error("Failed to fetch users:", response.status);
        setStats({ totalUsers: 0, activeUsers: 0, blockedUsers: 0 });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      setStats({ totalUsers: 0, activeUsers: 0, blockedUsers: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  const isAdmin = session?.user.role === UserRole.ADMIN;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-2">
          Admin Dashboard
        </h1>
        <p className="text-white/70">
          Welcome, {session?.user.name}!{" "}
          <span className={`inline-block px-2 py-1 text-xs font-bold rounded ${
            isAdmin ? "bg-red-500" : "bg-blue-500"
          } text-white`}>
            {session?.user.role}
          </span>
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Total Users"
          value={stats?.totalUsers ?? "-"}
          icon="👥"
          color="bg-blue-500"
          isLoading={isLoading}
        />
        <StatsCard
          title="Active Users"
          value={stats?.activeUsers ?? "-"}
          icon="✅"
          color="bg-green-500"
          isLoading={isLoading}
        />
        <StatsCard
          title="Blocked"
          value={stats?.blockedUsers ?? "-"}
          icon="🚫"
          color="bg-red-500"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: string;
  color: string;
  isLoading: boolean;
}

function StatsCard({ title, value, icon, color, isLoading }: StatsCardProps) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/70 text-sm mb-1">{title}</p>
          <p className="text-3xl font-black text-white">
            {isLoading ? "..." : value}
          </p>
        </div>
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
