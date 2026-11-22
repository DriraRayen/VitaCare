import React, { useState } from "react";
import Button from "./Button";
import { useLanguage } from "../utils/language";

import "../styles/Auth.css";
import "../styles/Button.css";

import Logo from "../assets/VitaCare_logo.png";

export default function LoginPage({ flip, onLogin }) {
   const { t } = useLanguage();
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [error, setError] = useState("");

   React.useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      if (token) {
         localStorage.setItem("jwt", token);
         if (onLogin) onLogin();
         // Optionally, remove token from URL
         window.history.replaceState(
            {},
            document.title,
            window.location.pathname
         );
      }
   }, [onLogin]);

   const handleSubmit = async (e) => {
      e.preventDefault();
      try {
         const res = await fetch("http://localhost:8081/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
         });

         const data = await res.json();

         if (!res.ok) {
            throw new Error(data.error || "Invalid email or password");
         }

         localStorage.setItem("jwt", data.token);

         if (onLogin) onLogin(); // <-- Notify parent
      } catch (err) {
         setError(err.message || "Invalid email or password");
      }
   };

   const handleGoogleLogin = () => {
      // Redirect to your Spring Boot OAuth2 endpoint
      window.location.href = "http://localhost:8081/oauth2/authorize/google";
   };

   return (
      <div className="glassy-card">
         <div className="logo-container">
            <img src={Logo} className="logo-img" alt="VitaCare Logo" />
            <h1>VitaCare</h1>
         </div>

         <form onSubmit={handleSubmit}>
            <input
               type="email"
               name="email"
               placeholder={t("Email", "Email", "البريد الإلكتروني")}
               value={email}
               onChange={(e) => setEmail(e.target.value)}
               required
            />

            <input
               type="password"
               name="password"
               placeholder={t("Mot de passe", "Password", "كلمة المرور")}
               value={password}
               onChange={(e) => setPassword(e.target.value)}
               required
            />

            <Button variant="blue" type="submit">
               {t("Connexion", "Sign in", "تسجيل الدخول")}
            </Button>

            <div className="or">
               <hr />
               <p>{t("Ou", "Or", "أو")}</p>
               <hr />
            </div>

            <Button type="button" variant="teal" onClick={handleGoogleLogin}>
               <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
               >
                  <g clip-path="url(#clip0_35_27)">
                     <path
                        d="M19.5312 10.2266C19.5312 15.7539 15.7461 19.6875 10.1562 19.6875C4.79688 19.6875 0.46875 15.3594 0.46875 10C0.46875 4.64062 4.79688 0.3125 10.1562 0.3125C12.7656 0.3125 14.9609 1.26953 16.6523 2.84766L14.0156 5.38281C10.5664 2.05469 4.15234 4.55469 4.15234 10C4.15234 13.3789 6.85156 16.1172 10.1562 16.1172C13.9922 16.1172 15.4297 13.3672 15.6562 11.9414H10.1562V8.60938H19.3789C19.4688 9.10547 19.5312 9.58203 19.5312 10.2266Z"
                        fill="#ffffff"
                     />
                  </g>
                  <defs>
                     <clipPath id="clip0_35_27">
                        <rect width="20" height="20" fill="white" />
                     </clipPath>
                  </defs>
               </svg>
               {t("Connexion avec Google", "Sign in with Google", "تسجيل الدخول عبر Google")}
            </Button>

            <p id="new">
               {t("Nouveau sur VitaCare ?", "New to VitaCare?", "جديد على VitaCare؟")}{" "}
               <span onClick={flip} className="flip-clicker">
                  {t("Créer un compte", "Create an account", "إنشاء حساب")}
               </span>
            </p>
         </form>

         {error && <p style={{ color: "red" }}>{error}</p>}
      </div>
   );
}
