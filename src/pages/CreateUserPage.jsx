import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../lib/supabase.js";

function CreateUserPage() {
  const navigate = useNavigate();

  const [shopName, setShopName] = useState("");
  const [contactName, setContactName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  function cleanValue(value) {
    return value.trim();
  }

  function cleanUsername(value) {
    return value.trim().toLowerCase();
  }

  async function handleCreateUser(e) {
    e.preventDefault();

    if (loading) return;

    const finalShopName = cleanValue(shopName);
    const finalContactName = cleanValue(contactName);
    const finalUsername = cleanUsername(username);
    const finalEmail = cleanValue(email).toLowerCase();
    const finalPassword = password;

    if (!finalShopName || !finalUsername || !finalEmail || !finalPassword) {
      alert("Please fill shop name, username, email and password.");
      return;
    }

    if (finalPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session: adminSession },
      } = await supabase.auth.getSession();

      const { data, error } = await supabase.auth.signUp({
        email: finalEmail,
        password: finalPassword,
        options: {
          data: {
            shop_name: finalShopName,
            contact_name: finalContactName,
            username: finalUsername,
            role: "company_admin",
          },
        },
      });

      if (error) {
        throw error;
      }

      const userId = data.user?.id;

      if (!userId) {
        throw new Error(
          "User was created but user ID was not returned. Check email confirmation settings."
        );
      }

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: userId,
          shop_name: finalShopName,
          contact_name: finalContactName,
          email: finalEmail,
          username: finalUsername,
          role: "company_admin",
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

      alert("Customer user created successfully.");

      setShopName("");
      setContactName("");
      setUsername("");
      setEmail("");
      setPassword("");

      navigate("/dashboard", {
        replace: true,
      });
    } catch (error) {
      console.error("Create user error:", error);
      alert(error.message || "User could not be created.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0d0d0c] p-6 font-sans text-white">
      <div className="mx-auto max-w-[620px]">
        <div className="mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-yellow-500">
            Owner Admin Panel
          </p>

          <h1 className="text-4xl font-semibold tracking-[-0.03em] text-white">
            Add New Company
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Create a company admin account. This user will access the company
            dashboard and manage products, premium, discount and images.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#151514] p-6 shadow-2xl shadow-black/30">
          <form onSubmit={handleCreateUser} className="space-y-5">
            <InputField
              label="Shop Name"
              value={shopName}
              placeholder="Example: Test Gold Shop"
              onChange={setShopName}
              required
            />

            <InputField
              label="Contact Name"
              value={contactName}
              placeholder="Example: Test Manager"
              onChange={setContactName}
            />

            <InputField
              label="Username"
              value={username}
              placeholder="Example: testshop"
              onChange={setUsername}
              required
            />

            <InputField
              label="Email"
              type="email"
              value={email}
              placeholder="Example: testshop@swissgold.local"
              onChange={setEmail}
              required
            />

            <InputField
              label="Temporary Password"
              type="password"
              value={password}
              placeholder="Minimum 6 characters"
              onChange={setPassword}
              required
            />

            <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm leading-6 text-yellow-200">
              Role will be saved as{" "}
              <span className="font-semibold text-yellow-400">
                company_admin
              </span>
              . This user will not access the owner dashboard.
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating..." : "Create Company User"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                disabled={loading}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white hover:text-black disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  required = false,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-zinc-300">
        {label}
      </label>

      <input
        type={type}
        value={value}
        required={required}
        minLength={type === "password" ? 6 : undefined}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/10"
      />
    </div>
  );
}

export default CreateUserPage;