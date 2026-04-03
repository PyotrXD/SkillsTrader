import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import Toast from "../ui/Toast";
import { Icon } from "@iconify/react";
import type { FormEvent } from "react";
import {
  getPocketBaseUiError,
  pb,
  type UserRole,
} from "../../lib/pocketbase/pb";
import Navbar from "../ui/Navbar";
import Sidebar from "./Sidebar";
import Modal from "../ui/Modal";
import usersData from "../../data/users.json";
import Searchbar from "../ui/Searchbar";
import Filter from "../ui/Filter";
import Pagination from "../ui/Pagination";
import Selection from "../ui/Selection";

type CreateUserForm = {
  email: string;
  password: string;
  passwordConfirm: string;
  name: string;
  role: UserRole;
};

const initialForm: CreateUserForm = {
  email: "",
  password: "",
  passwordConfirm: "",
  name: "",
  role: "staff",
};

// UserModal: Add/Edit
function UserModal({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  error,
  success,
  form,
  setForm,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  title,
  submitLabel,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
  error: string;
  success: string;
  form: CreateUserForm;
  setForm: React.Dispatch<React.SetStateAction<CreateUserForm>>;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  showConfirmPassword: boolean;
  setShowConfirmPassword: React.Dispatch<React.SetStateAction<boolean>>;
  title: string;
  submitLabel: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-2.5"
        onSubmit={onSubmit}
      >
        <label className="grid gap-1.25">
          <span className="text-sm text-(--muted) font-bold">Email</span>
          <input
            className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-2.75 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="Enter your email"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm text-(--muted) font-bold">Name</span>
          <input
            className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-2.75 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)"
            type="text"
            autoComplete="name"
            required
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Enter your name"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm text-(--muted) font-bold">Password</span>
          <div className="relative flex items-center">
              <input
              className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-2.75 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary) pr-10"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) =>
                setForm((p) => ({ ...p, password: e.target.value }))
              }
              placeholder={
                title === "Edit User"
                  ? "Leave blank to keep password"
                  : "Enter your password"
              }
              required
            />
            <button
              type="button"
              className="absolute right-3 text-gray-400 hover:text-(--primary) transition-colors"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <Icon
                icon={showPassword ? "mdi:eye" : "mdi:eye-off"}
                width="20"
              />
            </button>
          </div>
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm text-(--muted) font-bold">
            Password confirm
          </span>
          <div className="relative flex items-center">
            <input
              className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-2.75 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary) pr-10"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              value={form.passwordConfirm}
              onChange={(e) =>
                setForm((p) => ({ ...p, passwordConfirm: e.target.value }))
              }
              placeholder={
                title === "Edit User"
                  ? "Leave blank to keep password"
                  : "Confirm your password"
              }
              required
            />
            <button
              type="button"
              className="absolute right-3 text-gray-400 hover:text-(--primary) transition-colors"
              tabIndex={-1}
              onClick={() => setShowConfirmPassword((v) => !v)}
              aria-label={
                showConfirmPassword ? "Hide password" : "Show password"
              }
            >
              <Icon
                icon={showConfirmPassword ? "mdi:eye" : "mdi:eye-off"}
                width="20"
              />
            </button>
          </div>
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm text-(--muted) font-bold">Role</span>
          <Selection
            value={form.role}
            onChange={(val: string) =>
              setForm((p) => ({ ...p, role: val as UserRole }))
            }
            options={[
              { value: "administrator", label: "administrator" },
              { value: "manager", label: "manager" },
              { value: "staff", label: "staff" },
            ]}
            placeholder="Select role"
            required
          />
        </label>
        <div className="col-span-2 flex justify-end gap-2 mt-4">
          <button
            type="button"
            className="border border-(--border) bg-white text-(--text) rounded-full px-4 py-2 font-bold transition-all duration-150 hover:bg-(--surface2) hover:scale-105"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="border-none text-white bg-linear-to-br from-(--primary) to-(--primary2) rounded-full px-4 py-2 font-bold transition-all duration-150 hover:brightness-110 hover:scale-105"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? submitLabel === "Create User"
                ? "Creating..."
                : "Saving..."
              : submitLabel}
          </button>
        </div>
        {error && (
          <p className="col-span-2 mt-3 text-[#9f2d20] text-sm">{error}</p>
        )}
      </form>
    </Modal>
  );
}

