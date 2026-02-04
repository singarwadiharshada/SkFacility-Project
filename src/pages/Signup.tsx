import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRole, UserRole } from "@/context/RoleContext";
import { toast } from "sonner";
import { Lock, Mail, Shield, User, AlertCircle, CheckCircle, Sparkles, KeyRound, Eye, EyeOff, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("superadmin");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const { signup } = useRole();
  const navigate = useNavigate();

  // Validate email format
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  // Validate password strength
  const validatePassword = (password: string) => {
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setEmailError("");
    setPasswordError("");
    
    // Validate form
    if (!name || !email || !password || !confirmPassword || !selectedRole) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!validateEmail(email)) {
      return;
    }

    if (!validatePassword(password)) {
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      setPasswordError("Passwords do not match");
      return;
    }

    if (selectedRole !== "superadmin") {
      toast.error("Only Super Admin can sign up directly");
      return;
    }

    setLoading(true);

    try {
      await signup(name, email, password, selectedRole);
      toast.success("Super Admin account created successfully!", {
        description: "Welcome to SK PROJECT!",
        icon: <Sparkles className="h-4 w-4" />,
      });
      
      // Navigate to superadmin dashboard
      navigate("/superadmin/dashboard");
    } catch (error: any) {
      // Handle specific error messages
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes("email") && errorMessage.includes("already")) {
        setEmailError("This email is already registered. Please use a different email or try logging in.");
        toast.error("Email already registered");
      } else if (errorMessage.includes("username") && errorMessage.includes("taken")) {
        toast.error("Username is already taken");
      } else {
        toast.error(error.message || "Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailBlur = () => {
    if (email) {
      validateEmail(email);
    }
  };

  const handlePasswordBlur = () => {
    if (password) {
      validatePassword(password);
    }
  };

  const roleColors = {
    superadmin: "from-purple-500 to-pink-500",
    admin: "from-blue-500 to-cyan-500",
    manager: "from-emerald-500 to-teal-500",
    supervisor: "from-amber-500 to-orange-500",
    employee: "from-slate-500 to-gray-500",
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-[2px] h-[2px] bg-white/20 rounded-full"
            initial={{
              x: Math.random() * 100 + "vw",
              y: Math.random() * 100 + "vh",
            }}
            animate={{
              x: Math.random() * 100 + "vw",
              y: Math.random() * 100 + "vh",
            }}
            transition={{
              duration: Math.random() * 20 + 20,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
        
        {/* Gradient Orbs */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Role-based glowing border */}
        <div className={cn(
          "absolute -inset-0.5 rounded-2xl blur opacity-70 transition duration-500",
          roleColors[selectedRole]
        )}>
          <div className="absolute inset-0 bg-gradient-to-r opacity-30 animate-pulse" />
        </div>

        <Card className="relative bg-gray-900/80 backdrop-blur-xl border-gray-800 shadow-2xl overflow-hidden">
          {/* Animated top accent */}
          <motion.div
            className={cn(
              "h-1 w-full bg-gradient-to-r",
              roleColors[selectedRole]
            )}
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 1, ease: "easeInOut" }}
          />

          <CardHeader className="space-y-4 text-center relative">
            {/* Floating particles */}
            <motion.div
              className="absolute -top-10 -right-10"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="h-6 w-6 text-purple-400/30" />
            </motion.div>
            
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="mx-auto relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-lg opacity-30 animate-pulse" />
              <div className="relative w-20 h-20 bg-gradient-to-br from-gray-900 to-gray-800 rounded-full flex items-center justify-center border-2 border-gray-800">
                <KeyRound className="h-10 w-10 text-white" />
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <CardTitle className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                SK PROJECT
              </CardTitle>
              <CardDescription className="text-gray-400 mt-2">
                Super Admin Registration
              </CardDescription>
            </motion.div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Role Selection */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-3"
              >
                <Label className="text-gray-300">Select Role</Label>
                <Select 
                  value={selectedRole || ""} 
                  onValueChange={(value) => setSelectedRole(value as UserRole)}
                >
                  <SelectTrigger className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/80 transition-all duration-300 h-12 text-white">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-1.5 rounded-md bg-gradient-to-br",
                        roleColors[selectedRole]
                      )}>
                        <KeyRound className="h-5 w-5" />
                      </div>
                      <SelectValue placeholder="Select your role" />
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-800 backdrop-blur-xl text-white">
                    <SelectItem 
                      value="superadmin" 
                      className="focus:bg-gray-800/50 focus:text-white text-white hover:text-white py-3"
                    >
                      <div className="flex items-center gap-3 text-white">
                        <KeyRound className="h-5 w-5" />
                        <span>Super Admin</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400 mt-1">
                  Only Super Admin role is available for direct registration
                </p>
              </motion.div>

              {/* Name Input */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-3"
              >
                <Label className="text-gray-300">Full Name</Label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <User className="h-5 w-5 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                  </div>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-12 h-12 bg-gray-800/50 border-gray-700 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all duration-300 text-white placeholder:text-gray-400"
                    required
                  />
                </div>
              </motion.div>

              {/* Email Input */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-3"
              >
                <Label className="text-gray-300">Email Address</Label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={handleEmailBlur}
                    className={`pl-12 h-12 bg-gray-800/50 border-gray-700 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all duration-300 text-white placeholder:text-gray-400 ${emailError ? 'border-red-500/50' : ''}`}
                    required
                  />
                  {email && !emailError && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-400" />
                  )}
                </div>
                {emailError && (
                  <div className="flex items-center gap-2 text-sm text-red-400 mt-1">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {emailError}
                  </div>
                )}
              </motion.div>

              {/* Password Input */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
                className="space-y-3"
              >
                <Label className="text-gray-300">Password</Label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password (min. 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={handlePasswordBlur}
                    className={`pl-12 pr-12 h-12 bg-gray-800/50 border-gray-700 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all duration-300 text-white placeholder:text-gray-400 ${passwordError ? 'border-red-500/50' : ''}`}
                    required
                    minLength={6}
                  />
                  <motion.button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                    whileTap={{ scale: 0.9 }}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </motion.button>
                  {password && password.length >= 6 && !passwordError && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-400" />
                  )}
                </div>
                {passwordError && (
                  <div className="flex items-center gap-2 text-sm text-red-400 mt-1">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {passwordError}
                  </div>
                )}
              </motion.div>

              {/* Confirm Password Input */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
                className="space-y-3"
              >
                <Label className="text-gray-300">Confirm Password</Label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                  </div>
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-12 pr-12 h-12 bg-gray-800/50 border-gray-700 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all duration-300 text-white placeholder:text-gray-400"
                    required
                    minLength={6}
                  />
                  <motion.button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                    whileTap={{ scale: 0.9 }}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </motion.button>
                  {confirmPassword && password === confirmPassword && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-400" />
                  )}
                </div>
              </motion.div>

              {/* Sign Up Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="submit"
                  className={cn(
                    "w-full h-12 text-lg font-semibold transition-all duration-300 relative overflow-hidden group",
                    "bg-gradient-to-r hover:shadow-xl hover:shadow-purple-500/20",
                    roleColors[selectedRole]
                  )}
                  disabled={loading}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                        />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-5 w-5" />
                        Create Super Admin Account
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </Button>
              </motion.div>

              {/* Sign In Link */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-center"
              >
                <p className="text-gray-400 text-sm">
                  Already have an account?{" "}
                  <motion.a
                    href="/login"
                    className="text-purple-400 hover:text-purple-300 font-medium inline-flex items-center gap-1 group"
                    whileHover={{ x: 2 }}
                  >
                    Sign in here
                    <motion.span
                      initial={{ x: -5, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="group-hover:translate-x-1 transition-transform"
                    >
                      →
                    </motion.span>
                  </motion.a>
                </p>
              </motion.div>
            </form>
          </CardContent>

          {/* Footer note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="px-6 pb-4 text-center"
          >
            <p className="text-xs text-gray-500">
              Secure access to SK PROJECT management system
            </p>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  );
};

export default Signup;