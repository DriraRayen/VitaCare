import React, { useState } from "react";
import Button from "./Button";
import { useLanguage } from "../utils/language";

import "../styles/Auth.css";
import "../styles/Button.css";

import Logo from "../assets/VitaCare_logo.png";

export default function SignupPage({ flip, onLogin }) {
   const { t } = useLanguage();
   const [email, setEmail] = useState("");
   const [role, setRole] = useState("ROLE_PATIENT");
   const [invitation, setInvitation] = useState("");
   const [password, setPassword] = useState("");
   const [confirmPassword, setConfirmPassword] = useState("");
   const [error, setError] = useState("");

   React.useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      if (token) {
         localStorage.setItem("jwt", token);
         if (onLogin) onLogin();
         window.history.replaceState(
            {},
            document.title,
            window.location.pathname
         );
      }
   }, [onLogin]);

   const handleSubmit = async (e) => {
      e.preventDefault();
      setError("");
      if (password !== confirmPassword) {
         setError(t("Les mots de passe diffèrent.", "Passwords do not match.", "كلمتا المرور غير متطابقتين."));
         return;
      }

      try {
         const res = await fetch("http://localhost:8081/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               email,
               password,
               role,
               ...(role === "ROLE_CARE_DOCTOR" && { doctorInvitation: invitation.trim() }),
            }),
         });

         const data = await res.json();

         if (!res.ok) {
            if (data.code === "DOCTOR_INVITATION_REQUIRED") {
               throw new Error(t(
                  "Utilisez une invitation valide pour cette adresse e-mail.",
                  "Use a valid doctor invitation for this email address.",
                  "استخدم دعوة طبيب صالحة لهذا البريد الإلكتروني."
               ));
            }
            const errorMsg = data.error || data.message || (typeof data === "object" ? Object.values(data)[0] : "Signup failed");
            throw new Error(errorMsg);
         }

         if (data.token) {
            localStorage.setItem("jwt", data.token);
            if (onLogin) onLogin(); // <-- Notify parent
         } else if (flip) {
            flip(); // Switch to login tab if no token
         }
      } catch (err) {
         setError(err.message || "Failed to create account");
      }
   };

   const handleGoogleSignup = () => {
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

            <input
               type="password"
               name="confirmPassword"
               placeholder={t("Confirmer le mot de passe", "Confirm password", "تأكيد كلمة المرور")}
               value={confirmPassword}
               onChange={(e) => setConfirmPassword(e.target.value)}
               required
            />

            <label className="account-role" htmlFor="account-role">{t("Type de compte", "Account type", "نوع الحساب")}
               <select id="account-role" value={role} onChange={(event) => {
                  setRole(event.target.value);
                  setInvitation("");
                  setError("");
               }}>
                  <option value="ROLE_PATIENT">{t("Patient", "Patient", "مريض")}</option>
                  <option value="ROLE_CARE_DOCTOR">{t("Médecin", "Doctor", "طبيب")}</option>
               </select>
            </label>

            {role === "ROLE_CARE_DOCTOR" && (
               <input
                  type="password"
                  name="doctorInvitation"
                  aria-label={t("Code d’invitation médecin", "Doctor invitation code", "رمز دعوة الطبيب")}
                  placeholder={t("Code d’invitation médecin", "Doctor invitation code", "رمز دعوة الطبيب")}
                  autoComplete="off"
                  value={invitation}
                  onChange={(event) => setInvitation(event.target.value)}
                  maxLength={128}
                  required
               />
            )}

            <Button variant="blue" type="submit">
               {t("Créer un compte", "Sign up", "إنشاء حساب")}
            </Button>

            {role === "ROLE_PATIENT" && <>
            <div className="or">
               <hr /> <p>{t("Ou", "Or", "أو")}</p> <hr />
            </div>

            <Button type="button" variant="teal" onClick={handleGoogleSignup}>
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
               {t("S’inscrire avec Google", "Sign up with Google", "التسجيل عبر Google")}
            </Button>
            </>}

            <p id="new">
               {t("Vous avez déjà un compte ?", "Already have an account?", "لديك حساب بالفعل؟")}{" "}
               <span onClick={flip} className="flip-clicker">
                  {t("Se connecter", "Sign in", "تسجيل الدخول")}
               </span>
            </p>
         </form>

         {error && <p style={{ color: "red" }}>{error}</p>}
      </div>
   );
}
