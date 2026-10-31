import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

function AppNavbar() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    }

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <nav className="fixed right-5 top-3 z-50 flex items-center gap-3 rounded-full border border-[#d4aa18]/40 bg-black/30 px-4 py-2 text-[13px] font-black text-[#d4aa18] backdrop-blur-sm opacity-35 transition hover:opacity-100">
      <Link to="/screen" className="hover:text-white">
        Screen
      </Link>

      <span className="text-[#d4aa18]/40">|</span>

      <Link to="/dashboard" className="hover:text-white">
        Dashboard
      </Link>

      <span className="text-[#d4aa18]/40">|</span>

      {session ? (
        <button onClick={handleLogout} className="hover:text-red-400">
          Logout
        </button>
      ) : (
        <Link to="/login" className="hover:text-white">
          Login
        </Link>
      )}
    </nav>
  );
}

export default AppNavbar;