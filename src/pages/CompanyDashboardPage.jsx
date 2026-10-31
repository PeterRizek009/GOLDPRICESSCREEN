import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../lib/supabase.js";

const emptyProduct = {
  product_name: "",
  weight: "",
  unit: "GM",
  adjustment_type: "premium",
  adjustment_mode: "per_gram",
  adjustment_value: "",
  image_url: "",
  is_active: true,
};

function CompanyDashboardPage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [goldGramRate, setGoldGramRate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCompanyDashboard();
  }, []);

  useEffect(() => {
    if (!modalOpen) return;

    function onKeyDown(event) {
      if (event.key === "Escape") closeForm();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen]);

  async function loadCompanyDashboard() {
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
          profileError?.message || "Company profile could not be loaded."
        );
      }

      if (!profileData.is_active) {
        await supabase.auth.signOut();
        alert("Your account has been disabled.");
        navigate("/login", { replace: true });
        return;
      }

      if (profileData.role === "admin") {
        navigate("/dashboard", { replace: true });
        return;
      }

      setProfile(profileData);

      const { data: productsData, error: productsError } = await supabase
        .from("company_products")
        .select("*")
        .eq("company_id", currentUser.id)
        .order("created_at", { ascending: false });

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
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (invoicesError) {
        console.warn("Invoices table not loaded:", invoicesError);
        setInvoices([]);
      } else {
        setInvoices(invoicesData || []);
      }

      setProducts(productsData || []);
    } catch (error) {
      console.error("Company dashboard error:", error);
      alert(error.message || "Company dashboard could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(emptyProduct);
    setEditingId(null);
  }

  function closeForm() {
    resetForm();
    setModalOpen(false);
  }

  function openAddProduct() {
    resetForm();
    setModalOpen(true);
  }

  function editProduct(product) {
    setEditingId(product.id);

    setForm({
      product_name: product.product_name || "",
      weight: product.weight ?? "",
      unit: product.unit || "GM",
      adjustment_type: product.adjustment_type || "premium",
      adjustment_mode: product.adjustment_mode || "per_gram",
      adjustment_value: product.adjustment_value ?? "",
      image_url: product.image_url || "",
      is_active: Boolean(product.is_active),
    });

    setModalOpen(true);
  }

  async function saveProduct(event) {
    event.preventDefault();

    if (!profile?.id) {
      alert("Company profile not found.");
      return;
    }

    const productName = form.product_name.trim();
    const weight = Number(form.weight);
    const adjustmentValue = Number(form.adjustment_value || 0);

    if (!productName) {
      alert("Please enter product name.");
      return;
    }

    if (Number.isNaN(weight) || weight <= 0) {
      alert("Weight must be greater than zero.");
      return;
    }

    if (Number.isNaN(adjustmentValue) || adjustmentValue < 0) {
      alert("Premium / Discount value must be zero or greater.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        company_id: profile.id,
        product_name: productName,
        weight,
        unit: form.unit,
        adjustment_type: form.adjustment_type,
        adjustment_mode: form.adjustment_mode,
        adjustment_value: adjustmentValue,
        image_url: form.image_url.trim() || null,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      };

      let result;

      if (editingId) {
        result = await supabase
          .from("company_products")
          .update(payload)
          .eq("id", editingId)
          .eq("company_id", profile.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from("company_products")
          .insert(payload)
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      if (editingId) {
        setProducts((current) =>
          current.map((item) => (item.id === editingId ? result.data : item))
        );
      } else {
        setProducts((current) => [result.data, ...current]);
      }

      closeForm();
    } catch (error) {
      console.error("Save product error:", error);
      alert(error.message || "Product could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleProductStatus(product) {
    try {
      const newStatus = !product.is_active;

      const { data, error } = await supabase
        .from("company_products")
        .update({
          is_active: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", product.id)
        .eq("company_id", profile.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setProducts((current) =>
        current.map((item) => (item.id === product.id ? data : item))
      );
    } catch (error) {
      console.error("Toggle product error:", error);
      alert(error.message || "Product status could not be changed.");
    }
  }

  async function deleteProduct(product) {
    const confirmed = window.confirm(
      `Delete ${product.product_name}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const { error } = await supabase
        .from("company_products")
        .delete()
        .eq("id", product.id)
        .eq("company_id", profile.id);

      if (error) {
        throw error;
      }

      setProducts((current) => current.filter((item) => item.id !== product.id));

      if (editingId === product.id) {
        closeForm();
      }
    } catch (error) {
      console.error("Delete product error:", error);
      alert(error.message || "Product could not be deleted.");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  function scrollToInvoices() {
    document
      .getElementById("invoices")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const activeProducts = products.filter((item) => item.is_active).length;

  const invoiceTotal = invoices.reduce((total, invoice) => {
    return total + Number(invoice.amount || 0);
  }, 0);

  const shopDisplayName =
    profile?.shop_name || profile?.contact_name || profile?.username || "Company";

  const logoText = shopDisplayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  const calculatedProducts = useMemo(() => {
    const rate = Number(goldGramRate || 0);

    return products.map((product) => {
      const calculatedPrice = calculateProductPrice(product, rate);

      return {
        ...product,
        calculated_price: calculatedPrice,
      };
    });
  }, [products, goldGramRate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0B0B]">
        <div className="text-center">
          <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-4 border-[#E8B923]/20 border-t-[#E8B923]" />

          <p className="text-base font-medium text-[#E8B923]">
            Loading company dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0B0B0B] font-sans text-[#F5F0E1]">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col items-center gap-2 border-r border-[#1f1f1f] py-5">
        <div
          title={shopDisplayName}
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#E8B923] text-sm font-semibold text-[#E8B923]"
        >
          {logoText}
        </div>

        <SidebarButton label="Dashboard" active>
          <IconDashboard />
        </SidebarButton>

        <SidebarButton
          label="View screen"
          onClick={() => navigate("/company/screen")}
        >
          <IconMonitor />
        </SidebarButton>

        <SidebarButton label="Invoices" onClick={scrollToInvoices}>
          <IconReceipt />
        </SidebarButton>

        <div className="flex-1" />

        <SidebarButton label="Logout" onClick={logout}>
          <IconLogout />
        </SidebarButton>
      </aside>

      {/* Content */}
      <main className="min-w-0 flex-1 px-5 py-6 lg:px-8">
        <div className="mx-auto max-w-[1300px]">
          {/* Header */}
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.02em]">
                Products
              </h1>

              <p className="mt-1 text-sm text-[#8A8577]">
                {shopDisplayName} · Welcome back,{" "}
                {profile?.contact_name || profile?.username}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate("/company/screen")}
                className="flex items-center gap-2 rounded-lg border border-[#2e2e2e] px-4 py-2.5 text-sm transition hover:bg-white/5"
              >
                <IconMonitor className="h-4 w-4" />
                View screen
              </button>

              <button
                type="button"
                onClick={openAddProduct}
                className="flex items-center gap-2 rounded-lg bg-[#E8B923] px-4 py-2.5 text-sm font-semibold text-[#1a1405] transition hover:bg-[#f0c63c]"
              >
                <IconPlus className="h-4 w-4" />
                Add product
              </button>
            </div>
          </header>

          {/* Rate + stats */}
          <section className="mb-6 grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
            <div className="rounded-xl border border-[#E8B923] bg-[#141414] px-5 py-4">
              <label
                htmlFor="gold-rate"
                className="text-xs text-[#8A8577]"
              >
                Gold rate · 24K per gram
              </label>

              <div className="mt-1 flex items-baseline gap-2">
                <input
                  id="gold-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={goldGramRate}
                  onChange={(event) => setGoldGramRate(event.target.value)}
                  placeholder="0.00"
                  className="w-full min-w-0 bg-transparent text-3xl font-semibold text-[#E8B923] outline-none placeholder:text-[#E8B923]/30"
                />

                <span className="text-sm text-[#8A8577]">AED</span>
              </div>
            </div>

            <StatCard
              label="On screen"
              value={activeProducts}
              suffix={`of ${products.length}`}
            />

            <StatCard
              label="Invoices"
              value={invoices.length}
              suffix={`AED ${formatNumber(invoiceTotal)}`}
            />
          </section>

          {/* Products */}
          <ProductsTable
            products={calculatedProducts}
            hasRate={Number(goldGramRate || 0) > 0}
            onEdit={editProduct}
            onToggle={toggleProductStatus}
            onDelete={deleteProduct}
            onAdd={openAddProduct}
          />

          {/* Invoices */}
          <div className="mt-8">
            <InvoicesTable invoices={invoices} />
          </div>
        </div>
      </main>

      {/* Add / edit modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={closeForm}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editingId ? "Edit product" : "Add product"}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#232323] bg-[#141414] p-6 shadow-2xl shadow-black/60"
          >
            <ProductForm
              form={form}
              editingId={editingId}
              saving={saving}
              onChange={updateForm}
              onSubmit={saveProduct}
              onCancel={closeForm}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Sidebar + stats ---------- */

function SidebarButton({ label, onClick, active = false, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
        active
          ? "bg-[#1d1a10] text-[#E8B923]"
          : "text-[#8A8577] hover:bg-white/5 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function StatCard({ label, value, suffix }) {
  return (
    <div className="rounded-xl border border-[#232323] bg-[#141414] px-5 py-4">
      <p className="text-xs text-[#8A8577]">{label}</p>

      <p className="mt-1 text-3xl font-semibold leading-tight">
        {value}{" "}
        <span className="text-sm font-normal text-[#8A8577]">{suffix}</span>
      </p>
    </div>
  );
}

/* ---------- Product form (inside modal) ---------- */

function ProductForm({
  form,
  editingId,
  saving,
  onChange,
  onSubmit,
  onCancel,
}) {
  return (
    <>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.02em]">
            {editingId ? "Edit product" : "Add product"}
          </h2>

          <p className="mt-1 text-sm text-[#8A8577]">
            Weight, premium or discount, and product image.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="rounded-lg p-2 text-[#8A8577] transition hover:bg-white/5 hover:text-white"
        >
          <IconClose className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <InputField
          label="Product name"
          value={form.product_name}
          placeholder="Standard 10 g bar"
          onChange={(value) => onChange("product_name", value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="Weight"
            type="number"
            value={form.weight}
            placeholder="10"
            onChange={(value) => onChange("weight", value)}
          />

          <SelectField
            label="Unit"
            value={form.unit}
            onChange={(value) => onChange("unit", value)}
            options={[
              { value: "GM", label: "GM" },
              { value: "OZ", label: "OZ" },
              { value: "KG", label: "KG" },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Type"
            value={form.adjustment_type}
            onChange={(value) => onChange("adjustment_type", value)}
            options={[
              { value: "premium", label: "Premium" },
              { value: "discount", label: "Discount" },
            ]}
          />

          <SelectField
            label="Mode"
            value={form.adjustment_mode}
            onChange={(value) => onChange("adjustment_mode", value)}
            options={[
              { value: "per_gram", label: "Per gram" },
              { value: "total", label: "Total" },
            ]}
          />
        </div>

        <InputField
          label="Premium / discount value"
          type="number"
          value={form.adjustment_value}
          placeholder="20"
          onChange={(value) => onChange("adjustment_value", value)}
        />

        <InputField
          label="Image URL"
          value={form.image_url}
          placeholder="https://..."
          onChange={(value) => onChange("image_url", value)}
        />

        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#232323] bg-black/30 px-4 py-3">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => onChange("is_active", event.target.checked)}
            className="h-4 w-4 accent-[#E8B923]"
          />

          <span className="text-sm text-zinc-300">Show product on screen</span>
        </label>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-[#E8B923] px-5 py-3 text-sm font-semibold text-[#1a1405] transition hover:bg-[#f0c63c] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Update product" : "Add product"}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[#2e2e2e] px-5 py-3 text-sm text-zinc-200 transition hover:bg-white/5"
          >
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}

/* ---------- Products table ---------- */

function ProductsTable({
  products,
  hasRate,
  onEdit,
  onToggle,
  onDelete,
  onAdd,
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#232323] bg-[#141414]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#232323] text-xs text-[#8A8577]">
              <th className="px-5 py-3 font-medium">Product</th>
              <th className="px-3 py-3 font-medium">Weight</th>
              <th className="px-3 py-3 font-medium">Adjustment</th>
              <th className="px-3 py-3 font-medium">Price</th>
              <th className="px-3 py-3 font-medium">Visible</th>
              <th className="px-5 py-3 text-right font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-5 py-16 text-center">
                  <p className="text-base font-medium">Add your first product</p>

                  <p className="mx-auto mt-1 max-w-xs text-sm text-[#8A8577]">
                    Products you add here show up on your live price screen.
                  </p>

                  <button
                    type="button"
                    onClick={onAdd}
                    className="mt-4 rounded-lg bg-[#E8B923] px-4 py-2.5 text-sm font-semibold text-[#1a1405] transition hover:bg-[#f0c63c]"
                  >
                    Add product
                  </button>
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-[#1d1d1d] transition last:border-b-0 hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.product_name}
                          className="h-11 w-11 shrink-0 rounded-lg bg-[#1a1a1a] object-contain"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#E8B923]/10 text-[10px] font-semibold text-[#E8B923]">
                          GOLD
                        </div>
                      )}

                      <p className="text-sm font-medium">
                        {product.product_name}
                      </p>
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-3 py-3 text-sm">
                    {Number(product.weight)} {formatUnit(product.unit)}
                  </td>

                  <td
                    className={`whitespace-nowrap px-3 py-3 text-sm ${
                      product.adjustment_type === "discount"
                        ? "text-red-400"
                        : "text-[#8A8577]"
                    }`}
                  >
                    {formatAdjustment(product)}
                  </td>

                  <td
                    className={`whitespace-nowrap px-3 py-3 text-sm font-semibold ${
                      product.is_active ? "text-[#E8B923]" : "text-[#8A8577]"
                    }`}
                  >
                    {hasRate
                      ? `${formatNumber(product.calculated_price)} AED`
                      : "—"}
                  </td>

                  <td className="px-3 py-3">
                    <Toggle
                      checked={Boolean(product.is_active)}
                      label={`${product.is_active ? "Hide" : "Show"} ${
                        product.product_name
                      } on screen`}
                      onChange={() => onToggle(product)}
                    />
                  </td>

                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(product)}
                        aria-label={`Edit ${product.product_name}`}
                        title="Edit"
                        className="rounded-lg p-2 text-[#8A8577] transition hover:bg-white/5 hover:text-white"
                      >
                        <IconPencil className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(product)}
                        aria-label={`Delete ${product.product_name}`}
                        title="Delete"
                        className="rounded-lg p-2 text-[#8A8577] transition hover:bg-red-500/10 hover:text-red-400"
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!hasRate && products.length > 0 && (
        <p className="border-t border-[#232323] px-5 py-3 text-xs text-[#8A8577]">
          Enter the gold rate above to see calculated prices.
        </p>
      )}
    </section>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-[18px] w-8 rounded-full transition ${
        checked ? "bg-[#E8B923]" : "bg-[#2e2e2e]"
      }`}
    >
      <span
        className={`absolute top-[2px] h-[14px] w-[14px] rounded-full transition-all ${
          checked ? "left-[16px] bg-[#1a1405]" : "left-[2px] bg-[#8A8577]"
        }`}
      />
    </button>
  );
}

/* ---------- Invoices ---------- */

function InvoicesTable({ invoices }) {
  return (
    <section
      id="invoices"
      className="overflow-hidden rounded-xl border border-[#232323] bg-[#141414]"
    >
      <div className="border-b border-[#232323] px-5 py-4">
        <h2 className="text-lg font-semibold tracking-[-0.02em]">
          Latest invoices
        </h2>

        <p className="mt-0.5 text-sm text-[#8A8577]">
          Your latest invoices and payment status.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#232323] text-xs text-[#8A8577]">
              <th className="px-5 py-3 font-medium">Invoice ID</th>
              <th className="px-3 py-3 font-medium">Amount</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Invoice date</th>
              <th className="px-5 py-3 font-medium">Due date</th>
            </tr>
          </thead>

          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td
                  colSpan="5"
                  className="px-5 py-12 text-center text-sm text-[#8A8577]"
                >
                  No invoices yet. They'll show up here once they're issued.
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="border-b border-[#1d1d1d] transition last:border-b-0 hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-3 text-sm text-zinc-300">
                    {String(invoice.id).slice(0, 8)}
                  </td>

                  <td className="px-3 py-3 text-sm font-medium">
                    {formatNumber(invoice.amount)} {invoice.currency || "AED"}
                  </td>

                  <td className="px-3 py-3">
                    <InvoiceStatus status={invoice.status} />
                  </td>

                  <td className="px-3 py-3 text-sm text-[#8A8577]">
                    {formatDate(invoice.invoice_date)}
                  </td>

                  <td className="px-5 py-3 text-sm text-[#8A8577]">
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
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${className}`}
    >
      {value}
    </span>
  );
}

/* ---------- Form fields ---------- */

function InputField({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm text-zinc-300">{label}</label>

      <input
        type={type}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-[#2a2a2a] bg-black/40 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#E8B923] focus:ring-4 focus:ring-[#E8B923]/10"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm text-zinc-300">{label}</label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-[#2a2a2a] bg-black/40 px-4 py-2.5 text-sm text-white outline-none transition focus:border-[#E8B923] focus:ring-4 focus:ring-[#E8B923]/10"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-black">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ---------- Icons (inline SVG, no extra dependency) ---------- */

function Icon({ className = "h-5 w-5", children }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function IconDashboard(props) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </Icon>
  );
}

function IconMonitor(props) {
  return (
    <Icon {...props}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </Icon>
  );
}

function IconReceipt(props) {
  return (
    <Icon {...props}>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </Icon>
  );
}

function IconLogout(props) {
  return (
    <Icon {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </Icon>
  );
}

function IconPlus(props) {
  return (
    <Icon {...props}>
      <path d="M5 12h14M12 5v14" />
    </Icon>
  );
}

function IconPencil(props) {
  return (
    <Icon {...props}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </Icon>
  );
}

function IconTrash(props) {
  return (
    <Icon {...props}>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </Icon>
  );
}

function IconClose(props) {
  return (
    <Icon {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Icon>
  );
}

/* ---------- Helpers ---------- */

function calculateProductPrice(product, goldGramRate) {
  if (!goldGramRate || goldGramRate <= 0) {
    return 0;
  }

  let weightInGram = Number(product.weight || 0);

  if (product.unit === "OZ") {
    weightInGram = weightInGram * 31.1035;
  }

  if (product.unit === "KG") {
    weightInGram = weightInGram * 1000;
  }

  const basePrice = goldGramRate * weightInGram;
  const adjustmentValue = Number(product.adjustment_value || 0);

  let adjustment = adjustmentValue;

  if (product.adjustment_mode === "per_gram") {
    adjustment = adjustmentValue * weightInGram;
  }

  if (product.adjustment_type === "discount") {
    return Math.max(basePrice - adjustment, 0);
  }

  return basePrice + adjustment;
}

function formatUnit(unit) {
  if (unit === "GM") return "g";
  return (unit || "").toLowerCase();
}

function formatAdjustment(product) {
  const value = Number(product.adjustment_value || 0);

  if (!value) {
    return "—";
  }

  const sign = product.adjustment_type === "discount" ? "−" : "+";
  const suffix = product.adjustment_mode === "per_gram" ? "AED / g" : "AED total";

  return `${sign}${value} ${suffix}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
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

export default CompanyDashboardPage;
