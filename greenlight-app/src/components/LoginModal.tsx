import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } else {
      const { error } = await supabase.auth.signInWithOtp({ email });
      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
    setLoading(false);
    if (error) setError(error.message);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isSignUp ? "Create your Greenlight account" : "Sign in to Greenlight"}
        </h2>
        <form onSubmit={handleEmailAuth} className="flex flex-col gap-4 mb-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="border rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          {isSignUp && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="border rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          )}
          <button
            type="submit"
            className="bg-green-600 text-white rounded px-4 py-2 font-semibold hover:bg-green-700 transition"
            disabled={loading}
          >
            {loading
              ? isSignUp
                ? "Creating account..."
                : "Sending magic link..."
              : isSignUp
                ? "Create Account"
                : "Sign in with Email"}
          </button>
        </form>
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 rounded px-4 py-2 font-semibold hover:bg-gray-100 transition mb-2"
          disabled={loading}
        >
          <svg className="w-5 h-5" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.22l6.85-6.85C36.68 2.54 30.74 0 24 0 14.82 0 6.71 5.82 2.69 14.09l7.98 6.2C12.13 13.6 17.56 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.65 7.01l7.19 5.59C43.93 37.13 46.1 31.3 46.1 24.55z"/><path fill="#FBBC05" d="M10.67 28.29c-1.13-3.36-1.13-6.97 0-10.33l-7.98-6.2C.7 16.18 0 19.01 0 22c0 2.99.7 5.82 1.96 8.24l8.71-6.95z"/><path fill="#EA4335" d="M24 44c6.74 0 12.42-2.23 16.56-6.07l-7.19-5.59c-2.01 1.35-4.59 2.16-7.37 2.16-6.44 0-11.87-4.1-13.33-9.59l-8.71 6.95C6.71 42.18 14.82 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></g></svg>
          Sign in with Google
        </button>
        <div className="text-center mt-4">
          {isSignUp ? (
            <span>
              Already have an account?{' '}
              <button
                className="text-green-700 underline hover:text-green-900"
                onClick={() => { setIsSignUp(false); setError(null); setSuccess(false); }}
                type="button"
              >
                Sign in
              </button>
            </span>
          ) : (
            <span>
              Don&apos;t have an account?{' '}
              <button
                className="text-green-700 underline hover:text-green-900"
                onClick={() => { setIsSignUp(true); setError(null); setSuccess(false); }}
                type="button"
              >
                Create one
              </button>
            </span>
          )}
        </div>
        {error && <div className="text-red-600 text-center mb-2">{error}</div>}
        {success && (
          <div className="text-green-600 text-center mb-2">
            {isSignUp
              ? "Check your email to confirm your account!"
              : "Check your email for a magic link!"}
          </div>
        )}
      </div>
    </div>
  );
} 