import React, { useState, useEffect } from "react";
import {
   BrowserRouter as Router,
   Routes,
   Route,
   Navigate,
   useNavigate,
} from "react-router-dom";
import {jwtDecode} from "jwt-decode";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import SharedPacketPage from "./pages/SharedPacketPage";
import { LanguageContext, languages } from "./utils/language";
import { ConfigProvider } from "antd";
import frFR from "antd/locale/fr_FR";
import enUS from "antd/locale/en_US";
import arEG from "antd/locale/ar_EG";

const locales = { fr: frFR, en: enUS, ar: arEG };

function OAuth2RedirectHandler({ setIsAuthenticated }) {
   const navigate = useNavigate();

   useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      if (token) {
         localStorage.setItem("jwt", token);
         setIsAuthenticated(true);
         window.history.replaceState({}, document.title, "/");
         navigate("/", { replace: true });
      }
   }, [setIsAuthenticated, navigate]);

   return null;
}

function hasValidToken() {
   try {
      const token = localStorage.getItem("jwt");
      return Boolean(token && jwtDecode(token).exp > Date.now() / 1000);
   } catch {
      return false;
   }
}

function App() {
   const [isAuthenticated, setIsAuthenticated] = useState(hasValidToken);
   const [language, setLanguage] = useState(() => {
      const saved = localStorage.getItem("vitacare_language");
      return languages.some((option) => option.value === saved) ? saved : "fr";
   });

   useEffect(() => {
      localStorage.setItem("vitacare_language", language);
      document.documentElement.lang = language;
      document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
   }, [language]);

   const validateToken = () => {
      const valid = hasValidToken();
      if (!valid) localStorage.removeItem("jwt");
      setIsAuthenticated(valid);
   };

   useEffect(() => validateToken(), []);
   useEffect(() => {
      const interval = setInterval(validateToken, 60 * 1000);
      return () => clearInterval(interval);
   }, []);

   return (
      <LanguageContext.Provider value={language}>
         <ConfigProvider locale={locales[language]} direction={language === "ar" ? "rtl" : "ltr"}>
            <Router>
               <Routes>
                  <Route path="/share/:token" element={<SharedPacketPage />} />
                  <Route path="/login" element={
                     isAuthenticated ? <Navigate to="/" /> : <LoginPage onLogin={validateToken} />
                  } />
                  <Route path="/oauth2/redirect" element={
                     <OAuth2RedirectHandler setIsAuthenticated={setIsAuthenticated} />
                  } />
                  <Route path="/*" element={
                     isAuthenticated ? <Dashboard setLanguage={setLanguage} /> : <Navigate to="/login" />
                  } />
               </Routes>
            </Router>
         </ConfigProvider>
      </LanguageContext.Provider>
   );
}

export default App;