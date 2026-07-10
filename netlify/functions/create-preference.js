const CATALOG = {
  "pol-negra":  { name: "Polera Negra",              price: 37990 },
  "pol-blanca": { name: "Polera Blanca",             price: 37990 },
  "short":      { name: "Short Blanco",              price: 34900 },
  "conjunto":   { name: "Conjunto · Polera + Short", price: 68990 },
};
const SIZES = new Set(["S", "M", "L"]);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let cart;
  try {
    cart = JSON.parse(event.body).cart;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "JSON inválido" }) };
  }
  if (!Array.isArray(cart) || !cart.length) {
    return { statusCode: 400, body: JSON.stringify({ error: "Carrito vacío" }) };
  }

  const items = [];
  for (const line of cart) {
    const product = CATALOG[line.id];
    const qty = Number(line.qty);
    if (!product || !SIZES.has(line.size) || !Number.isInteger(qty) || qty < 1 || qty > 20) {
      return { statusCode: 400, body: JSON.stringify({ error: "Ítem de carrito inválido" }) };
    }
    items.push({
      title: `${product.name} — Talla ${line.size}`,
      quantity: qty,
      unit_price: product.price,
      currency_id: "CLP",
    });
  }

  const siteUrl = process.env.URL || "https://ossgrappling.netlify.app";

  try {
    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        items,
        back_urls: {
          success: `${siteUrl}/?pago=exito`,
          failure: `${siteUrl}/?pago=fallo`,
          pending: `${siteUrl}/?pago=pendiente`,
        },
        auto_return: "approved",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: data }) };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ url: data.sandbox_init_point || data.init_point }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
