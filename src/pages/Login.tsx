import { LogIn } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { Navigate } from "react-router-dom";

export function Login() {
  const { user, appUser, signIn } = useAuth();

  if (user && appUser) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-bg p-4 font-sans text-text-main">
      <div className="w-full max-w-md bg-white rounded-[8px] shadow-sm border border-border p-10 text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-primary text-white rounded-[12px] flex items-center justify-center mb-6 shadow-sm border border-border">
          <span className="text-[22px] font-extrabold tracking-tight">KPS</span>
        </div>
        <h1 className="text-xl font-bold text-text-main mb-2 tracking-tight">KPS ENTERPRISES</h1>
        <p className="text-text-muted text-[14px] mb-8">Sign in to access master roll and payroll.</p>
        
        <button
          onClick={signIn}
          className="w-full bg-primary hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-[6px] transition-colors flex justify-center items-center gap-3 text-[14px]"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 bg-white rounded-full p-[2px]" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
