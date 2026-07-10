import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import App from "./App.jsx";       // forside + kvalifiseringstrakt (kunde)
import Fagfolk from "./Fagfolk.jsx"; // fagfolk/installatør-side (default-eksport heter App)
import Admin from "./Admin.jsx";     // intern admin (ADMIN_TOKEN)
import Portal from "./Portal.jsx";   // partnerens innlogging + profil
import Personvern from "./Personvern.jsx"; // personvernerklæring (spec §5)

// Rutene speiler drift-doc §4 og API-redirects (verifiser.js → /portal).
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/fagfolk" element={<Fagfolk />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/portal" element={<Portal />} />
        <Route path="/personvern" element={<Personvern />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
