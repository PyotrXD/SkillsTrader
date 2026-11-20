import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "../../lib/pocketbase/pb";
import type { DocumentRecord } from "../../types/Candidate";
import Candidates from "./Candidates";

const mocks = vi.hoisted(() => ({
  role: "manager" as UserRole,
  listDocuments: vi.fn(),
  deleteDocument: vi.fn(),
}));

vi.mock("@iconify/react", () => ({ Icon: () => null }));
vi.mock("../../utils/auditLog", () => ({ addAuditLog: vi.fn() }));
vi.mock("../../lib/pocketbase/pb", () => ({
  getUserRole: () => mocks.role,
  pb: {
    authStore: { isValid: true, record: { email: "user@example.test" } },
    files: {
      getToken: vi.fn().mockResolvedValue("test-token"),
      getURL: (doc: DocumentRecord) => `https://example.test/${doc.id}/${doc.file}`,
    },
    collection: (name: string) => {
      if (name === "documents") return { getList: mocks.listDocuments, delete: mocks.deleteDocument };
      const items = name === "candidates" ? [{ id: "candidate1", full_name: "Sample Candidate" }] : [];
      return {
        getList: async () => ({ items, page: 1, totalPages: 1 }),
        getFullList: async () => [],
      };
    },
  },
}));

beforeEach(() => {
  mocks.role = "manager";
  const documents = [
    { id: "resume1", candidate: "candidate1", doc_type: "resume", file: "resume.pdf" },
    { id: "passport1", candidate: "candidate1", doc_type: "passport", file: "passport.pdf" },
  ];
  mocks.listDocuments.mockImplementation(async () => ({ items: [...documents], totalPages: 1 }));
  mocks.deleteDocument.mockReset().mockImplementation(async (id: string) => {
    const index = documents.findIndex((doc) => doc.id === id);
    if (index === -1) throw new Error("Document not found");
    documents.splice(index, 1);
    return true;
  });
});

afterEach(() => vi.restoreAllMocks());

async function openDocuments() {
  render(<Candidates />);
  fireEvent.click(await screen.findByRole("button", { name: "View" }));
  const dialog = within(screen.getByRole("dialog"));
  fireEvent.click(dialog.getByRole("button", { name: "Documents" }));
  return dialog;
}

describe("candidate document removal", () => {
  it.each(["manager", "administrator"] as const)("lets a %s remove the selected file", async (role) => {
    mocks.role = role;
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const documents = await openDocuments();

    fireEvent.click(documents.getByRole("button", { name: "Remove Resume" }));

    expect(confirm).toHaveBeenCalledWith("Permanently remove Resume from this candidate?");
    expect(await screen.findByText("Resume removed successfully.")).toBeInTheDocument();
    expect(mocks.deleteDocument).toHaveBeenCalledExactlyOnceWith("resume1");
    expect(documents.queryByRole("button", { name: "Remove Resume" })).toBeNull();
    expect(documents.getByRole("button", { name: "Remove Passport" })).toBeEnabled();
  });

  it("lets staff download documents and hides removal", async () => {
    mocks.role = "staff";
    const documents = await openDocuments();

    expect(documents.getAllByRole("button", { name: "Download" })).toHaveLength(2);
    expect(documents.queryByRole("button", { name: /remove/i })).toBeNull();
  });

  it("preserves the file when removal is cancelled or fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    mocks.deleteDocument.mockRejectedValueOnce(new Error("Delete denied"));
    const documents = await openDocuments();
    const remove = documents.getByRole("button", { name: "Remove Resume" });

    fireEvent.click(remove);
    expect(mocks.deleteDocument).not.toHaveBeenCalled();

    fireEvent.click(remove);
    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to remove Resume.");
    expect(remove).toBeEnabled();
    expect(documents.getAllByRole("button", { name: "Download" })).toHaveLength(2);
  });
});
