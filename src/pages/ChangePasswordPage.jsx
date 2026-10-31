import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

function ChangePasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const firstLogin = location.state?.firstLogin === true;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleChangePassword(e) {
    e.preventDefault();

    if (loading) return;

    setErrorMessage("");

    if (newPassword.length < 8) {
      setErrorMessage("Password must contain at least 8 characters.");
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setErrorMessage(
        "Password must contain at least one uppercase letter."
      );
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      setErrorMessage(
        "Password must contain at least one lowercase letter."
      );
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setErrorMessage("Password must contain at least one number.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (passwordError) {
        throw passwordError;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          must_change_password: false,
          password_changed_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) {
        throw profileError;
      }

      navigate("/dashboard", {
        replace: true,
      });
    } catch (error) {
      console.error("Change password error:", error);

      setErrorMessage(
        error.message || "Password could not be changed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f4ef] px-6 py-12 font-sans">
      <div className="w-full max-w-[480px] rounded-[28px] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5 sm:p-10">
        <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#171717] text-lg font-semibold text-[#e2b93f]">
          SG
        </div>

        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[#b58a19]">
          Account security
        </p>

        <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-slate-900">
          {firstLogin ? "Create a new password" : "Change your password"}
        </h1>

        <p className="mt-3 text-[15px] font-normal leading-7 text-slate-500">
          {firstLogin
            ? "You are using the default password. You must create a private password before accessing your account."
            : "Enter and confirm your new password."}
        </p>

        <form onSubmit={handleChangePassword} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="new-password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              New password
            </label>

            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setErrorMessage("");
                }}
                placeholder="Enter new password"
                autoComplete="new-password"
                className="h-[56px] w-full rounded-2xl border border-slate-200 bg-white px-4 pr-14 text-[15px] font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#c99d2d] focus:ring-4 focus:ring-[#c99d2d]/10"
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute inset-y-0 right-0 w-14 text-sm font-medium text-slate-500 hover:text-slate-900"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Confirm password
            </label>

            <input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrorMessage("");
              }}
              placeholder="Confirm new password"
              autoComplete="new-password"
              className="h-[56px] w-full rounded-2xl border border-slate-200 bg-white px-4 text-[15px] font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#c99d2d] focus:ring-4 focus:ring-[#c99d2d]/10"
              required
            />
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Password requirements
            </p>

            <p className="text-sm font-normal leading-6 text-slate-500">
              At least 8 characters, including an uppercase letter, a
              lowercase letter and a number.
            </p>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-normal text-red-700">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-[56px] w-full items-center justify-center rounded-2xl bg-[#171717] text-[15px] font-medium text-white shadow-lg shadow-black/15 transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Updating password..." : "Save new password"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default ChangePasswordPage;