import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { apiFetch } from "./utils/api";

jest.mock("./components/Documents", () => ({ onAnalyse }) => (
   <button onClick={() => onAnalyse("report.pdf", true)}>Analyse report.pdf</button>
));
jest.mock("./utils/api", () => ({
   apiFetch: jest.fn(),
   getEmailFromToken: () => "patient@example.test",
}));

beforeEach(() => {
   const claims = btoa(JSON.stringify({ sub: "patient@example.test", exp: Date.now() / 1000 + 60 }));
   localStorage.setItem("jwt", "header." + claims + ".signature");
   window.matchMedia = jest.fn().mockReturnValue({
      matches: false,
      addListener: jest.fn(),
      removeListener: jest.fn(),
   });
   apiFetch.mockImplementation(async (path) => ({
      ok: true,
      json: async () => path.startsWith("/api/documents/analyse")
         ? { summary: "The saved result", language: "en" }
         : path.startsWith("/api/documents")
            ? [{ id: 1, filename: "report.pdf", analysed: true }]
            : { firstName: "Patient" },
   }));
});

afterEach(() => {
   localStorage.clear();
   window.history.replaceState({}, "", "/");
   jest.clearAllMocks();
});

test("opens the analysis page and executes from the Documents action", async () => {
   window.history.replaceState({}, "", "/?page=9");
   render(<App />);

   fireEvent.click(screen.getByRole("button", { name: "Analyse report.pdf" }));

   expect(await screen.findByText("The saved result")).toBeInTheDocument();
   expect(new URLSearchParams(window.location.search).get("document")).toBe("report.pdf");
   expect(apiFetch).toHaveBeenCalledWith(
      "/api/documents/analyse/report.pdf?language=fr",
      expect.objectContaining({ method: "POST" })
   );
});

test("preserves a saved analysis URL and changes the application language in profile settings", async () => {
   window.history.replaceState({}, "", "/?page=2&document=report.pdf");
   render(<App />);

   expect(await screen.findByText("The saved result")).toBeInTheDocument();
   fireEvent.click(screen.getByRole("button", { name: "Menu du profil" }));
   fireEvent.click(await screen.findByText("Paramètres"));
   fireEvent.mouseDown(screen.getByRole("combobox", { name: "Langue" }));
   fireEvent.click(await screen.findByText("English"));
   expect(screen.getByText("Saved with the document")).toBeInTheDocument();
   fireEvent.mouseDown(screen.getByRole("combobox", { name: "Language" }));
   fireEvent.click(await screen.findByText("العربية"));

   await waitFor(() => expect(document.documentElement).toHaveAttribute("dir", "rtl"));
   expect(screen.getByText("محفوظ مع المستند")).toBeInTheDocument();
   expect(screen.getByText("The saved result")).toBeInTheDocument();
   expect(localStorage.getItem("vitacare_language")).toBe("ar");
   expect(apiFetch).toHaveBeenCalledWith(
      "/api/documents/analyse/report.pdf",
      expect.objectContaining({ method: "GET" })
   );
});
