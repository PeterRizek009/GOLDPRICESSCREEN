import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../lib/supabase.js";

function AddUserPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    shopName: "",
    contactName: "",
    username: "",
    email: "",
    password: "",
    role: "company_admin",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setMessage("");
    setErrorMessage("");
  }

  function cleanText(value) {
    return value.trim();
  }

  function cleanUsername(value) {
    return value.trim().toLowerCase();
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setMessage("");
    setErrorMessage("");

    try {
      const shopName = cleanText(form.shopName);
      const contactName = cleanText(form.contactName);
      const username = cleanUsername(form.username);
      const email = cleanText(form.email).toLowerCase();
      const password = form.password;

      if (!shopName) {
        throw new Error("Shop name is required.");
      }

      if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
        throw new Error(
          "Username must be 3 to 30 characters and contain only letters, numbers, dots, dashes or underscores."
        );
      }

      if (!email) {
        throw new Error("Email is required.");
      }

      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }

      /**
       * Important:
       * signUp may change the current session to the newly created user.
       * So we save the current admin session first, then restore it after creation.
       */
      const {
        data: { session: adminSession },
      } = await supabase.auth.getSession();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            shop_name: shopName,
            contact_name: contactName,
            username,
            role: form.role,
          },
        },
      });

      if (error) {
        throw error;
      }

      const userId = data.user?.id;

      if (!userId) {
        throw new Error(
          "User was created, but user ID was not returned. Please check Supabase Auth settings."
        );
      }

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: userId,
          shop_name: shopName,
          contact_name: contactName || null,
          email,
          username,
          role: form.role,
          is_active: true,
        },
        {
          onConflict: "id",
        }
      );

      if (profileError) {
        throw profileError;
      }

      if (adminSession?.access_token && adminSession?.refresh_token) {
        await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
        });
      }

      setMessage(`Company user "${username}" created successfully.`);

      setForm({
        shopName: "",
        contactName: "",
        username: "",
        email: "",
        password: "",
        role: "company_admin",
      });
    } catch (error) {
      console.error("Create user error:", error);
      setErrorMessage(error.message || "Failed to create user.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0d0d0c] px-6 py-10 font-sans text-white">
      <div className="mx-auto max-w-[720px]">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="mb-6 text-sm font-medium text-zinc-400 hover:text-white"
        >
          ← Back to dashboard
        </button>

        <div className="rounded-[28px] border border-white/10 bg-[#151514] p-8 shadow-2xl shadow-black/30 sm:p-10">
          <div className="mb-8">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-yellow-500">
              Company management
            </p>

            <h1 className="text-[34px] font-semibold tracking-[-0.03em] text-white">
              Add new company
            </h1>

            <p className="mt-3 text-[15px] font-normal leading-7 text-zinc-400">
              Create a company admin account. This user will manage products,
              weights, premium, discount and product images.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Shop Name
              </label>

              <input
                type="text"
                value={form.shopName}
                onChange={(e) => updateField("shopName", e.target.value)}
                placeholder="Example: Test Gold Shop"
                className="h-[54px] w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-[15px] text-white outline-none placeholder:text-zinc-600 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/10"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Contact Name
              </label>

              <input
                type="text"
                value={form.contactName}
                onChange={(e) => updateField("contactName", e.target.value)}
                placeholder="Example: Peter Test"
                className="h-[54px] w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-[15px] text-white outline-none placeholder:text-zinc-600 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/10"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Username
              </label>

              <input
                type="text"
                value={form.username}
                onChange={(e) =>
                  updateField(
                    "username",
                    e.target.value.toLowerCase().replace(/\s/g, "")
                  )
                }
                placeholder="Example: testshop"
                autoComplete="off"
                className="h-[54px] w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-[15px] text-white outline-none placeholder:text-zinc-600 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/10"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Email
              </label>

              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="Example: testshop@swissgold.local"
                autoComplete="off"
                className="h-[54px] w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-[15px] text-white outline-none placeholder:text-zinc-600 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/10"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Temporary Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                  className="h-[54px] w-full rounded-2xl border border-white/10 bg-black/30 px-4 pr-16 text-[15px] text-white outline-none placeholder:text-zinc-600 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/10"
                  required
                  minLength={6}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 px-4 text-sm font-medium text-zinc-400 hover:text-white"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Role
              </label>

              <select
                value={form.role}
                onChange={(e) => updateField("role", e.target.value)}
                className="h-[54px] w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-[15px] text-white outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/10"
              >
                <option value="company_admin">Company Admin</option>
                <option value="customer">Customer</option>
              </select>
            </div>

            {message && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-400">
                {message}
              </div>
            )}

            {errorMessage && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-400">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-[56px] w-full items-center justify-center rounded-2xl bg-yellow-500 text-[15px] font-semibold text-black transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating company..." : "Create company user"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default AddUserPage;