function getErrorMessage(err: unknown): string {
  const uiMessage = getPocketBaseUiError(err, "");
  if (uiMessage === null) return "";
  if (uiMessage.trim()) return uiMessage;
  if (err && typeof err === "object") {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Failed to create user. Check the details and try again.";
}

export function UsersPanel() {
  // Search and filter state
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [form, setForm] = useState<CreateUserForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [editForm, setEditForm] = useState<CreateUserForm>(initialForm);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditConfirmPassword, setShowEditConfirmPassword] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<any>(null);

  // Pagination state (demo)
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [pagedUsers, setPagedUsers] = useState(usersData.slice(0, perPage));

  // Derived filtered users
  const filteredUsers = usersData.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter ? user.role === roleFilter : true;
    return matchesSearch && matchesRole;
  });

  useEffect(() => {
    // For demo: paginate filteredUsers locally
    const total = Math.ceil(filteredUsers.length / perPage);
    setTotalPages(total);
    const start = (page - 1) * perPage;
    setPagedUsers(filteredUsers.slice(start, start + perPage));
    // For real backend: fetch from PocketBase here
    // Example:
    // pb.collection('users').getList(page, perPage).then(result => {
    //   setPagedUsers(result.items);
    //   setTotalPages(result.totalPages);
    // });
  }, [page, perPage, search, roleFilter]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await pb.collection("users").create({
        email: form.email.trim(),
        password: form.password,
        passwordConfirm: form.passwordConfirm,
        name: form.name.trim(),
        role: form.role,
      });
      setSuccess(`User ${form.email.trim()} created with role ${form.role}.`);
      setForm((previous) => ({ ...initialForm, role: previous.role }));
      setIsModalOpen(false); // Close modal on success
      setShowToast(true);
    } catch (err) {
      const message = getErrorMessage(err);
      if (message) setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEdit(user: any) {
    setEditUser(user);
    setEditForm({
      email: user.email,
      password: "",
      passwordConfirm: "",
      name: user.name,
      role: user.role,
    });
    setShowEditPassword(false);
    setShowEditConfirmPassword(false);
    setIsEditModalOpen(true);
  }

  function handleCloseEditModal() {
    setIsEditModalOpen(false);
    setEditUser(null);
    setEditForm(initialForm);
  }

  async function onEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");
    try {
      // Simulate update (replace with real API call)
      // await pb.collection('users').update(editUser.id, { ...editForm });
      setSuccess(`User ${editForm.email.trim()} updated.`);
      setIsEditModalOpen(false);
      setShowToast(true);
    } catch (err) {
      const message = getErrorMessage(err);
      if (message) setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDelete(user: any) {
    setDeleteUser(user);
    setIsDeleteModalOpen(true);
  }

  function handleCloseDeleteModal() {
    setIsDeleteModalOpen(false);
    setDeleteUser(null);
  }

  async function onDeleteSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");
    try {
      // Simulate delete (replace with real API call)
      // await pb.collection('users').delete(deleteUser.id);
      setSuccess(`User ${deleteUser.email} deleted.`);
      setIsDeleteModalOpen(false);
      setShowToast(true);
    } catch (err) {
      setError("Failed to delete user.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenModal() {
    setForm((prev) => ({ ...initialForm, role: prev.role })); // Reset form but keep last role
    setError("");
    setSuccess("");
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setError("");
    setSuccess("");
  }

  return (
    <>
      {showToast && success && (
        <Toast
          type="success"
          message={success}
          onClose={() => setShowToast(false)}
        />
      )}
            <section className="bg-white border border-(--border) rounded-(--radius) shadow-[var(--shadow),var(--inset)] px-6 py-6 flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h1 className="text-2xl text-(--text) font-bold">
                    Users Account
                  </h1>
                  <p className="text-(--muted) text-sm font-medium">
                    Create users directly and assign a role.
                  </p>
                </div>
                <button
                  className="ml-auto border-none text-white bg-linear-to-br from-(--primary) to-(--primary2) rounded-full px-4 py-2 font-bold transition-all duration-150 hover:brightness-110 hover:scale-105"
                  onClick={handleOpenModal}
                >
                  Create User
                </button>
              </div>
              <div className="flex flex-col md:flex-row gap-3 md:items-center mt-5">
                <div className="flex-1 max-w-xs">
                  <Searchbar
                    value={search}
                    onChange={setSearch}
                    placeholder="Search by name or email"
                  />
                </div>
                <div className="w-48">
                  <Filter
                    value={roleFilter}
                    onChange={setRoleFilter}
                    options={[
                      { value: "", label: "All Roles" },
                      { value: "administrator", label: "Administrator" },
                      { value: "manager", label: "Manager" },
                      { value: "staff", label: "Staff" },
                    ]}
                    placeholder="Filter by role"
                  />
                </div>
                {(search || roleFilter) && (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setRoleFilter("");
                        setPage(1);
                      }}
                      className="px-3 py-1.5 flex items-center gap-1 rounded-full bg-red-100 text-red-700 font-semibold text-sm hover:bg-red-200 transition-colors"
                    >
                      <Icon icon="tabler:x" width="20" height="20" />
                      Clear all
                    </button>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto mt-5">
                <table className="min-w-full text-sm text-left">
                  <thead>
                    <tr className="bg-(--surface2)">
                      <th className="px-4 py-3 font-bold text-(--muted) rounded-tl-xl">#</th>
                      <th className="px-4 py-2 font-bold text-(--muted)">Email</th>
                      <th className="px-4 py-2 font-bold text-(--muted)">Name</th>
                      <th className="px-4 py-2 font-bold text-(--muted)">Role</th>
                      <th className="px-4 py-3 font-bold text-(--muted) rounded-tr-xl">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-(--muted)">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Icon icon="tabler:user-off" width="48" height="48" className="text-(--muted) mb-2" />
                            <span className="text-lg font-semibold">No users found</span>
                            <span className="text-sm">There are currently no users to display.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      pagedUsers.map((user, idx) => {
                        // Badge color by role
                        let badgeClass = "";
                        if (user.role === "administrator")
                          badgeClass = "bg-yellow-100 text-yellow-800";
                        else if (user.role === "manager")
                          badgeClass = "bg-green-100 text-green-800";
                        else badgeClass = "bg-blue-100 text-blue-800";

                        return (
                          <tr
                            key={user.id}
                            className="border-b border-(--border) last:border-b-0 hover:bg-(--surface2)/60 transition-colors"
                          >
                            <td className="px-4 py-2">{(page - 1) * perPage + idx + 1}</td>
                            <td className="px-4 py-2 font-semibold">{user.email}</td>
                            <td className="px-4 py-2 font-semibold">{user.name}</td>
                            <td className="px-4 py-2 font-semibold">
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-xs  capitalize ${badgeClass}`}
                              >
                                {user.role}
                              </span>
                            </td>
                            <td className="px-4 py-2 flex gap-2">
                              {user.role !== "administrator" && (
                                <>
                                  <button
                                    className="px-3 py-1.5 flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 font-bold text-sm hover:bg-blue-200 transition-colors"
                                    title="Edit"
                                    type="button"
                                    onClick={() => handleEdit(user)}
                                  >
                                    <Icon
                                      icon="tabler:edit"
                                      width="20"
                                      height="20"
                                    />
                                    Edit
                                  </button>
                                  <button
                                    className="px-3 py-1 flex items-center gap-1 rounded-full bg-red-100 text-red-700 font-semibold text-sm hover:bg-red-200 transition-colors"
                                    title="Delete"
                                    type="button"
                                    onClick={() => handleDelete(user)}
                                  >
                                    <Icon
                                      icon="tabler:trash"
                                      width="20"
                                      height="20"
                                    />
                                    Delete
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
            {/* Pagination Controls */}
            <div className="flex justify-end mt-4">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                perPage={perPage}
                onPerPageChange={setPerPage}
              />
            </div>

            {/* Edit User Modal */}
            <UserModal
              open={isEditModalOpen}
              onClose={handleCloseEditModal}
              onSubmit={onEditSubmit}
              isSubmitting={isSubmitting}
              error={error}
              success={success}
              form={editForm}
              setForm={setEditForm}
              showPassword={showEditPassword}
              setShowPassword={setShowEditPassword}
              showConfirmPassword={showEditConfirmPassword}
              setShowConfirmPassword={setShowEditConfirmPassword}
              title="Edit User"
              submitLabel="Save Changes"
            />

            <UserModal
              open={isModalOpen}
              onClose={handleCloseModal}
              onSubmit={onSubmit}
              isSubmitting={isSubmitting}
              error={error}
              success={success}
              form={form}
              setForm={setForm}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              showConfirmPassword={showConfirmPassword}
              setShowConfirmPassword={setShowConfirmPassword}
              title="Add User"
              submitLabel="Create User"
            />

            {/* Delete User Modal */}
            <Modal open={isDeleteModalOpen} onClose={handleCloseDeleteModal} title="Delete User">
              <form onSubmit={onDeleteSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-full flex flex-col items-center justify-center mb-2">
                    <div className="w-16 h-16 flex items-center justify-center rounded-full bg-red-100 mb-2">
                      <Icon
                        icon="tabler:alert-triangle"
                        width="38"
                        height="38"
                        className="text-red-500"
                      />
                    </div>
                  </div>
                  <p className="text-base font-semibold text-(--text) mb-1">
                    Are you sure you want to{" "}
                    <span className="text-red-600 font-bold">delete</span> this
                    user?
                  </p>
                  <p className="text-sm text-(--muted)">
                    <span className="font-bold">{deleteUser?.name}</span> (
                    {deleteUser?.email})
                  </p>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    className="border border-(--border) bg-white text-(--text) rounded-full px-4 py-2 font-bold transition-all duration-150 hover:bg-(--surface2) hover:scale-105"
                    onClick={handleCloseDeleteModal}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="border-none text-white bg-linear-to-br from-red-500 to-red-700 rounded-full px-4 py-2 font-bold transition-all duration-150 hover:brightness-110 hover:scale-105 shadow-md shadow-red-200"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Deleting..." : "Delete"}
                  </button>
                </div>
                {error && (
                  <p className="mt-3 text-[#9f2d20] text-sm text-center">
                    {error}
                  </p>
                )}
              </form>
            </Modal>
    </>
  );
}

export default function DashboardAdminCreateUser() {
  const email = pb.authStore.record?.email ?? "your account";
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-(--bg) flex flex-row">
      <Sidebar
        activeKey="users"
        isCollapsed={isMenuCollapsed}
        role="administrator"
        onSelect={(key) => {
          if (key !== 'users') navigate('/dashboard', { state: { activeKey: key } });
        }}
        onToggleCollapsed={() => setIsMenuCollapsed((v) => !v)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar role="Administrator" email={email} />
        <div className="w-full mx-auto px-5 py-6 md:p-6 sm:p-3">
          <main className="grid gap-3">
            <UsersPanel />
          </main>
        </div>
      </div>
    </div>
  );
}
