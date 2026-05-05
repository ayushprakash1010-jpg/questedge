"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import { PageHeader } from "@/components/shared/page-header";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTablePagination,
  DataTableRow,
} from "@/components/shared/data-table";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface UsersResponse {
  data: User[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const ROLES = ["ADMIN", "HR", "HIRING_MANAGER", "INTERVIEWER", "VIEWER"];
const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState("VIEWER");
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?page=${page}`);
      const data: UsersResponse = await res.json();
      setUsers(data.data);
      setMeta(data.meta);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function openCreate() {
    setEditingUser(null);
    setFormName("");
    setFormEmail("");
    setFormRole("VIEWER");
    setFormError("");
    setDialogOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormError("");
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");

    try {
      const url = editingUser
        ? `/api/admin/users/${editingUser.id}`
        : "/api/admin/users";
      const method = editingUser ? "PATCH" : "POST";
      const body = editingUser
        ? { name: formName, role: formRole }
        : { name: formName, email: formEmail, role: formRole };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Operation failed");
      }

      setDialogOpen(false);
      fetchUsers(meta.page);
      toast.success(editingUser ? "User updated" : "Invite sent");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`Deactivate ${user.name}?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      fetchUsers(meta.page);
      toast.success(`${user.name} deactivated`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="User Management"
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Invite User
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Organization Users ({meta.total})</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="space-y-3 p-5 pt-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} variant="block" className="h-12 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="p-5 pt-0">
              <EmptyState
                icon={<Plus className="h-6 w-6" />}
                title="No users yet"
                description="Invite team members to get started."
              />
            </div>
          ) : (
            <DataTable className="rounded-none border-0 shadow-none">
              <DataTableHeader>
                <tr>
                  <DataTableHead>Name</DataTableHead>
                  <DataTableHead>Email</DataTableHead>
                  <DataTableHead>Role</DataTableHead>
                  <DataTableHead>Status</DataTableHead>
                  <DataTableHead className="text-right">Actions</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {users.map((user) => (
                  <DataTableRow key={user.id}>
                    <DataTableCell className="font-medium text-slate-900">
                      {user.name}
                    </DataTableCell>
                    <DataTableCell className="text-slate-500">
                      {user.email}
                    </DataTableCell>
                    <DataTableCell>
                      <Badge
                        variant={
                          user.role === "ADMIN"
                            ? "default"
                            : user.role === "HR"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {user.role}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell>
                      <Badge variant={user.isActive ? "success" : "destructive"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(user)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(user)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
              {meta.total > PAGE_SIZE && (
                <tfoot>
                  <tr>
                    <td colSpan={5} className="p-0">
                      <DataTablePagination
                        page={meta.page}
                        pageSize={PAGE_SIZE}
                        total={meta.total}
                        onPageChange={(p) => fetchUsers(p)}
                      />
                    </td>
                  </tr>
                </tfoot>
              )}
            </DataTable>
          )}
        </CardContent>
      </Card>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editingUser ? "Edit User" : "Invite User"}</CardTitle>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setDialogOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="user-name">Name</Label>
                  <Input
                    id="user-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>
                {!editingUser && (
                  <div className="space-y-1.5">
                    <Label htmlFor="user-email">Email</Label>
                    <Input
                      id="user-email"
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      required
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="user-role">Role</Label>
                  <Select
                    id="user-role"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                </div>
                {formError && (
                  <p className="text-sm text-red-600">{formError}</p>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={formLoading}>
                    {formLoading
                      ? "Saving..."
                      : editingUser
                      ? "Update"
                      : "Invite"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
