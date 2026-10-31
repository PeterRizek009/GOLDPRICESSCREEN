import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import AppNavbar from "../components/AppNavbar.jsx";
import HeaderClock from "../components/HeaderClock.jsx";
import SpotRateCard from "../components/SpotRateCard.jsx";
import CommodityCard from "../components/CommodityCard.jsx";
import BarsTable from "../components/BarsTable.jsx";
import { calculateProductPrices } from "../utils/calculateProductPrices.js";
import { updateGoldPricesInSupabase } from "../services/updateGoldPrices.js";

function ScreenPage() {
  const [products, setProducts] = useState([]);
  const [metals, setMetals] = useState([]);
  const [time, setTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshAllData();

    const dataTimer = setInterval(() => {
      refreshAllData();
    }, 10000);

    const clockTimer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => {
      clearInterval(dataTimer);
      clearInterval(clockTimer);
    };
  }, []);

  async function refreshAllData() {
    console.log("Refreshing all data at:", new Date().toLocaleTimeString());

    try {
      const updateResult = await updateGoldPricesInSupabase();
      console.log("Gold database update result:", updateResult);
    } catch (error) {
      console.error("Gold update error:", error.message);
    }

    await fetchAndCalculateData();
  }

  async function fetchAndCalculateData() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setLoading(false);
      return;
    }

    const userId = userData.user.id;

    const [productsResult, chargesResult, metalsResult] = await Promise.all([
      supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),

      supabase
        .from("user_product_charges")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true),

      supabase.from("live_metal_prices").select("*"),
    ]);

    if (productsResult.error) {
      console.error(productsResult.error.message);
      setLoading(false);
      return;
    }

    if (chargesResult.error) {
      console.error(chargesResult.error.message);
      setLoading(false);
      return;
    }

    if (metalsResult.error) {
      console.error(metalsResult.error.message);
      setLoading(false);
      return;
    }

    const calculatedProducts = calculateProductPrices(
      productsResult.data || [],
      chargesResult.data || [],
      metalsResult.data || []
    );

    setProducts(calculatedProducts);
    setMetals(metalsResult.data || []);
    setLoading(false);



    console.log("Metals from database:", metalsResult.data);

  }

  const commodity = useMemo(
    () => products.filter((item) => item.category === "COMMODITY"),
    [products]
  );

  const bars = useMemo(
    () => products.filter((item) => item.category === "SWISS_GOLD_BARS"),
    [products]
  );
  const goldSpot = metals.find((item) => item.metal === "GOLD");
  const silverSpot = metals.find((item) => item.metal === "SILVER");



  return (
    <main className="relative min-h-screen w-screen overflow-hidden bg-[#050505] text-white">
      <AppNavbar />

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 text-3xl font-black text-[#d4aa18]">
          Loading prices...
        </div>
      )}

      <div className="grid min-h-screen grid-cols-[42%_58%] gap-4 px-4 py-3">
        <section className="flex min-h-0 flex-col gap-4">
          <HeaderClock time={time} />
          <SpotRateCard goldSpot={goldSpot} silverSpot={silverSpot} />
          <CommodityCard products={commodity} />
        </section>

        <section className="min-h-0">
          <BarsTable products={bars} />
        </section>
      </div>
    </main>
  );
}

export default ScreenPage;