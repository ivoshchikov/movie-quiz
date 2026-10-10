// frontend/src/main.tsx
import React            from "react";
import ReactDOM         from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider }   from "./AuthProvider";
import App                from "./App";
import PageErrorBoundary  from "./components/PageErrorBoundary";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/*  HelmetProvider должен быть самым верхним,      */}
    {/*  поэтому просто меняем местами два провайдера. */}
    <HelmetProvider>
      <PageErrorBoundary standalone>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </PageErrorBoundary>
    </HelmetProvider>
  </React.StrictMode>
);
