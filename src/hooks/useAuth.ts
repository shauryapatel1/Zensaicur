@@ .. @@
 import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
 import { User as SupabaseUser } from '@supabase/supabase-js';
 import * as Sentry from '@sentry/react';
 import { supabase } from '../lib/supabase';
 import { ErrorCode, createAppError, getUserFriendlyErrorMessage } from '../types/errors';
 
@@ .. @@
   const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
     try {
       // Add timeout to login request
+      if (!supabase) {
+        return { success: false, error: 'Database not connected. Please connect to Supabase first.' };
+      }
+      
       const loginPromise = supabase.auth.signInWithPassword({
         email: email.trim(),
         password
@@ .. @@
   const signup = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
     try {
       // Add timeout to signup request
+      if (!supabase) {
+        return { success: false, error: 'Database not connected. Please connect to Supabase first.' };
+      }
+      
       const signupPromise = supabase.auth.signUp({
         email: email.trim(),
         password: password,
@@ .. @@
   const logout = async (): Promise<void> => {
     try {
+      if (!supabase) {
+        console.warn('Database not connected. Please connect to Supabase first.');
+        // Even if logout fails, clear the local state
+        setAuthState({
+          user: null,
+          isAuthenticated: false,
+          isLoading: false
+        });
+        return;
+      }
+      
       const { error } = await supabase.auth.signOut();
       if (error) {
         console.warn('Logout error:', error);
       }
       // User state will be updated by the auth state change listener
     } catch (error) {
       console.warn('Logout error:', error);
       // Even if logout fails, clear the local state
       setAuthState({
         user: null,
         isAuthenticated: false,
         isLoading: false
       });
     }
   };