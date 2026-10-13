import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from '../services/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState({
    id: 'guest',
    name: 'Guest Learner',
    email: 'guest@cognipath.local',
    isGuest: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('cognipath_token');
    if (token) {
      api.getMe()
        .then((res) => {
          if (res?.user) {
            setUser(res.user);
          }
        })
        .catch(() => {
          localStorage.removeItem('cognipath_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Built-in Email/Password Login
  const login = async (email, password) => {
    const res = await api.login(email, password);
    localStorage.setItem('cognipath_token', res.token);
    setUser(res.user);
    return res.user;
  };

  // Built-in Email/Password Registration
  const register = async (name, email, password) => {
    const res = await api.register(name, email, password);
    localStorage.setItem('cognipath_token', res.token);
    setUser(res.user);
    return res.user;
  };

  // Firebase Google One-Click Sign In
  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;

    const res = await api.firebaseAuth({
      email: fbUser.email,
      name: fbUser.displayName || fbUser.email.split('@')[0],
      uid: fbUser.uid,
      photoURL: fbUser.photoURL || null,
    });

    localStorage.setItem('cognipath_token', res.token);
    setUser(res.user);
    return res.user;
  };

  // Firebase Email/Password Sign In
  const loginWithFirebaseEmail = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const fbUser = result.user;

    const res = await api.firebaseAuth({
      email: fbUser.email,
      name: fbUser.displayName || fbUser.email.split('@')[0],
      uid: fbUser.uid,
      photoURL: fbUser.photoURL || null,
    });

    localStorage.setItem('cognipath_token', res.token);
    setUser(res.user);
    return res.user;
  };

  // Firebase Email/Password Registration
  const registerWithFirebaseEmail = async (name, email, password) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const fbUser = result.user;

    if (name) {
      await updateProfile(fbUser, { displayName: name });
    }

    const res = await api.firebaseAuth({
      email: fbUser.email,
      name: name || fbUser.displayName || fbUser.email.split('@')[0],
      uid: fbUser.uid,
      photoURL: fbUser.photoURL || null,
    });

    localStorage.setItem('cognipath_token', res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      // Ignore firebase signout error if not logged in via firebase
    }
    localStorage.removeItem('cognipath_token');
    setUser({
      id: 'guest',
      name: 'Guest Learner',
      email: 'guest@cognipath.local',
      isGuest: true,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        loginWithGoogle,
        loginWithFirebaseEmail,
        registerWithFirebaseEmail,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
