'use client';

import { useState, useEffect } from 'react';
import { createDepartment, updateDepartment, Department } from '../services/departmentService';

// =============================================================================
// TYPES
// =============================================================================

interface DepartmentFormProps {
  orgId: string;
  department?: Department | null;
  onSuccess: () => void;
  onCancel: () => void;
}

// =============================================================================
// STYLES
// =============================================================================

const s = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#1a1a1a',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #2a2a2a',
    width: '100%',
    maxWidth: '450px',
    maxHeight: '90vh',
    overflow: 'auto' as const,
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#888888',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  input: {
    height: '44px',
    borderRadius: '8px',
    backgroundColor: '#0a0a0a',
    border: '1px solid #2a2a2a',
    padding: '0 12px',
    fontSize: '14px',
    color: '#ffffff',
    outline: 'none',
    transition: 'border-color 0.15s ease',
  } as React.CSSProperties,
  textarea: {
    minHeight: '80px',
    borderRadius: '8px',
    backgroundColor: '#0a0a0a',
    border: '1px solid #2a2a2a',
    padding: '12px',
    fontSize: '14px',
    color: '#ffffff',
    outline: 'none',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    transition: 'border-color 0.15s ease',
  } as React.CSSProperties,
  error: {
    fontSize: '13px',
    color: '#ef4444',
    padding: '10px 12px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  buttons: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  primaryBtn: {
    flex: 1,
    height: '44px',
    borderRadius: '8px',
    backgroundColor: '#3b82f6',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,
  secondaryBtn: {
    flex: 1,
    height: '44px',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    fontSize: '14px',
    fontWeight: 500,
    color: '#888888',
    border: '1px solid #2a2a2a',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,
  required: {
    color: '#ef4444',
    marginLeft: '2px',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function DepartmentForm({ orgId, department, onSuccess, onCancel }: DepartmentFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!department;

  // Populate form when editing
  useEffect(() => {
    if (department) {
      setName(department.name);
      setDescription(department.description || '');
    }
  }, [department]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Department name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isEditing && department) {
        // Update existing department
        const result = await updateDepartment(department.id, {
          name: trimmedName,
          description: description.trim() || null,
        });

        if (!result.success) {
          setError(result.error || 'Failed to update department');
          return;
        }
      } else {
        // Create new department
        const result = await createDepartment(
          orgId,
          trimmedName,
          description.trim() || undefined
        );

        if (!result.success) {
          setError(result.error || 'Failed to create department');
          return;
        }
      }

      onSuccess();
    } catch (err) {
      console.error('Error saving department:', err);
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div style={s.overlay} onClick={handleOverlayClick}>
      <div style={s.modal}>
        <h2 style={s.title}>
          {isEditing ? 'Edit Department' : 'Add Department'}
        </h2>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.fieldGroup}>
            <label style={s.label}>
              Name<span style={s.required}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Paint, Body, Detail"
              style={s.input}
              autoFocus
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#2a2a2a';
              }}
            />
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              style={s.textarea}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#2a2a2a';
              }}
            />
          </div>

          {error && <div style={s.error}>{error}</div>}

          <div style={s.buttons}>
            <button
              type="button"
              onClick={onCancel}
              style={s.secondaryBtn}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#444444';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#2a2a2a';
                e.currentTarget.style.color = '#888888';
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                ...s.primaryBtn,
                opacity: saving ? 0.6 : 1,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!saving) {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }}
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
