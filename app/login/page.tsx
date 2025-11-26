"use client";
export const dynamic = "force-dynamic";
import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Mail, Lock, Zap, CircleArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { login } from "@/lib/auth";
import { useClientToast } from "@/hooks/use-client-toast";
import Logo from "@/public/icon512_rounded.png";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

const slides = [
  "/cyborg.png",
  "/d__3_-removebg-preview.png",
  "/mini-ebike-reference.png",
  "/t20.png",
  "/v9-tricycle.png",
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const toast = useClientToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result) {
        const welcomeMessage =
          result.user.role === "admin"
            ? `Welcome back, Admin ${result.user.name}!`
            : `Welcome back, ${result.user.name}!`;

        toast.authSuccess(welcomeMessage);

        setTimeout(() => {
          router.push(result.redirectTo);
        }, 1000);
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(
        "Login Failed",
        error.message || "Invalid email or password. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000); // Change every 5 seconds
    return () => clearInterval(interval);
  }, []);


  return (
        <main className="min-h-screen grid grid-cols-1 sm:grid-cols-2"> 
            <div className="hidden lg:flex relative h-[100vh] w-full items-end overflow-hidden">
              <Image
                key={slides[current]}
                src={slides[current]}
                alt="Hero Slide"
                fill
                className="object-contain transition-opacity duration-700"
              />
              <div className="absolute inset-0 bg-black/40" />
              <div className="relative z-10 text-white p-10 bg-gray-400 opacity-75 box-shadow-xl">
                <h1 className="text-4xl font-bold my-5 opacity-100">Power Your Future</h1>
                <p className="text-lg tracking-wide font-semibold">
                  Join YAMAARAW electronic future.
                  <br />
                  <span className="font-normal">
                    Experience cutting-edge electric vehicles that combine
                    performance, sustainability and innovation.
                  </span>
                </p>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-s50 via-orange-50 to-slate-50 flex items-center justify-center p-4"> 
              <div className="absolute inset-0 opacity-10" 
                style={{
                  backgroundImage: `radial-gradient(circle, hsl(var(--ev-orange)) 1px, transparent 1px)`,
                  backgroundSize: "40px 40px",
                }} 
                />
                <div className="space-y-2"> <div className="flex flex-col items-center justify-center my-3"> 
                  <Image
                    src={Logo}
                    alt="Logo"
                    className="w-20 h-20 mb-2"
                  />
                  <Badge className="bg-gradient-to-r from-orange-600 to-red-600 text-white border-none shadow-lg"> 
                    Electric Vehicle Store 
                  </Badge> 
                </div> 
                  
                <div className="bg-white px-20 py-10 border shadow-xl rounded-xl opacity-100" style={{ opacity: 0.9 }}> 
                  <div className="flex"> 
                    <Link href="/"> 
                      <CircleArrowLeft className="w-8 h-8 pt-2 -ml-14 text-gray-500" /> 
                    </Link> 
                    <Tabs defaultValue="login" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-6"> 
                        <TabsTrigger value="/login" asChild className="hover:bg-orange-600 hover:text-gray-100"> 
                          <Link href="/login"> Log In </Link> 
                        </TabsTrigger> 
                        <TabsTrigger value="/register" asChild className="hover:bg-orange-600 hover:text-gray-100"> 
                          <Link href="/register"> Register </Link> 
                        </TabsTrigger> 
                      </TabsList> 
                      
                      {/* Form */} 
                      <div className="flex"> 
                        <h1 className="text-2xl font-bold text-orange-600">Welcome Back!</h1> 
                      </div> 
                      <p className="text-gray-600">Log In to your YAMAARAW account</p> 
                      <div className="mt-5"> 
                        
                      <form onSubmit={handleSubmit} className="space-y-6"> 
                        {/* Email Field */} 
                        <div> 
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2" > Email Address </label> 
                          <div className="relative group"> 
                            <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors group-focus-within:text-orange-500" /> 
                            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-12 h-14 rounded-xl border-2 border-gray-200 focus:border-orange-500 bg-white/70 backdrop-blur-sm transition-all duration-200 hover:bg-white/80 focus:bg-white" placeholder="Enter your email" /> 
                          </div> 
                        </div> 
                      
                        {/* Password Field */}
                        <div> 
                          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2" > Password </label> 
                          <div className="relative group"> 
                            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors group-focus-within:text-orange-500" /> 
                              <Input id="password" 
                                type={showPassword ? "text" : "password"} 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                required className="pl-12 pr-14 h-14 rounded-xl border-2 border-gray-200 focus:border-orange-500 bg-white/70 backdrop-blur-sm transition-all duration-200 hover:bg-white/80 focus:bg-white" 
                                placeholder="Enter your password" /> 
                            <button type="button" 
                              onClick={() => setShowPassword(!showPassword)} 
                              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" > 
                              {showPassword ? ( <EyeOff className="w-5 h-5" /> ) : ( <Eye className="w-5 h-5" /> )} 
                            </button> 
                          </div> 
                        </div> 
                      
                        <div className="flex items-center justify-between"> 
                          <div className="flex items-center"> 
                            <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded transition-colors" /> 
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900" > Remember me </label> 
                          </div> 
                        </div> 

                        <Button type="submit"
                          disabled={isLoading} 
                          className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 h-14 rounded-xl shadow-lg text-white font-semibold text-lg transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:transform-none disabled:opacity-70" size="lg" > 
                          {isLoading ? ( <div className="flex items-center space-x-2"> 
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> 
                            <span>Signing in...</span> 
                          </div> ) : ( <div className="flex items-center space-x-2"> 
                            <span>Sign In</span> 
                            <Zap className="w-5 h-5" /> 
                            </div> )} 
                        </Button> 
                      </form> 
                      </div>
                    </Tabs> 
                  </div> 
                </div> 
              </div> 
            </div>
        </main>
  );
}
