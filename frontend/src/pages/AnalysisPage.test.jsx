import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AnalysisPage from "./AnalysisPage";
import { apiFetch } from "../utils/api";
import { LanguageContext } from "../utils/language";

jest.mock("../utils/api", () => ({ apiFetch: jest.fn() }));

beforeEach(() => {
   window.matchMedia = jest.fn().mockReturnValue({
      matches: false,
      addListener: jest.fn(),
      removeListener: jest.fn(),
   });
   apiFetch.mockImplementation(async (path) => ({
      ok: true,
      json: async () => path === "/api/documents"
         ? [{ id: 1, filename: "sample report.pdf", analysed: true }]
         : { summary: "Saved document summary.", language: "en", excerpt: false },
   }));
});

afterEach(() => jest.clearAllMocks());

test("starts a document analysis immediately and displays its output", async () => {
   render(<LanguageContext.Provider value="en">
      <AnalysisPage filename="sample report.pdf" autoStart="en" onSelect={jest.fn()} />
   </LanguageContext.Provider>);

   expect(await screen.findByText("Saved document summary.")).toBeInTheDocument();
   expect(screen.getByText("Saved with the document")).toBeInTheDocument();
   expect(apiFetch).toHaveBeenCalledWith(
      "/api/documents/analyse/sample%20report.pdf?language=en",
      expect.objectContaining({ method: "POST" })
   );
});

test("reopens stored analysis and localizes the controls without regenerating it", async () => {
   const page = <AnalysisPage filename="sample report.pdf" onSelect={jest.fn()} />;
   const { rerender } = render(<LanguageContext.Provider value="en">{page}</LanguageContext.Provider>);
   expect(await screen.findByText("Saved document summary.")).toBeInTheDocument();

   rerender(<LanguageContext.Provider value="ar">{page}</LanguageContext.Provider>);
   await waitFor(() => expect(screen.getByText("محفوظ مع المستند")).toBeInTheDocument());
   expect(screen.getByText("Saved document summary.")).toHaveAttribute("lang", "en");
   expect(apiFetch).toHaveBeenCalledTimes(2);
   expect(apiFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/documents/analyse/sample%20report.pdf"),
      expect.objectContaining({ method: "GET" })
   );
});

test("allows analysis of pasted text with no file selected", async () => {
   apiFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
   render(<LanguageContext.Provider value="en"><AnalysisPage /></LanguageContext.Provider>);

   expect(screen.getByText("Choose a document, upload a file, or paste text.")).toBeInTheDocument();
   const analyse = screen.getByRole("button", { name: "Analyse", exact: true });
   expect(analyse).toBeDisabled();
   fireEvent.change(screen.getByRole("textbox", { name: "Text to analyse" }), {
      target: { value: " Example report text. " },
   });
   fireEvent.click(analyse);

   expect(await screen.findByText("Saved document summary.")).toBeInTheDocument();
   expect(apiFetch).toHaveBeenCalledWith("/api/documents/analysis/summarize", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ text: "Example report text.", language: "en" }),
   }));
});

test("uploads a file and immediately selects it for analysis", async () => {
   const select = jest.fn();
   const file = new File(["example"], "report.txt", { type: "text/plain" });
   apiFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
   apiFetch.mockResolvedValueOnce({ ok: true, text: async () => "123_report.txt" });
   render(<LanguageContext.Provider value="en"><AnalysisPage onSelect={select} /></LanguageContext.Provider>);

   fireEvent.change(screen.getByLabelText("File to analyse"), { target: { files: [file] } });

   await waitFor(() => expect(select).toHaveBeenCalledWith("123_report.txt", true));
   expect(apiFetch.mock.calls[1][0]).toBe("/api/documents/upload");
   expect(apiFetch.mock.calls[1][1].body.get("file")).toBe(file);
});
