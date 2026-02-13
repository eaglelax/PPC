import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { onUserSnapshot } from '../services/userService';
import { UserData } from '../types';

interface AuthContextType {
  firebaseUser: User | null;
  userData: UserData | null;
  loading: boolean;
  needsProfile: boolean;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  userData: null,
  loading: true,
  needsProfile: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [firestoreChecked, setFirestoreChecked] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setUserData(null);
        setFirestoreChecked(false);
        setLoading(false);
      }
    });
    return unsubAuth;
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;

    setFirestoreChecked(false);
    const unsubUser = onUserSnapshot(firebaseUser.uid, (data) => {
      setUserData(data);
      setFirestoreChecked(true);
      setLoading(false);
    });
    return unsubUser;
  }, [firebaseUser]);

  // needsProfile: firebaseUser exists but no Firestore profile yet
  const needsProfile = !!firebaseUser && firestoreChecked && userData === null;

  return (
    <AuthContext.Provider value={{ firebaseUser, userData, loading, needsProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
