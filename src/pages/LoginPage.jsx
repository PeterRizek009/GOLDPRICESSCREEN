import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../lib/supabase.js";

function LoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function isEmail(value) {
    return value.includes("@");
  }

  async function getEmailFromUsername(cleanUsername) {
    const { data, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("username", cleanUsername)
      .single();

    if (error || !data?.email) {
      throw new Error("Incorrect username or password.");
    }

    return data.email.toLowerCase();
  }

  async function handleLogin(e) {
    e.preventDefault();

    if (loading) return;

    setErrorMessage("");

    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername || !password) {
      setErrorMessage("Please enter your username and password.");
      return;
    }

    setLoading(true);

    try {
      let loginEmail = cleanUsername;

      if (!isEmail(cleanUsername)) {
        loginEmail = await getEmailFromUsername(cleanUsername);
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (error) {
        throw error;
      }

      const userId = data.user?.id;

      if (!userId) {
        throw new Error("User information could not be loaded.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(
          `
          id,
          username,
          shop_name,
          contact_name,
          email,
          role,
          is_active
        `
        )
        .eq("id", userId)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error("User profile could not be loaded.");
      }

      if (!profile.is_active) {
        await supabase.auth.signOut();
        throw new Error(
          "Your account has been disabled. Please contact the administrator."
        );
      }

      localStorage.setItem("remember_login", String(remember));

      if (profile.role === "admin") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/company/dashboard", { replace: true });
      }
    } catch (error) {
      console.error("Login error:", error);

      if (
        error.message?.includes("Invalid login credentials") ||
        error.message?.includes("Incorrect username or password")
      ) {
        setErrorMessage("Incorrect username or password.");
      } else {
        setErrorMessage(error.message || "Unable to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#b8860b] focus:ring-4 focus:ring-[#b8860b]/20";

  return (
    <main className="grid min-h-screen place-items-center bg-[#eef0f3] px-6 py-10 font-sans text-slate-900">
      <div className="w-full max-w-[400px] rounded-[20px] border border-slate-200 bg-white px-8 pb-7 pt-9 shadow-xl shadow-black/5">
        {/* Logo: small gold bar */}
        <div
          aria-hidden="true"
          className="mx-auto mb-5 grid h-9 w-14 place-items-center rounded-[7px] bg-gradient-to-br from-[#e8c04a] via-[#b8860b] to-[#e8c04a] text-[13px] font-extrabold tracking-wide text-[#3a2a00] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-2px_0_rgba(0,0,0,0.18)]"
        >
          SG
        </div>

        <h1 className="text-center text-2xl font-extrabold tracking-tight">
          Welcome back
        </h1>
        <p className="mb-7 mt-1.5 text-center text-sm text-slate-500">
          Sign in to GoldVision
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="mb-1.5 block text-[13px] font-semibold"
            >
              Username or email
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setErrorMessage("");
              }}
              placeholder="name@company.com"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-[13px] font-semibold"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage("");
                }}
                placeholder="Enter your password"
                className={`${inputClass} pr-16`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-1.5 top-1.5 h-9 rounded-lg px-2.5 text-[13px] font-semibold text-slate-500 transition hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b8860b]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 text-[13px]">
            <label className="flex cursor-pointer items-center gap-2 font-medium">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 accent-[#b8860b]"
              />
              Remember me
            </label>

            <span className="font-semibold text-[#b8860b]">Contact admin</span>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700"
            >
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-[50px] w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-b from-[#f3d572] to-[#e2b93b] text-[15px] font-bold text-[#3a2a00] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#3a2a00]/30 border-t-[#3a2a00]" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-500">
          Swiss Gold management platform
        </p>
      </div>
    </main>
  );
}

export default LoginPage;