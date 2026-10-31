import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../lib/supabase.js";
import AppNavbar from "../components/AppNavbar.jsx";

function DashboardPage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [productsCount, setProductsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    loadAdminDashboard();
  }, []);

  async function loadAdminDashboard() {
    setLoading(true);

    try {
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        navigate("/login", { replace: true });
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          `
          id,
          shop_name,
          contact_name,
          email,
          username,
          role,
          is_active,
          created_at
        `
        )
        .eq("id", currentUser.id)
        .single();

      if (profileError || !profileData) {
        throw new Error(
          profileError?.message || "Admin profile could not be loaded."
        );
      }

      if (!profileData.is_active) {
        await supabase.auth.signOut();
        alert("Your account has been disabled.");
        navigate("/login", { replace: true });
        return;
      }

      if (profileData.role !== "admin") {
        alert("Access denied. This page is for admin only.");
        navigate("/screen", { replace: true });
        return;
      }

      setProfile(profileData);

      const { data: customersData, error: customersError } = await supabase
        .from("profiles")
        .select(
          `
          id,
          shop_name,
          contact_name,
          email,
          username,
          role,
          is_active,
          created_at
        `
        )
        .neq("role", "admin")
        .order("created_at", { ascending: false });

      if (customersError) {
        throw customersError;
      }

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id");

      if (productsError) {
        throw productsError;
      }

      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select(
          `
          id,
          user_id,
          amount,
          currency,
          status,
          invoice_date,
          due_date,
          created_at
        `
        )
        .order("created_at", { ascending: false })
        .limit(10);

      if (invoicesError) {
        console.warn("Invoices table not loaded:", invoicesError);
        setInvoices([]);
      } else {
        setInvoices(invoicesData || []);
      }

      setCustomers(customersData || []);
      setProductsCount((productsData || []).length);
    } catch (error) {
      console.error("Admin dashboard error:", error);
      alert(error.message || "Admin dashboard could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleCustomerStatus(customer) {
    const newStatus = !customer.is_active;

    const confirmMessage = newStatus
      ? `Activate ${customer.username}?`
      : `Disable ${customer.username}?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setActionLoadingId(customer.id);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_active: newStatus,
        })
        .eq("id", customer.id);

      if (error) {
        throw error;
      }

      setCustomers((currentCustomers) =>
        currentCustomers.map((item) =>
          item.id === customer.id ? { ...item, is_active: newStatus } : item
        )
      );
    } catch (error) {
      console.error("Toggle customer status error:", error);
      alert(error.message || "Customer status could not be updated.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function deleteCustomer(customer) {
    const confirmed = window.confirm(
      `Delete ${customer.username}? This will remove this profile from the system.`
    );

    if (!confirmed) {
      return;
    }

    setActionLoadingId(customer.id);

    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", customer.id);

      if (error) {
        throw error;
      }

      setCustomers((currentCustomers) =>
        currentCustomers.filter((item) => item.id !== customer.id)
      );
    } catch (error) {
      console.error("Delete customer error:", error);
      alert(error.message || "Customer could not be deleted.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  const activeCustomers = customers.filter((item) => item.is_active).length;
  const disabledCustomers = customers.filter((item) => !item.is_active).length;

  const invoicesTotal = invoices.reduce((total, invoice) => {
    return total + Number(invoice.amount || 0);
  }, 0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d0d0c]">
        <div className="text-center">
          <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-4 border-yellow-500/20 border-t-yellow-500" />

          <p className="text-base font-medium text-yellow-500">
            Loading admin dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d0d0c] p-6 font-sans text-white">
      <AppNavbar />

      <div className="mx-auto max-w-[1500px]">
        <div className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-yellow-500">
              Owner Admin Panel
            </p>

            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-white">
              GoldVision
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
              <span>
                Welcome,{" "}
                <strong className="font-medium text-zinc-200">
                  {profile?.contact_name ||
                    profile?.shop_name ||
                    profile?.username ||
                    "Admin"}
                </strong>
              </span>

              <span className="h-1 w-1 rounded-full bg-yellow-500" />

              <span>@{profile?.username}</span>

              <span className="rounded-full bg-yellow-500/15 px-3 py-1 text-xs font-medium text-yellow-400">
                Admin / Owner
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate("/admin/users/new")}
              className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-yellow-400"
            >
              + Add Customer
            </button>

            <button
              type="button"
              onClick={() => navigate("/admin/products")}
              className="rounded-xl border border-yellow-500/50 bg-yellow-500/10 px-5 py-3 text-sm font-medium text-yellow-400 transition hover:bg-yellow-500 hover:text-black"
            >
              Products
            </button>

            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-red-500/50 px-5 py-3 text-sm font-medium text-red-400 transition hover:bg-red-500 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>

        <StatsGrid
          totalCustomers={customers.length}
          activeCustomers={activeCustomers}
          disabledCustomers={disabledCustomers}
          productsCount={productsCount}
          invoicesCount={invoices.length}
          invoicesTotal={invoicesTotal}
        />

        <CustomersTable
          customers={customers}
          actionLoadingId={actionLoadingId}
          onEdit={(customer) => navigate(`/admin/users/${customer.id}/edit`)}
          onToggleStatus={toggleCustomerStatus}
          onDelete={deleteCustomer}
        />

        <InvoicesTable invoices={invoices} />
      </div>
    </main>
  );
}

function StatsGrid({
  totalCustomers,
  activeCustomers,
  disabledCustomers,
  productsCount,
  invoicesCount,
  invoicesTotal,
}) {
  const stats = [
    {
      title: "Total Customers",
      value: totalCustomers,
      text: "All registered shops",
    },
    {
      title: "Active Customers",
      value: activeCustomers,
      text: "Customers with enabled access",
    },
    {
      title: "Disabled Customers",
      value: disabledCustomers,
      text: "Customers currently blocked",
    },
    {
      title: "Products",
      value: productsCount,
      text: "Products created in the system",
    },
    {
      title: "Invoices",
      value: invoicesCount,
      text: "Latest invoices loaded",
    },
    {
      title: "Invoice Total",
      value: invoicesTotal.toFixed(2),
      text: "Total amount from loaded invoices",
    },
  ];

  return (
    <div className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {stats.map((item) => (
        <div
          key={item.title}
          className="rounded-2xl border border-white/10 bg-[#151514] p-6 shadow-2xl shadow-black/30"
        >
          <p className="mb-2 text-sm font-medium text-zinc-400">
            {item.title}
          </p>

          <p className="mb-2 text-4xl font-bold tracking-[-0.04em] text-white">
            {item.value}
          </p>

          <p className="text-sm leading-6 text-zinc-500">{item.text}</p>
        </div>
      ))}
    </div>
  );
}

function CustomersTable({
  customers,
  actionLoadingId,
  onEdit,
  onToggleStatus,
  onDelete,
}) {
  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-white/10 bg-[#151514] shadow-2xl shadow-black/30">
      <div className="flex flex-col gap-3 border-b border-white/10 px-6 py-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-white">
            Customers
          </h2>

          <p className="mt-1 text-sm text-zinc-400">
            View registered users and control their access.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px] border-collapse text-left">
          <thead className="bg-yellow-500 text-black">
            <tr>
              <th className="px-5 py-4 text-sm font-semibold">Customer</th>
              <th className="px-5 py-4 text-sm font-semibold">Username</th>
              <th className="px-5 py-4 text-sm font-semibold">Email</th>
              <th className="px-5 py-4 text-sm font-semibold">Registered</th>
              <th className="px-5 py-4 text-sm font-semibold">Status</th>
              <th className="px-5 py-4 text-sm font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
                  className="px-5 py-14 text-center text-sm text-zinc-500"
                >
                  No customers found.
                </td>
              </tr>
            ) : (
              customers.map((customer) => {
                const isLoading = actionLoadingId === customer.id;

                return (
                  <tr
                    key={customer.id}
                    className="border-t border-white/5 transition hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-white">
                        {customer.contact_name ||
                          customer.shop_name ||
                          "Unnamed Customer"}
                      </p>

                      {customer.shop_name && (
                        <p className="mt-1 text-xs text-zinc-500">
                          Shop: {customer.shop_name}
                        </p>
                      )}

                      <p className="mt-1 text-xs text-zinc-500">
                        ID: {customer.id}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-zinc-300">
                      @{customer.username || "-"}
                    </td>

                    <td className="px-5 py-4 text-sm text-zinc-400">
                      {customer.email || "-"}
                    </td>

                    <td className="px-5 py-4 text-sm text-zinc-400">
                      {formatDate(customer.created_at)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={
                          customer.is_active
                            ? "rounded-full bg-green-500/15 px-3 py-1 text-xs font-medium text-green-400"
                            : "rounded-full bg-red-500/15 px-3 py-1 text-xs font-medium text-red-400"
                        }
                      >
                        {customer.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(customer)}
                          disabled={isLoading}
                          className="rounded-lg border border-white/10 px-4 py-2 text-xs font-medium text-zinc-200 transition hover:bg-white hover:text-black disabled:opacity-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => onToggleStatus(customer)}
                          disabled={isLoading}
                          className={
                            customer.is_active
                              ? "rounded-lg border border-orange-500/50 px-4 py-2 text-xs font-medium text-orange-400 transition hover:bg-orange-500 hover:text-black disabled:opacity-50"
                              : "rounded-lg border border-green-500/50 px-4 py-2 text-xs font-medium text-green-400 transition hover:bg-green-500 hover:text-black disabled:opacity-50"
                          }
                        >
                          {customer.is_active ? "Disable" : "Activate"}
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete(customer)}
                          disabled={isLoading}
                          className="rounded-lg border border-red-500/50 px-4 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500 hover:text-white disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function InvoicesTable({ invoices }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#151514] shadow-2xl shadow-black/30">
      <div className="flex flex-col gap-3 border-b border-white/10 px-6 py-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-white">
            Latest Invoices
          </h2>

          <p className="mt-1 text-sm text-zinc-400">
            View latest customer invoices and payment status.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] border-collapse text-left">
          <thead className="bg-yellow-500 text-black">
            <tr>
              <th className="px-5 py-4 text-sm font-semibold">Invoice ID</th>
              <th className="px-5 py-4 text-sm font-semibold">Customer ID</th>
              <th className="px-5 py-4 text-sm font-semibold">Amount</th>
              <th className="px-5 py-4 text-sm font-semibold">Status</th>
              <th className="px-5 py-4 text-sm font-semibold">Invoice Date</th>
              <th className="px-5 py-4 text-sm font-semibold">Due Date</th>
            </tr>
          </thead>

          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
                  className="px-5 py-14 text-center text-sm text-zinc-500"
                >
                  No invoices found yet.
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="border-t border-white/5 transition hover:bg-white/[0.03]"
                >
                  <td className="px-5 py-4 text-sm text-zinc-300">
                    {invoice.id}
                  </td>

                  <td className="px-5 py-4 text-sm text-zinc-400">
                    {invoice.user_id}
                  </td>

                  <td className="px-5 py-4 text-sm font-medium text-white">
                    {Number(invoice.amount || 0).toFixed(2)}{" "}
                    {invoice.currency || "AED"}
                  </td>

                  <td className="px-5 py-4">
                    <InvoiceStatus status={invoice.status} />
                  </td>

                  <td className="px-5 py-4 text-sm text-zinc-400">
                    {formatDate(invoice.invoice_date)}
                  </td>

                  <td className="px-5 py-4 text-sm text-zinc-400">
                    {formatDate(invoice.due_date)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function InvoiceStatus({ status }) {
  const value = status || "pending";

  let className = "bg-yellow-500/15 text-yellow-400";

  if (value === "paid") {
    className = "bg-green-500/15 text-green-400";
  }

  if (value === "overdue") {
    className = "bg-red-500/15 text-red-400";
  }

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${className}`}>
      {value}
    </span>
  );
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("en-AE", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export default DashboardPage;