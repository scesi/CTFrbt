"use client";

import type { FormEvent } from "react";

export interface Challenge {
  id: string;
  title: string;
  category: string;
  points: number;
  difficulty: string;
  isActive: boolean;
  isLocked: boolean;
  _count: { submissions: number };
}

export interface ChallengeHint {
  content: string;
  cost: number;
}

export interface ChallengeForm {
  title: string;
  description: string;
  points: number;
  flag: string;
  category: string;
  difficulty: string;
  link: string;
  hints: ChallengeHint[];
}

interface ChallengesManagementProps {
  challenges: Challenge[];
  showForm: boolean;
  form: ChallengeForm;
  formFile: File | null;
  creating: boolean;
  categoryOptions: string[];
  onToggleForm: () => void;
  onFormChange: (form: ChallengeForm) => void;
  onFormFileChange: (file: File | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleChallenge: (id: string, isActive: boolean) => void;
  onDeleteChallenge: (id: string, title: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ChallengesManagement({
  challenges,
  showForm,
  form,
  formFile,
  creating,
  categoryOptions,
  onToggleForm,
  onFormChange,
  onFormFileChange,
  onSubmit,
  onToggleChallenge,
  onDeleteChallenge,
}: ChallengesManagementProps) {
  return (
    <>
      {/* Challenges header */}
      <div
        style={{
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ fontSize: "16px", fontWeight: 600 }}>
          Challenges ({challenges.length})
        </h2>
        <button className="btn" onClick={onToggleForm}>
          {showForm ? "Cancel" : "+ New Challenge"}
        </button>
      </div>

      {/* New challenge form */}
      {showForm && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <form onSubmit={onSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <input
                type="text"
                className="form-input"
                value={form.title}
                onChange={(e) =>
                  onFormChange({ ...form, title: e.target.value })
                }
                placeholder="Title"
                required
              />
              <input
                type="text"
                className="form-input"
                value={form.flag}
                onChange={(e) =>
                  onFormChange({ ...form, flag: e.target.value })
                }
                placeholder="flag{...}"
                required
              />
            </div>
            <textarea
              className="form-input"
              value={form.description}
              onChange={(e) =>
                onFormChange({ ...form, description: e.target.value })
              }
              placeholder="Description"
              required
              rows={4}
              style={{ marginBottom: "10px", resize: "vertical" }}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <input
                type="number"
                className="form-input"
                value={form.points}
                onChange={(e) =>
                  onFormChange({ ...form, points: Number(e.target.value) })
                }
                placeholder="Points"
                required
                min={1}
              />
              <input
                type="text"
                className="form-input"
                list="admin-category-options"
                value={form.category}
                onChange={(e) =>
                  onFormChange({ ...form, category: e.target.value })
                }
                placeholder="Category"
                required
              />
              <datalist id="admin-category-options">
                {categoryOptions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <select
                className="form-input"
                value={form.difficulty}
                onChange={(e) =>
                  onFormChange({ ...form, difficulty: e.target.value })
                }
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="insane">Insane</option>
              </select>
              <input
                type="url"
                className="form-input"
                value={form.link}
                onChange={(e) =>
                  onFormChange({ ...form, link: e.target.value })
                }
                placeholder="Link (optional)"
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <label
                className="btn"
                style={{
                  fontSize: "12px",
                  padding: "6px 12px",
                  cursor: "pointer",
                  margin: 0,
                }}
              >
                {formFile ? "Change file" : "Upload file"}
                <input
                  type="file"
                  hidden
                  onChange={(e) => {
                    onFormFileChange(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </label>
              {formFile && (
                <>
                  <span style={{ fontSize: "12px", color: "var(--fg-dim)" }}>
                    {formFile.name} ({formatSize(formFile.size)})
                  </span>
                  <button
                    type="button"
                    className="btn"
                    style={{ fontSize: "11px", padding: "4px 8px" }}
                    onClick={() => onFormFileChange(null)}
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
            <div
              style={{
                marginBottom: "10px",
                padding: "10px",
                border: "1px solid var(--border)",
                borderRadius: "4px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "6px",
                }}
              >
                <span style={{ fontSize: "12px", fontWeight: 600 }}>Hints</span>
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: "11px", padding: "4px 8px" }}
                  onClick={() =>
                    onFormChange({
                      ...form,
                      hints: [...form.hints, { content: "", cost: 0 }],
                    })
                  }
                >
                  + Add hint
                </button>
              </div>
              {form.hints.length === 0 && (
                <span style={{ fontSize: "12px", color: "var(--fg-dim)" }}>
                  No hints yet.
                </span>
              )}
              {form.hints.map((hint, index) => (
                <div
                  key={index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 80px auto",
                    gap: "8px",
                    alignItems: "center",
                    marginBottom: "6px",
                  }}
                >
                  <input
                    type="text"
                    className="form-input"
                    value={hint.content}
                    onChange={(e) => {
                      const hints = [...form.hints];
                      hints[index] = { ...hint, content: e.target.value };
                      onFormChange({ ...form, hints });
                    }}
                    placeholder={`Hint ${index + 1} content`}
                  />
                  <input
                    type="number"
                    className="form-input"
                    value={hint.cost}
                    onChange={(e) => {
                      const hints = [...form.hints];
                      hints[index] = { ...hint, cost: Number(e.target.value) };
                      onFormChange({ ...form, hints });
                    }}
                    placeholder="Cost"
                    min={0}
                  />
                  <button
                    type="button"
                    className="btn"
                    style={{ fontSize: "11px", padding: "4px 8px" }}
                    onClick={() =>
                      onFormChange({
                        ...form,
                        hints: form.hints.filter((_, i) => i !== index),
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={creating}
            >
              {creating ? "Creating..." : "Create Challenge"}
            </button>
          </form>
        </div>
      )}

      {/* Challenges table */}
      <table className="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th style={{ textAlign: "right" }}>Pts</th>
            <th>Diff</th>
            <th style={{ textAlign: "right" }}>Solves</th>
            <th>Status</th>
            <th style={{ textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {challenges.map((c) => (
            <tr key={c.id}>
              <td style={{ fontWeight: 500 }}>{c.title}</td>
              <td>{c.category}</td>
              <td style={{ textAlign: "right" }}>{c.points}</td>
              <td>{c.difficulty}</td>
              <td style={{ textAlign: "right" }}>{c._count.submissions}</td>
              <td>
                <span
                  style={{
                    color: c.isActive ? "var(--success)" : "var(--danger)",
                    fontSize: "12px",
                  }}
                >
                  {c.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td style={{ textAlign: "right" }}>
                <button
                  onClick={() => onToggleChallenge(c.id, c.isActive)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--fg-muted)",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontFamily: "var(--font-mono)",
                    marginRight: "8px",
                  }}
                >
                  {c.isActive ? "disable" : "enable"}
                </button>
                <button
                  onClick={() => onDeleteChallenge(c.id, c.title)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--danger)",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
