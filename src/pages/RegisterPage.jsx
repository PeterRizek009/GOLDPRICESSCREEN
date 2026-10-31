import { useState } from "react";
import { supabase } from "../lib/supabase.js";
import { useNavigate, Link } from "react-router-dom";

function RegisterPage() {
  const navigate = useNavigate();

  const [shopName, setShopName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  async function handleRegister(e) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            shop_name: shopName,
            contact_name: contactName,
            role: "customer",
          },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes("rate limit")) {
          alert(
            "Too many signup/email attempts. Please wait a few minutes and try again, or create the user from Supabase Dashboard."
          );
        } else {
          alert(error.message);
        }

        return;
      }

      const userId = data.user?.id;

      if (userId) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: userId,
          email,
          shop_name: shopName,
          contact_name: contactName,
          role: "customer",
        });

        if (profileError) {
          console.error("Profile error:", profileError.message);
          alert("User created, but profile was not saved.");
          return;
        }
      }

      alert("Account created successfully");

      setShopName("");
      setContactName("");
      setEmail("");
      setPassword("");

      navigate("/login");
    } catch (err) {
      console.error("Register error:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-[520px] rounded-2xl border border-yellow-500 bg-zinc-950 p-6"
      >
        <h1 className="mb-6 text-center text-3xl font-black text-yellow-500">
          Create Customer Account
        </h1>

        <label className="mb-2 block text-sm font-bold text-zinc-300">
          Shop Name
        </label>
        <input
          className="mb-4 w-full rounded-lg bg-white p-3 text-black outline-none"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          placeholder="Shop name"
          required
        />

        <label className="mb-2 block text-sm font-bold text-zinc-300">
          Contact Name
        </label>
        <input
          className="mb-4 w-full rounded-lg bg-white p-3 text-black outline-none"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="Contact name"
        />

        <label className="mb-2 block text-sm font-bold text-zinc-300">
          Email
        </label>
        <input
          className="mb-4 w-full rounded-lg bg-white p-3 text-black outline-none"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="customer@email.com"
          required
        />

        <label className="mb-2 block text-sm font-bold text-zinc-300">
          Password
        </label>
        <input
          className="mb-5 w-full rounded-lg bg-white p-3 text-black outline-none"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          minLength={6}
          required
        />

        <button
          disabled={loading}
          className="w-full rounded-lg bg-yellow-500 p-3 font-black text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Account"}
        </button>

        <p className="mt-4 text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-yellow-500">
            Login
          </Link>
        </p>
      </form>
    </main>
  );
}

export default RegisterPage;