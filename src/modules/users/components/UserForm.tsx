'use client';

import { useState, useEffect } from 'react';
import { createUser, updateUser, User, CreateUserInput, UpdateUserInput } from '../services/userService';
import { Department } from '@/modules/departments/services/departmentService';

// =============================================================================
// TYPES
// =============================================================================

interface UserFormProps {
  orgId: string;
  user?: User | null;
  departments: Department[];
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
    maxWidth: '500px',
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
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
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
  select: {
    height: '44px',
    borderRadius: '8px',
    backgroundColor: '#0a0a0a',
    border: '1px solid #2a2a2a',
    padding: '0 12px',
    fontSize: '14px',
    color: '#ffffff',
    outline: 'none',
    cursor: 'pointer',
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
  hint: {
    fontSize: '11px',
    color: '#666666',
    marginTop: '4px',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function UserForm({ orgId, user, departments, onSuccess, onCancel }: UserFormProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('shop_user');
  const [departmentId, setDepartmentId] = useState('');
  const [hourlyRate, setHourlyRate] = useState('35.00');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!user;

  // Populate form when editing
  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setFullName(user.fullName || '');
      setRole(user.role);
      setDepartmentId(user.departmentId || '');
      setHourlyRate(user.hourlyRate?.toString() || '35.00');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();

    if (!isEditing) {
      if (!trimmedEmail) {
        setError('Email is required');
        return;
      }
      if (!trimmedName) {
        setError('Full name is required');
        return;
      }
      if (!password || password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      if (isEditing && user) {
        // Update existing user
        const updates: UpdateUserInput = {
          fullName: trimmedName || undefined,
          role,
          departmentId: departmentId || null,
          hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        };

        const result = await updateUser(user.id, updates);

        if (!result.success) {
          setError(result.error || 'Failed to update user');
          return;
        }
      } else {
        // Create new user
        const input: CreateUserInput = {
          orgId,
          email: trimmedEmail,
          fullName: trimmedName,
          role,
          departmentId: departmentId || null,
          hourlyRate: hourlyRate ? parseFloat(hourlyRate) : 35.00,
          password,
        };

        const result = await createUser(input);

        if (!result.success) {
          setError(result.error || 'Failed to create user');
          return;
        }
      }

      onSuccess();
    } catch (err) {
      console.error('Error saving user:', err);
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

  const activeDepartments = departments.filter(d => d.isActive);

  return (
    <div style={s.overlay} onClick={handleOverlayClick}>
      <div style={s.modal}>
        <h2 style={s.title}>
          {isEditing ? 'Edit User' : 'Add User'}
        </h2>

        <form onSubmit={handleSubmit} style={s.form}>
          {/* Email - only editable on create */}
          <div style={s.fieldGroup}>
            <label style={s.label}>
              Email{!isEditing && <span style={s.required}>*</span>}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              style={{
                ...s.input,
                ...(isEditing ? { backgroundColor: '#151515', color: '#666666' } : {}),
              }}
              disabled={isEditing}
              autoFocus={!isEditing}
              onFocus={(e) => {
                if (!isEditing) e.currentTarget.style.borderColor = '#3b82f6';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#2a2a2a';
              }}
            />
            {isEditing && (
              <span style={s.hint}>Email cannot be changed after creation</span>
            )}
          </div>

          {/* Full Name */}
          <div style={s.fieldGroup}>
            <label style={s.label}>
              Full Name{!isEditing && <span style={s.required}>*</span>}
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Smith"
              style={s.input}
              autoFocus={isEditing}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#2a2a2a';
              }}
            />
          </div>

          {/* Role and Department row */}
          <div style={s.row}>
            <div style={s.fieldGroup}>
              <label style={s.label}>Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={s.select}
              >
                <option value="shop_user">Shop User</option>
                <option value="supervisor">Supervisor</option>
                <option value="shop_admin">Shop Admin</option>
              </select>
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                style={s.select}
              >
                <option value="">No Department</option>
                {activeDepartments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Hourly Rate */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Hourly Rate ($)</label>
            <input
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="35.00"
              step="0.01"
              min="0"
              style={s.input}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#2a2a2a';
              }}
            />
          </div>

          {/* Password - only on create */}
          {!isEditing && (
            <div style={s.fieldGroup}>
              <label style={s.label}>
                Initial Password<span style={s.required}>*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                style={s.input}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#2a2a2a';
                }}
              />
              <span style={s.hint}>User can change this after first login</span>
            </div>
          )}

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
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
