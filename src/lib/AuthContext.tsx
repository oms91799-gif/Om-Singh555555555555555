import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: "admin" | "supervisor";
}

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            setAppUser({ uid: firebaseUser.uid, ...userDoc.data() } as AppUser);
          } else {
            // Auto-create as admin for the first user or simple testing. 
            // In a real app, role might be default "supervisor" and admins manage it,
            // but for ease of use here, we'll set to admin if not exists.
            const role = firebaseUser.email === "oms91799@gmail.com" ? "admin" : "supervisor";
            const newUser: Omit<AppUser, 'uid'> = {
              email: firebaseUser.email || "",
              name: firebaseUser.displayName || "Unknown User",
              role: role as "admin" | "supervisor"
            };
            await setDoc(doc(db, "users", firebaseUser.uid), newUser);
            setAppUser({ uid: firebaseUser.uid, ...newUser } as AppUser);
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setAppUser(null);
        }
      } else {
        setAppUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, appUser, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
