export function calculateProductPrices(products, charges, metals) {
  const goldPrice = metals.find((item) => item.metal === "GOLD");
  const silverPrice = metals.find((item) => item.metal === "SILVER");

  return products.map((product) => {
    const productCharge = charges.find(
      (charge) => charge.product_id === product.id
    );

    const metalPrice = product.metal === "SILVER" ? silverPrice : goldPrice;

    const pricePerGram24k = Number(metalPrice?.price_per_gram_24k || 0);
    const purity = Number(product.purity || 1);
    const weightInGrams = Number(product.weight_in_grams || 0);

    const marginPerGram = Number(productCharge?.margin_per_gram || 0);
    const makingPerGram = Number(productCharge?.making_charge_per_gram || 0);
    const fixedCharge = Number(productCharge?.fixed_charge || 0);
    const percentageMarkup = Number(productCharge?.percentage_markup || 0);
    const vatPercentage = Number(productCharge?.vat_percentage || 0);

    const baseValue = pricePerGram24k * purity * weightInGrams;
    const marginValue = marginPerGram * weightInGrams;
    const makingValue = makingPerGram * weightInGrams;

    const priceBeforeMarkup =
      baseValue + marginValue + makingValue + fixedCharge;

    const priceAfterMarkup =
      priceBeforeMarkup * (1 + percentageMarkup / 100);

    const finalPrice =
      priceAfterMarkup * (1 + vatPercentage / 100);

    return {
      ...product,
      final_price: Math.round(finalPrice),
      price_before_markup: priceBeforeMarkup,
      margin_per_gram: marginPerGram,
      making_charge_per_gram: makingPerGram,
      fixed_charge: fixedCharge,
    };
  });
}