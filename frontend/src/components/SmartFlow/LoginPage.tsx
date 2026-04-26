"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LocateFixed, Siren, ShieldCheck, User, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_DEMO_ACCOUNTS = [
  {
    role: "Admin",
    email: "admin@smartflow.com",
    password: "admin123",
    icon: <ShieldCheck className="h-4 w-4" />,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/30 hover:border-blue-500/60",
    desc: "Full dashboard, signal management, analytics",
  },

  {
    role: "Normal User",
    email: "user@smartflow.com",
    password: "user123",
    icon: <User className="h-4 w-4" />,
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/30 hover:border-green-500/60",
    desc: "Navigation, route optimization, emergency to hospital",
  },
  {
    role: "Emergency (Ambulance)",
    email: "ambulance@smartflow.com",
    password: "emerg123",
    icon: <Siren className="h-4 w-4" />,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/30 hover:border-red-500/60",
    desc: "Priority corridor, green wave, unrestricted emergency",
  },
];

export function LoginPage() {
  const { login, signup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState<false | "user" | "emergency">(false);

  // Signup Fields
  const [name, setName] = useState("");
  const [driverLicense, setDriverLicense] = useState("");
  const [vehNumber, setVehNumber] = useState("");
  const [hospitalName, setHospitalName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (isSignUp) {
      if (!name || !driverLicense) {
        setError("Please fill required details (Name & License).");
        setLoading(false);
        return;
      }
      if (isSignUp === "emergency" && (!vehNumber || !hospitalName)) {
        setError("Please fill all emergency vehicle details.");
        setLoading(false);
        return;
      }
      // Register to global AuthContext mock DB
      const rolePayload = isSignUp === "emergency" ? "emergency" : "user";
      const newEmail = `${name.replace(/\s/g, "").toLowerCase()}${Math.floor(Math.random()*1000)}@smartflow.com`;
      const pass = isSignUp === "emergency" ? "emerg123" : "user123";

      const success = await signup({
        name,
        email: newEmail,
        password: pass,
        role: rolePayload,
        license: driverLicense,
        vehicle: isSignUp === "emergency" ? vehNumber : undefined,
        hospital: isSignUp === "emergency" ? hospitalName : undefined,
        badgeId: isSignUp === "emergency" ? vehNumber : undefined
      });
      if (!success) setError("Signup failed.");
    } else {
      const success = await login(email, password);
      if (!success) setError("Invalid credentials. Please try again.");
    }
    setLoading(false);
  };

  const fillDemo = (email: string, password: string) => {
    setEmail(email);
    setPassword(password);
    setError("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background grid */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />
      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.4)] mb-4">
            <LocateFixed className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">
            SmartFlow
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mt-1">
            AI Traffic Management System
          </p>
        </div>

        {/* Login Card */}
        <Card className="bg-background/80 backdrop-blur-xl border-border shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Sign In</CardTitle>
            <CardDescription>Access the SmartFlow control panel</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {!isSignUp ? (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 bg-secondary border-border focus:border-accent/50"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 bg-secondary border-border focus:border-accent/50"
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <Label className={cn("text-sm font-semibold flex items-center gap-1", isSignUp === "emergency" ? "text-red-400" : "text-primary")}>
                      {isSignUp === "emergency" ? <Siren className="h-4 w-4"/> : <User className="h-4 w-4" />} 
                      {isSignUp === "emergency" ? "Emergency Auth" : "User Registration"}
                    </Label>
                    <p className="text-xs text-muted-foreground">Register {isSignUp === "emergency" ? "ambulance details" : "your regular account"}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-semibold">Full Name</Label>
                    <Input
                      placeholder="e.g. John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-10 bg-secondary" required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-semibold">Driving License</Label>
                    <Input
                      placeholder="License Number"
                      value={driverLicense}
                      onChange={(e) => setDriverLicense(e.target.value)}
                      className="h-10 bg-secondary" required
                    />
                  </div>
                  
                  {isSignUp === "emergency" && (
                    <>
                      <div className="flex flex-col gap-2">
                        <Label className="text-xs font-semibold">Ambulance Vehicle Number</Label>
                        <Input
                          placeholder="e.g. TN-01-AB-1234"
                          value={vehNumber}
                          onChange={(e) => setVehNumber(e.target.value)}
                          className="h-10 bg-secondary" required
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label className="text-xs font-semibold">Hospital Name</Label>
                        <Input
                          placeholder="Affiliated Hospital"
                          value={hospitalName}
                          onChange={(e) => setHospitalName(e.target.value)}
                          className="h-10 bg-secondary" required
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className={cn(
                  "h-11 font-bold text-sm shadow-[0_0_20px_rgba(59,130,246,0.3)]",
                  isSignUp ? "bg-red-500 hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.3)]" : "bg-primary hover:bg-primary/90"
                )}
              >
                {loading ? "Processing..." : (isSignUp ? "Register Details" : "Sign In")}
              </Button>

              <div className="text-center flex flex-col gap-1 text-xs text-muted-foreground mt-1">
                {isSignUp ? (
                  <span>Wait, I have an account. <button type="button" onClick={() => setIsSignUp(false)} className="text-accent underline font-bold">Sign In</button></span>
                ) : (
                  <>
                    <span>Need an account? <button type="button" onClick={() => setIsSignUp("user")} className="text-primary underline font-bold">Sign Up (User)</button></span>
                    <span>Emergency team? <button type="button" onClick={() => setIsSignUp("emergency")} className="text-red-400 underline font-bold">Sign Up (Emergency)</button></span>
                  </>
                )}
              </div>
            </form>

            <Separator className="bg-border" />

            {/* Demo accounts */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">
                Quick Demo Access
              </p>
              {ROLE_DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  onClick={() => fillDemo(acc.email, acc.password)}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-xl border transition-all text-left",
                    acc.bg
                  )}
                >
                  <div className={cn("mt-0.5", acc.color)}>{acc.icon}</div>
                  <div>
                    <p className={cn("text-sm font-bold", acc.color)}>{acc.role}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{acc.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
