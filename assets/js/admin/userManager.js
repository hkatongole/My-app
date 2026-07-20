/**
 * userManager.js — User Management via Supabase Auth Admin API
 *
 * Allows an admin to:
 *  - List all registered users
 *  - Grant / revoke admin role (sets user_metadata.role)
 *  - See last sign-in times and account status
 *
 * Requires an authenticated session with admin privileges.
 * In local SQLite mode, always returns an empty result with a clear message.
 *
 * NOTE: Supabase's /auth/v1/admin/users endpoint requires a service_role key
 * for full access. For security, we use a Supabase Edge Function (or RPC) as
 * a proxy — the browser never holds the service_role key.
 *
 * For a self-hosted/simple setup, we fall back to listing users from a
 * 'profiles' table if one exists, or show the admin-only note.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY, USE_SUPABASE } from '../db/supabaseConfig.js';
import { authService } from '../auth/authService.js';

/**
 * Fetch list of users. Returns array of user objects.
 * Uses a Supabase RPC function `admin_list_users` that is defined with
 * SECURITY DEFINER so only admins (checked server-side) can call it.
 */
export async function listUsers() {
  if (!USE_SUPABASE || !authService.isLoggedIn) return { users: [], error: 'not_available' };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_list_users`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${authService.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const txt = await res.text();
      // If function doesn't exist yet, return graceful error
      if (res.status === 404 || txt.includes('does not exist')) {
        return { users: [], error: 'rpc_not_deployed' };
      }
      return { users: [], error: txt.slice(0, 200) };
    }

    const users = await res.json();
    return { users: Array.isArray(users) ? users : [], error: null };
  } catch (e) {
    return { users: [], error: e.message };
  }
}

/**
 * Update a user's role.
 * Uses the `admin_set_user_role` RPC function.
 * @param {string} userId  Supabase user UUID
 * @param {string} role    'admin' | 'viewer' | ''
 */
export async function setUserRole(userId, role) {
  if (!USE_SUPABASE || !authService.isLoggedIn) throw new Error('Not available');

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_set_user_role`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${authService.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_user_id: userId, p_role: role }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt.slice(0, 200));
  }
  return true;
}

/**
 * Get the SQL to create the required Supabase RPC functions.
 * Admins can run this in the Supabase SQL editor to enable user management.
 */
export const USER_MGMT_SQL = `-- Run this in your Supabase SQL editor to enable user management

-- 1. List users (returns email, id, role, last sign in)
CREATE OR REPLACE FUNCTION admin_list_users()
RETURNS TABLE(id uuid, email text, role text, created_at timestamptz, last_sign_in_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Check caller is an admin
  IF NOT (auth.jwt()->'user_metadata'->>'role' = 'admin' OR
          auth.jwt()->'app_metadata'->>'role' = 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  RETURN QUERY
    SELECT u.id, u.email::text,
           COALESCE(u.raw_user_meta_data->>'role', 'viewer')::text AS role,
           u.created_at, u.last_sign_in_at
    FROM auth.users u
    ORDER BY u.created_at DESC;
END;
$$;

-- 2. Set user role
CREATE OR REPLACE FUNCTION admin_set_user_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NOT (auth.jwt()->'user_metadata'->>'role' = 'admin' OR
          auth.jwt()->'app_metadata'->>'role' = 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('role', p_role)
    WHERE id = p_user_id;
END;
$$;`;
