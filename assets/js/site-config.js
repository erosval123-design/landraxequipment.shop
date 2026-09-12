/* ---------------------------------------------------------------------------
   Runtime configuration for LandRaxx.
   THIS FILE IS PUBLIC. Never put a Stripe secret key (sk_live_... / sk_test_...) here.
--------------------------------------------------------------------------- */
window.SITE_CONFIG = {
  // SHA-256 of the admin passphrase.
  admin: { passHash: "5b9e9741342f4f8a87a03b52634853031e9478d49220cadd57e189392e0b7bb3" },

  business: {
    company:   "LandRaxx",
    street:    "",
    city:      "Houston",
    state:     "TX",
    zip:       "77001",
    phone:     "+1 800 526 3729"
  },

  // Stripe Checkout Sessions endpoint (Vercel serverless function)
  checkoutEndpoint: "/api/create-checkout",

  // Payment Links — not used (we use checkoutEndpoint instead)
  paymentLinks: {
    "LR-HY14G": "",
    "LR-HY10C": "",
    "LR-D902": "",
    "LR-ECAB": ""
  }
};
